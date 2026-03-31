import { Effect, Schedule } from 'effect';

import type {
  GitProviderRepositoryService,
  GitRepo,
  CreateRepoData,
  TemplateData,
  SiteConfig,
  ImportedArticle,
  ImportedMedia,
} from '../git-provider-repository';

import {
  GitProviderError,
  RepositoryCreationError,
  PagesDeploymentError,
} from '../git-provider-repository';
import {
  githubFetch,
  assertFields as sharedAssertFields,
  buildTemplatePlaceholders,
  replacePlaceholders,
  type GitHubRepoResponse,
  type GitHubTreeResponse,
  type GitHubFileContentResponse,
} from './github-utils';

const REPO_READY_DELAY_MS = 1000;
const MAX_RETRY_ATTEMPTS = 9;

const makeError = (message: string, status?: number) =>
  new GitProviderError({ message, status });

const makeGitHubApiRequest = <T>(
  accessToken: string,
  endpoint: string,
  options: RequestInit = {}
) =>
  githubFetch<GitProviderError, T>(accessToken, endpoint, makeError, options);

const assertFields = <T extends Record<string, unknown>>(
  response: unknown,
  fields: readonly string[],
  context: string
) =>
  sharedAssertFields<GitProviderError, T>(response, fields, context, makeError);

// Utility functions (pure, module-level)
const articleFilePath = (slug: string): string => `content/${slug}.md`;

const shouldProcessFile = (filePath: string): boolean => {
  const textExtensions = [
    '.html',
    '.css',
    '.js',
    '.json',
    '.md',
    '.yml',
    '.yaml',
    '.txt',
  ];
  return textExtensions.some((ext) => filePath.endsWith(ext));
};

const parseFrontMatterTags = (
  frontMatter: Record<string, string>,
  raw: string
): string | undefined => {
  const tagsValue = frontMatter.tags;
  if (!tagsValue) return undefined;

  // Handle inline array: [tag1, tag2, tag3]
  const inlineMatch = tagsValue.match(/^\[(.+)\]$/);
  if (inlineMatch) {
    return inlineMatch[1]
      .split(',')
      .map((t) => t.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean)
      .join(', ');
  }

  // Handle YAML list format (- tag1\n- tag2)
  const tagsMatch = raw.match(/^tags:\s*\n((?:\s+-\s+.+\n?)+)/m);
  if (tagsMatch) {
    return tagsMatch[1]
      .split('\n')
      .map((line) => line.replace(/^\s*-\s+/, '').trim())
      .filter(Boolean)
      .join(', ');
  }

  // Simple string value
  return tagsValue || undefined;
};

const parseMarkdownContent = (
  content: string,
  filePath: string
): ImportedArticle | null => {
  try {
    const slug = filePath.replace('content/', '').replace('.md', '');
    const frontMatterMatch = content.match(
      /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/
    );

    if (!frontMatterMatch) {
      return {
        title: slug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        slug,
        content: content.trim(),
        status: 'published' as const,
      };
    }

    const [, frontMatterText, markdownContent] = frontMatterMatch;
    const frontMatter: Record<string, string> = {};

    frontMatterText.split('\n').forEach((line) => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        frontMatter[key] = value;
      }
    });

    const excerpt = frontMatter.excerpt || frontMatter.description || undefined;
    const tags = parseFrontMatterTags(frontMatter, frontMatterText);

    return {
      title:
        frontMatter.title ??
        slug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      slug: frontMatter.slug ?? slug,
      content: markdownContent.trim(),
      excerpt,
      tags,
      status: frontMatter.status === 'draft' ? 'draft' : 'published',
      date: frontMatter.date || undefined,
    };
  } catch {
    return null;
  }
};

// Atomic GitHub operations
const createRepoFromTemplate = (
  accessToken: string,
  opts: {
    templateOwner: string;
    templateRepo: string;
    repoName: string;
    description: string;
  }
) =>
  Effect.gen(function* () {
    const response = yield* makeGitHubApiRequest<GitHubRepoResponse>(
      accessToken,
      `/repos/${opts.templateOwner}/${opts.templateRepo}/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: opts.repoName,
          description: opts.description,
          private: false,
        }),
      }
    );
    yield* assertFields(
      response,
      ['id', 'name', 'full_name', 'html_url', 'clone_url', 'default_branch'],
      'POST /repos/.../generate'
    );
    return response;
  });

const getRepoFiles = (
  accessToken: string,
  repoFullName: string,
  defaultBranch: string
) =>
  Effect.gen(function* () {
    const response = yield* makeGitHubApiRequest<GitHubTreeResponse>(
      accessToken,
      `/repos/${repoFullName}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`
    );
    yield* assertFields(response, ['tree'], 'GET /repos/.../git/trees/...');
    return response.tree.filter((item) => item.type === 'blob');
  });

const getFileContent = (
  accessToken: string,
  repoFullName: string,
  filePath: string
) =>
  Effect.gen(function* () {
    const response = yield* makeGitHubApiRequest<GitHubFileContentResponse>(
      accessToken,
      `/repos/${repoFullName}/contents/${filePath}`
    );
    yield* assertFields(
      response,
      ['content', 'sha'],
      `GET /repos/.../contents/${filePath}`
    );
    return response;
  });

const updateFileContent = (
  accessToken: string,
  repoFullName: string,
  opts: {
    filePath: string;
    content: string;
    message: string;
    sha?: string;
  }
) =>
  makeGitHubApiRequest(
    accessToken,
    `/repos/${repoFullName}/contents/${opts.filePath}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: opts.message,
        content: Buffer.from(opts.content).toString('base64'),
        ...(opts.sha !== undefined && { sha: opts.sha }),
      }),
    }
  );

const deleteFile = (
  accessToken: string,
  repoFullName: string,
  opts: {
    filePath: string;
    sha: string;
    message: string;
  }
) =>
  makeGitHubApiRequest(
    accessToken,
    `/repos/${repoFullName}/contents/${opts.filePath}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: opts.message, sha: opts.sha }),
    }
  );

const enableGitHubPages = (accessToken: string, repoFullName: string) =>
  Effect.gen(function* () {
    yield* makeGitHubApiRequest(accessToken, `/repos/${repoFullName}/pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ build_type: 'workflow' }),
    });

    const [owner, repoName] = repoFullName.split('/');
    return `https://${owner}.github.io/${repoName}`;
  });

const getFileOrNull = (
  accessToken: string,
  repoFullName: string,
  filePath: string
) =>
  getFileContent(accessToken, repoFullName, filePath).pipe(
    Effect.catchAll((error) => {
      if (error.status === 404) {
        return Effect.succeed(null);
      }
      return Effect.fail(error);
    })
  );

// Composite operations
const processFileWithPlaceholders = (
  accessToken: string,
  repoFullName: string,
  file: { path: string; sha: string },
  placeholders: Record<string, string>
) =>
  Effect.gen(function* () {
    const fileData = yield* getFileContent(
      accessToken,
      repoFullName,
      file.path
    );
    const content = Buffer.from(fileData.content, 'base64').toString('utf-8');

    const updatedContent = replacePlaceholders(content, placeholders);
    const hasChanges = updatedContent !== content;

    if (hasChanges) {
      yield* updateFileContent(accessToken, repoFullName, {
        filePath: file.path,
        content: updatedContent,
        message: `Replace template placeholders in ${file.path}`,
        sha: fileData.sha,
      });
    }

    return hasChanges;
  });

const replaceTemplatePlaceholders = (
  accessToken: string,
  repoFullName: string,
  defaultBranch: string,
  templateData: TemplateData
) =>
  Effect.gen(function* () {
    yield* Effect.logInfo(
      `Starting template placeholder replacement for ${repoFullName} on branch ${defaultBranch}`
    );

    yield* Effect.sleep(REPO_READY_DELAY_MS);

    const files = yield* getRepoFiles(
      accessToken,
      repoFullName,
      defaultBranch
    ).pipe(
      Effect.retry(
        Schedule.exponential(REPO_READY_DELAY_MS).pipe(
          Schedule.intersect(Schedule.recurs(MAX_RETRY_ATTEMPTS)),
          Schedule.whileInput((error: GitProviderError) => {
            return (
              error.status === 409 ||
              error.status === 422 ||
              error.message?.includes('Git Repository is empty')
            );
          })
        )
      )
    );

    const placeholders = buildTemplatePlaceholders(templateData);

    for (const file of files) {
      if (shouldProcessFile(file.path)) {
        yield* processFileWithPlaceholders(
          accessToken,
          repoFullName,
          file,
          placeholders
        );
      }
    }

    return true;
  });

// GitHub implementation factory
export const makeGitHubApiRepository = (config?: {
  templateRepo?: string;
}): GitProviderRepositoryService => ({
  createRepositoryWithPages: (
    accessToken: string,
    data: CreateRepoData,
    templateData?: TemplateData
  ) =>
    Effect.gen(function* () {
      if (!data.templateOwner || !data.templateRepo) {
        return yield* new GitProviderError({
          message:
            'templateOwner and templateRepo are required to create a repository',
        });
      }

      const repoData = yield* createRepoFromTemplate(accessToken, {
        templateOwner: data.templateOwner,
        templateRepo: data.templateRepo,
        repoName: data.name,
        description: data.description ?? `Blog site: ${data.name}`,
      });

      const gitRepo: GitRepo = {
        id: repoData.id,
        name: repoData.name,
        fullName: repoData.full_name,
        htmlUrl: repoData.html_url,
        cloneUrl: repoData.clone_url,
        defaultBranch: repoData.default_branch,
      };

      if (templateData) {
        yield* replaceTemplatePlaceholders(
          accessToken,
          gitRepo.fullName,
          gitRepo.defaultBranch,
          templateData
        );
      }

      const pagesUrl = yield* enableGitHubPages(
        accessToken,
        gitRepo.fullName
      ).pipe(
        Effect.catchAll((error: GitProviderError) =>
          Effect.gen(function* () {
            yield* Effect.logError(
              `Failed to enable GitHub Pages for ${gitRepo.fullName}`,
              { error }
            );
            return yield* new PagesDeploymentError({
              repoName: gitRepo.fullName,
              reason: error.message,
            });
          })
        )
      );

      return { ...gitRepo, pagesUrl };
    }).pipe(
      Effect.catchAll(
        (error) =>
          new RepositoryCreationError({
            repoName: data.name,
            reason: error.message,
          })
      )
    ),

  deleteArticleFromRepo: (
    accessToken: string,
    repoFullName: string,
    articleSlug: string
  ) =>
    Effect.gen(function* () {
      const filePath = articleFilePath(articleSlug);

      const currentFile = yield* getFileOrNull(
        accessToken,
        repoFullName,
        filePath
      );

      if (!currentFile) {
        return { deleted: false, reason: 'File not found' };
      }

      yield* deleteFile(accessToken, repoFullName, {
        filePath,
        sha: currentFile.sha,
        message: `Delete article: ${articleSlug}`,
      });

      return { deleted: true, filePath };
    }),

  getArticleFileSha: (
    accessToken: string,
    repoFullName: string,
    articleSlug: string
  ) =>
    Effect.gen(function* () {
      const filePath = articleFilePath(articleSlug);
      const file = yield* getFileOrNull(accessToken, repoFullName, filePath);
      return file ? file.sha : null;
    }),

  getMarkdownFilesFromRepo: (
    accessToken: string,
    repoFullName: string,
    defaultBranch: string
  ) =>
    Effect.gen(function* () {
      yield* Effect.logInfo(`Fetching markdown files from ${repoFullName}`);

      const files = yield* getRepoFiles(
        accessToken,
        repoFullName,
        defaultBranch
      );
      const markdownFiles = files.filter(
        (file) => file.path.startsWith('content/') && file.path.endsWith('.md')
      );

      const articles: ImportedArticle[] = [];

      for (const file of markdownFiles) {
        yield* Effect.gen(function* () {
          const fileData = yield* getFileContent(
            accessToken,
            repoFullName,
            file.path
          );
          const content = Buffer.from(fileData.content, 'base64').toString(
            'utf-8'
          );

          const article = parseMarkdownContent(content, file.path);
          if (article) {
            articles.push({ ...article, gitSha: file.sha });
          }
        }).pipe(
          Effect.catchAll((error) =>
            Effect.logError(`Failed to fetch ${file.path}:`, {
              error,
            })
          )
        );
      }

      return articles;
    }),

  getMediaFilesFromRepo: (
    accessToken: string,
    repoFullName: string,
    defaultBranch: string
  ) =>
    Effect.gen(function* () {
      const files = yield* getRepoFiles(
        accessToken,
        repoFullName,
        defaultBranch
      );

      const imageExtensions = [
        '.jpg',
        '.jpeg',
        '.png',
        '.gif',
        '.webp',
        '.svg',
        '.avif',
      ];

      return files
        .filter(
          (file) =>
            file.path.startsWith('assets/images/') &&
            imageExtensions.some((ext) => file.path.toLowerCase().endsWith(ext))
        )
        .map(
          (file): ImportedMedia => ({
            filePath: file.path,
            filename: file.path.split('/').pop()!,
            sha: file.sha,
            size: file.size ?? 0,
          })
        );
    }),

  publishArticleToRepo: (
    accessToken: string,
    repoFullName: string,
    articleSlug: string,
    markdownContent: string
  ) =>
    Effect.gen(function* () {
      const filePath = articleFilePath(articleSlug);

      const existingFile = yield* getFileOrNull(
        accessToken,
        repoFullName,
        filePath
      );

      const sha = existingFile ? existingFile.sha : undefined;
      const message = `${sha ? 'Update' : 'Add'} article: ${articleSlug}`;

      const response = yield* updateFileContent(accessToken, repoFullName, {
        filePath,
        content: markdownContent,
        message,
        sha,
      });
      const validated = yield* assertFields<{
        commit: unknown;
        content: unknown;
      }>(
        response,
        ['commit', 'content'],
        `PUT /repos/.../contents/${filePath}`
      );
      const commit = yield* assertFields<{ sha: string }>(
        validated.commit,
        ['sha'],
        `PUT /repos/.../contents/${filePath} → commit`
      );
      const contentInfo = yield* assertFields<{ sha: string }>(
        validated.content,
        ['sha'],
        `PUT /repos/.../contents/${filePath} → content`
      );

      return {
        published: true,
        filePath,
        commitSha: commit.sha,
        blobSha: contentInfo.sha,
        wasUpdate: sha !== undefined,
      };
    }),

  getRepositoryInfo: (accessToken: string, repoFullName: string) =>
    Effect.gen(function* () {
      const repoInfo = yield* makeGitHubApiRequest(
        accessToken,
        `/repos/${repoFullName}`
      );
      const validated = yield* assertFields<{ default_branch?: string }>(
        repoInfo,
        ['default_branch'],
        `GET /repos/${repoFullName}`
      );

      return {
        defaultBranch: validated.default_branch || 'main',
        ...validated,
      };
    }),

  checkPagesStatus: (accessToken: string, repoFullName: string) =>
    Effect.gen(function* () {
      yield* Effect.logInfo(`Checking Pages status for ${repoFullName}`);

      const pagesInfo = yield* makeGitHubApiRequest<{
        html_url: string;
        build_type?: string;
        source: {
          branch?: string;
        };
      }>(accessToken, `/repos/${repoFullName}/pages`).pipe(
        Effect.catchTag('GitProviderError', (error) => {
          if (error.status === 404) {
            return Effect.succeed(null);
          }
          return Effect.fail(error);
        })
      );

      if (!pagesInfo) {
        return { enabled: false };
      }

      return {
        enabled: true,
        url: pagesInfo.html_url,
        source: pagesInfo.build_type || pagesInfo.source?.branch,
      };
    }),

  injectInlandWorkflow: (
    accessToken: string,
    repoFullName: string,
    templateData: TemplateData,
    options?: { overrideExistingFiles?: boolean }
  ) =>
    Effect.gen(function* () {
      yield* Effect.logInfo(`Injecting Inland workflow into ${repoFullName}`);

      const overrideExisting = options?.overrideExistingFiles ?? false;
      const templateRepo =
        config?.templateRepo ?? 'Saul-Mirone/inland-template-basic';
      const filesCreated: string[] = [];
      const filesSkipped: string[] = [];

      const filesToInject = [
        'inland.config.json',
        '.github/workflows/deploy.yml',
        'build/index.js',
        'build/milkdown-compiler.js',
        'build/template-engine.js',
        'build/utils.js',
        'templates/index.html',
        'templates/article.html',
        'templates/layout.html',
        'assets/styles.css',
        'assets/script.js',
      ] as const;

      const placeholders = buildTemplatePlaceholders(templateData);

      for (const filePath of filesToInject) {
        const injectFileEffect = Effect.gen(function* () {
          const existingFile = yield* getFileOrNull(
            accessToken,
            repoFullName,
            filePath
          );

          if (existingFile && !overrideExisting) {
            yield* Effect.logInfo(`Skipping existing file: ${filePath}`);
            filesSkipped.push(filePath);
            return { skipped: true };
          }

          const templateFile = yield* getFileContent(
            accessToken,
            templateRepo,
            filePath
          );

          const content = replacePlaceholders(
            Buffer.from(templateFile.content, 'base64').toString('utf-8'),
            placeholders
          );

          const sha = existingFile ? existingFile.sha : undefined;

          yield* updateFileContent(accessToken, repoFullName, {
            filePath,
            content,
            message: `Add Inland CMS workflow: ${filePath}`,
            sha,
          });

          filesCreated.push(filePath);
          yield* Effect.logInfo(`Injected file: ${filePath}`);
          return { skipped: false };
        });

        yield* injectFileEffect.pipe(
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              yield* Effect.logError(`Failed to inject ${filePath}:`, {
                error,
              });
              return { skipped: false, failed: true };
            })
          )
        );
      }

      return {
        filesCreated,
        filesSkipped,
        workflowUrl: `https://github.com/${repoFullName}/actions`,
      };
    }),

  enablePages: (accessToken: string, repoFullName: string) =>
    enableGitHubPages(accessToken, repoFullName),

  uploadFileToRepo: (
    accessToken: string,
    repoFullName: string,
    opts: {
      filePath: string;
      base64Content: string;
      commitMessage: string;
    }
  ) =>
    Effect.gen(function* () {
      const existingFile = yield* getFileOrNull(
        accessToken,
        repoFullName,
        opts.filePath
      );
      const sha = existingFile ? existingFile.sha : undefined;

      const response = yield* makeGitHubApiRequest(
        accessToken,
        `/repos/${repoFullName}/contents/${opts.filePath}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: opts.commitMessage,
            content: opts.base64Content,
            ...(sha !== undefined && { sha }),
          }),
        }
      );

      const validated = yield* assertFields<{
        commit: unknown;
        content: unknown;
      }>(
        response,
        ['commit', 'content'],
        `PUT /repos/.../contents/${opts.filePath}`
      );
      const commit = yield* assertFields<{ sha: string }>(
        validated.commit,
        ['sha'],
        `PUT /repos/.../contents/${opts.filePath} → commit`
      );
      const contentInfo = yield* assertFields<{ sha: string }>(
        validated.content,
        ['sha'],
        `PUT /repos/.../contents/${opts.filePath} → content`
      );

      return {
        filePath: opts.filePath,
        blobSha: contentInfo.sha,
        commitSha: commit.sha,
      };
    }),

  deleteFileFromRepo: (
    accessToken: string,
    repoFullName: string,
    opts: { filePath: string; commitMessage: string }
  ) =>
    Effect.gen(function* () {
      const currentFile = yield* getFileOrNull(
        accessToken,
        repoFullName,
        opts.filePath
      );

      if (!currentFile) {
        return { deleted: false, reason: 'File not found' };
      }

      yield* deleteFile(accessToken, repoFullName, {
        filePath: opts.filePath,
        sha: currentFile.sha,
        message: opts.commitMessage,
      });

      return { deleted: true };
    }),

  checkRepoExists: (accessToken: string, repoFullName: string) =>
    makeGitHubApiRequest(accessToken, `/repos/${repoFullName}`).pipe(
      Effect.map(() => true),
      Effect.catchAll((error) => {
        if (error.status === 404) {
          return Effect.succeed(false);
        }
        return Effect.fail(error);
      })
    ),

  pushSiteConfig: (
    accessToken: string,
    repoFullName: string,
    siteConfig: SiteConfig
  ) =>
    Effect.gen(function* () {
      const filePath = 'inland.config.json';
      const content = JSON.stringify(siteConfig, null, 2) + '\n';

      const existingFile = yield* getFileOrNull(
        accessToken,
        repoFullName,
        filePath
      );
      const sha = existingFile ? existingFile.sha : undefined;

      const response = yield* updateFileContent(accessToken, repoFullName, {
        filePath,
        content,
        message: 'Update site configuration',
        sha,
      });

      const validated = yield* assertFields<{
        commit: unknown;
      }>(response, ['commit'], `PUT /repos/.../contents/${filePath}`);
      const commit = yield* assertFields<{ sha: string }>(
        validated.commit,
        ['sha'],
        `PUT /repos/.../contents/${filePath} → commit`
      );

      return { filePath, commitSha: commit.sha };
    }),

  getSiteConfig: (accessToken: string, repoFullName: string) =>
    Effect.gen(function* () {
      const file = yield* getFileOrNull(
        accessToken,
        repoFullName,
        'inland.config.json'
      );
      if (!file) return null;

      const decoded = Buffer.from(file.content, 'base64').toString('utf-8');
      const parsed = yield* assertFields<{
        name: string;
        description: string;
        url: string;
        author: string;
        avatarUrl: string;
        authorUrl: string;
      }>(JSON.parse(decoded), ['name'], 'inland.config.json');
      return {
        name: parsed.name,
        description: parsed.description,
        url: parsed.url,
        author: parsed.author,
        avatarUrl: parsed.avatarUrl,
        authorUrl: parsed.authorUrl,
      } satisfies SiteConfig;
    }).pipe(Effect.catchAll(() => Effect.succeed(null))),
});
