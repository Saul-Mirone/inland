import { Effect, Layer } from 'effect';

import {
  GitProviderRepository,
  type GitProviderRepositoryService,
  type GitRepo,
  type CreateRepoData,
  type TemplateData,
  type ImportedArticle,
  type ImportedMedia,
} from '../../repositories/git-provider-repository';

// Mock implementation for testing
export const makeMockGitProvider = (): GitProviderRepositoryService => ({
  createRepositoryWithPages: (
    _accessToken: string,
    data: CreateRepoData,
    _templateData?: TemplateData
  ) =>
    Effect.succeed({
      id: 12345,
      name: data.name,
      fullName: `testuser/${data.name}`,
      htmlUrl: `https://github.com/testuser/${data.name}`,
      cloneUrl: `https://github.com/testuser/${data.name}.git`,
      defaultBranch: 'main',
      pagesUrl: `https://testuser.github.io/${data.name}`,
    } as GitRepo),

  deleteArticleFromRepo: (
    _accessToken: string,
    _repoFullName: string,
    articleSlug: string
  ) =>
    Effect.succeed({
      deleted: true,
      filePath: `content/${articleSlug}.md`,
    }),

  getArticleFileSha: (
    _accessToken: string,
    _repoFullName: string,
    _articleSlug: string
  ) => Effect.succeed('abc123blobsha' as string | null),

  getMarkdownFilesFromRepo: (
    _accessToken: string,
    _repoFullName: string,
    _defaultBranch: string
  ) =>
    Effect.succeed([
      {
        title: 'Test Article',
        slug: 'test-article',
        content: 'This is a test article content.',
        status: 'published' as const,
        gitSha: 'abc123blobsha',
      },
    ] as ImportedArticle[]),

  publishArticleToRepo: (
    _accessToken: string,
    _repoFullName: string,
    articleSlug: string,
    _markdownContent: string
  ) =>
    Effect.succeed({
      published: true,
      filePath: `content/${articleSlug}.md`,
      commitSha: 'abc123def456',
      blobSha: 'newblobsha789',
      wasUpdate: false,
    }),

  getRepositoryInfo: (_accessToken: string, repoFullName: string) =>
    Effect.succeed({
      defaultBranch: 'main',
      id: 12345,
      name: repoFullName.split('/')[1],
      full_name: repoFullName,
      htmlUrl: `https://github.com/${repoFullName}`,
      html_url: `https://github.com/${repoFullName}`, // GitHub API format
    }),

  checkPagesStatus: (_accessToken: string, _repoFullName: string) =>
    Effect.succeed({
      enabled: true,
      url: 'https://testuser.github.io/test-repo',
      source: 'workflow',
    }),

  injectInlandWorkflow: (
    _accessToken: string,
    _repoFullName: string,
    _templateData: TemplateData,
    _options?: { overrideExistingFiles?: boolean }
  ) =>
    Effect.succeed({
      filesCreated: [
        '.github/workflows/deploy.yml',
        'build/index.js',
        'build/milkdown-compiler.js',
        'templates/index.mustache',
        'templates/article.mustache',
        'templates/styles.css',
      ],
      filesSkipped: [],
      workflowUrl: 'https://github.com/testuser/test-repo/actions',
    }),

  enablePages: (_accessToken: string, repoFullName: string) =>
    Effect.succeed(`https://testuser.github.io/${repoFullName.split('/')[1]}`),

  getMediaFilesFromRepo: (
    _accessToken: string,
    _repoFullName: string,
    _defaultBranch: string
  ) => Effect.succeed([] as ImportedMedia[]),

  uploadFileToRepo: (
    _accessToken: string,
    _repoFullName: string,
    opts: { filePath: string; base64Content: string; commitMessage: string }
  ) =>
    Effect.succeed({
      filePath: opts.filePath,
      blobSha: 'mockblobsha123',
      commitSha: 'mockcommitsha456',
    }),

  deleteFileFromRepo: (
    _accessToken: string,
    _repoFullName: string,
    _opts: { filePath: string; commitMessage: string }
  ) => Effect.succeed({ deleted: true }),
});

// Mock layer for testing
export const MockGitProviderLive = Layer.succeed(
  GitProviderRepository,
  makeMockGitProvider()
);
