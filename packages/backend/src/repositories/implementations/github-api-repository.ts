import { Effect, Schedule } from 'effect'

import type {
  GitProviderRepositoryService,
  GitRepo,
  CreateRepoData,
  TemplateData,
  ImportedArticle,
  GitProviderError,
  RepositoryCreationError,
  PagesDeploymentError,
  GitHubUser,
  GitHubEmail,
} from '../git-provider-repository'

// GitHub API response types
interface GitHubRepoResponse {
  readonly id: number
  readonly name: string
  readonly full_name: string
  readonly html_url: string
  readonly clone_url: string
  readonly default_branch: string
}

interface GitHubFileResponse {
  readonly sha: string
  readonly name: string
  readonly path: string
  readonly content: string
}

interface GitHubTreeResponse {
  readonly tree: Array<{
    readonly path: string
    readonly type: string
    readonly sha: string
  }>
}

interface GitHubFileContentResponse {
  readonly content: string
  readonly sha: string
}

// Utility functions (pure, module-level)
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
  ]
  return textExtensions.some((ext) => filePath.endsWith(ext))
}

const parseMarkdownContent = (
  content: string,
  filePath: string
): ImportedArticle | null => {
  try {
    const slug = filePath.replace('content/', '').replace('.md', '')
    const frontMatterMatch = content.match(
      /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/
    )

    if (!frontMatterMatch) {
      return {
        title: slug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        slug,
        content: content.trim(),
        status: 'published' as const,
      }
    }

    const [, frontMatterText, markdownContent] = frontMatterMatch
    const frontMatter: Record<string, string> = {}

    frontMatterText.split('\n').forEach((line) => {
      const colonIndex = line.indexOf(':')
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim()
        const value = line.substring(colonIndex + 1).trim()
        frontMatter[key] = value
      }
    })

    return {
      title:
        frontMatter.title ||
        slug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      slug: frontMatter.slug || slug,
      content: markdownContent.trim(),
      status: (frontMatter.status === 'draft' ? 'draft' : 'published') as
        | 'draft'
        | 'published',
    }
  } catch (error) {
    console.error(`Failed to parse markdown content for ${filePath}:`, error)
    return null
  }
}

// Core GitHub API operations (module-level Effects)
const makeGitHubApiRequest = (
  accessToken: string,
  endpoint: string,
  options: RequestInit = {}
) =>
  Effect.gen(function* () {
    const response = yield* Effect.promise(() =>
      fetch(`https://api.github.com${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Inland-CMS/1.0',
          ...options.headers,
        },
      })
    )

    if (!response.ok) {
      const errorText = yield* Effect.promise(() => response.text())
      return yield* Effect.fail({
        message: `GitHub API error: ${errorText}`,
        status: response.status,
      } as GitProviderError)
    }

    return yield* Effect.promise(() => response.json())
  })

// Atomic GitHub operations
const createRepoFromTemplate = (
  accessToken: string,
  templateOwner: string,
  templateRepo: string,
  repoName: string,
  description: string
) =>
  Effect.gen(function* () {
    const response = yield* makeGitHubApiRequest(
      accessToken,
      `/repos/${templateOwner}/${templateRepo}/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: repoName,
          description,
          private: false,
        }),
      }
    )
    return response as GitHubRepoResponse
  })

const getRepoFiles = (
  accessToken: string,
  repoFullName: string,
  defaultBranch: string
) =>
  Effect.gen(function* () {
    const response = yield* makeGitHubApiRequest(
      accessToken,
      `/repos/${repoFullName}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`
    )
    const tree = response as GitHubTreeResponse
    return tree.tree.filter((item) => item.type === 'blob')
  })

const getFileContent = (
  accessToken: string,
  repoFullName: string,
  filePath: string
) =>
  Effect.gen(function* () {
    const response = yield* makeGitHubApiRequest(
      accessToken,
      `/repos/${repoFullName}/contents/${filePath}`
    )
    return response as GitHubFileContentResponse
  })

const updateFileContent = (
  accessToken: string,
  repoFullName: string,
  filePath: string,
  content: string,
  message: string,
  sha?: string
) =>
  makeGitHubApiRequest(
    accessToken,
    `/repos/${repoFullName}/contents/${filePath}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        content: Buffer.from(content).toString('base64'),
        ...(sha && { sha }),
      }),
    }
  )

const deleteFile = (
  accessToken: string,
  repoFullName: string,
  filePath: string,
  sha: string,
  message: string
) =>
  makeGitHubApiRequest(
    accessToken,
    `/repos/${repoFullName}/contents/${filePath}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sha }),
    }
  )

const enableGitHubPages = (accessToken: string, repoFullName: string) =>
  Effect.gen(function* () {
    yield* makeGitHubApiRequest(accessToken, `/repos/${repoFullName}/pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ build_type: 'workflow' }),
    })

    const [owner, repoName] = repoFullName.split('/')
    return `https://${owner}.github.io/${repoName}`
  })

const getFileOrNull = (
  accessToken: string,
  repoFullName: string,
  filePath: string
) =>
  getFileContent(accessToken, repoFullName, filePath).pipe(
    Effect.catchAll((error) => {
      if ((error as GitProviderError).status === 404) {
        return Effect.succeed(null)
      }
      return Effect.fail(error)
    })
  )

// Composite operations
const processFileWithPlaceholders = (
  accessToken: string,
  repoFullName: string,
  file: { path: string; sha: string },
  placeholders: Record<string, string>
) =>
  Effect.gen(function* () {
    const fileData = yield* getFileContent(accessToken, repoFullName, file.path)
    const content = Buffer.from(fileData.content, 'base64').toString('utf-8')

    let updatedContent = content
    let hasChanges = false

    for (const [placeholder, value] of Object.entries(placeholders)) {
      if (updatedContent.includes(placeholder)) {
        updatedContent = updatedContent.replace(
          new RegExp(placeholder, 'g'),
          value
        )
        hasChanges = true
      }
    }

    if (hasChanges) {
      yield* updateFileContent(
        accessToken,
        repoFullName,
        file.path,
        updatedContent,
        `Replace template placeholders in ${file.path}`,
        fileData.sha
      )
    }

    return hasChanges
  })

const replaceTemplatePlaceholders = (
  accessToken: string,
  repoFullName: string,
  defaultBranch: string,
  templateData: TemplateData
) =>
  Effect.gen(function* () {
    yield* Effect.logInfo(
      `Starting template placeholder replacement for ${repoFullName} on branch ${defaultBranch}`
    )

    yield* Effect.sleep(1000) // Wait for repo to be ready

    const files = yield* getRepoFiles(
      accessToken,
      repoFullName,
      defaultBranch
    ).pipe(
      Effect.retry(
        Schedule.exponential(1000).pipe(
          Schedule.intersect(Schedule.recurs(9)),
          Schedule.whileInput((error: unknown) => {
            const isEmptyRepo =
              (error as GitProviderError).status === 409 ||
              (error as GitProviderError).status === 422 ||
              (error as GitProviderError).message?.includes(
                'Git Repository is empty'
              )
            if (isEmptyRepo) {
              Effect.logInfo(`Repository not ready, retrying...`).pipe(
                Effect.runSync
              )
              return true
            }
            return false
          })
        )
      )
    )

    const placeholders = {
      '{{SITE_NAME}}': templateData.siteName,
      '{{SITE_DESCRIPTION}}': templateData.siteDescription,
      '{{SITE_NAME_SLUG}}': templateData.siteNameSlug,
      '{{SITE_AUTHOR}}': templateData.siteAuthor,
      '{{GITHUB_USERNAME}}': templateData.githubUsername,
    }

    // Process files sequentially to avoid rate limiting
    for (const file of files) {
      if (shouldProcessFile(file.path)) {
        yield* processFileWithPlaceholders(
          accessToken,
          repoFullName,
          file,
          placeholders
        )
      }
    }

    return true
  })

// GitHub implementation factory (minimal, only returns interface)
export const makeGitHubApiRepository = (): GitProviderRepositoryService => ({
  createRepositoryWithPages: (
    accessToken: string,
    data: CreateRepoData,
    templateData?: TemplateData
  ) =>
    Effect.gen(function* () {
      // Step 1: Create repository from template
      const repoData = yield* createRepoFromTemplate(
        accessToken,
        data.templateOwner!,
        data.templateRepo!,
        data.name,
        data.description || `Blog site: ${data.name}`
      )

      const gitRepo: GitRepo = {
        id: repoData.id,
        name: repoData.name,
        fullName: repoData.full_name,
        htmlUrl: repoData.html_url,
        cloneUrl: repoData.clone_url,
        defaultBranch: repoData.default_branch,
      }

      // Step 2: Replace template placeholders if provided
      if (templateData) {
        yield* replaceTemplatePlaceholders(
          accessToken,
          gitRepo.fullName,
          gitRepo.defaultBranch,
          templateData
        )
      }

      // Step 3: Enable GitHub Pages
      const pagesUrl = yield* enableGitHubPages(
        accessToken,
        gitRepo.fullName
      ).pipe(
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Effect.logError(
              `Failed to enable GitHub Pages for ${gitRepo.fullName}`,
              { error }
            )
            return yield* Effect.fail({
              repoName: gitRepo.fullName,
              reason: error instanceof Error ? error.message : 'Unknown error',
            } as PagesDeploymentError)
          })
        )
      )

      return { ...gitRepo, pagesUrl }
    }).pipe(
      Effect.catchAll((error) =>
        Effect.fail({
          repoName: data.name,
          reason: error instanceof Error ? error.message : 'Unknown error',
        } as RepositoryCreationError)
      )
    ),

  deleteArticleFromRepo: (
    accessToken: string,
    repoFullName: string,
    articleSlug: string
  ) =>
    Effect.gen(function* () {
      const filePath = `content/${articleSlug}.md`

      const currentFile = yield* getFileOrNull(
        accessToken,
        repoFullName,
        filePath
      )

      if (!currentFile) {
        return { deleted: false, reason: 'File not found' }
      }

      const fileData = currentFile as GitHubFileResponse
      yield* deleteFile(
        accessToken,
        repoFullName,
        filePath,
        fileData.sha,
        `Delete article: ${articleSlug}`
      )

      return { deleted: true, filePath }
    }),

  getMarkdownFilesFromRepo: (
    accessToken: string,
    repoFullName: string,
    defaultBranch: string
  ) =>
    Effect.gen(function* () {
      yield* Effect.logInfo(`Fetching markdown files from ${repoFullName}`)

      const files = yield* getRepoFiles(
        accessToken,
        repoFullName,
        defaultBranch
      )
      const markdownFiles = files.filter(
        (file) => file.path.startsWith('content/') && file.path.endsWith('.md')
      )

      const articles: ImportedArticle[] = []

      // Process files sequentially to avoid rate limiting
      for (const file of markdownFiles) {
        try {
          const fileData = yield* getFileContent(
            accessToken,
            repoFullName,
            file.path
          )
          const content = Buffer.from(fileData.content, 'base64').toString(
            'utf-8'
          )

          const article = parseMarkdownContent(content, file.path)
          if (article) {
            articles.push(article)
          }
        } catch (error) {
          yield* Effect.logError(`Failed to fetch ${file.path}:`, { error })
        }
      }

      return articles
    }),

  publishArticleToRepo: (
    accessToken: string,
    repoFullName: string,
    articleSlug: string,
    markdownContent: string
  ) =>
    Effect.gen(function* () {
      const filePath = `content/${articleSlug}.md`

      const existingFile = yield* getFileOrNull(
        accessToken,
        repoFullName,
        filePath
      )

      const sha = existingFile
        ? (existingFile as { sha: string }).sha
        : undefined
      const message = `${sha ? 'Update' : 'Add'} article: ${articleSlug}`

      const response = yield* updateFileContent(
        accessToken,
        repoFullName,
        filePath,
        markdownContent,
        message,
        sha
      )

      return {
        published: true,
        filePath,
        commitSha: (response as { commit: { sha: string } }).commit.sha,
        wasUpdate: sha !== undefined,
      }
    }),

  getRepositoryInfo: (accessToken: string, repoFullName: string) =>
    Effect.gen(function* () {
      const repoInfo = yield* makeGitHubApiRequest(
        accessToken,
        `/repos/${repoFullName}`
      )

      return {
        defaultBranch:
          (repoInfo as { default_branch?: string }).default_branch || 'main',
        ...(repoInfo as Record<string, unknown>),
      }
    }),

  fetchGitHubUser: (accessToken: string) =>
    Effect.gen(function* () {
      const user = yield* makeGitHubApiRequest(accessToken, '/user')
      return user as GitHubUser
    }),

  fetchGitHubUserEmail: (accessToken: string) =>
    Effect.gen(function* () {
      const emails = yield* makeGitHubApiRequest(accessToken, '/user/emails')

      if (!Array.isArray(emails)) {
        return null
      }

      const emailArray = emails as GitHubEmail[]
      const primaryEmail = emailArray.find((e) => e.primary)
      return primaryEmail?.email || null
    }).pipe(Effect.catchAll(() => Effect.succeed(null))),

  validateGitHubToken: (accessToken: string) =>
    Effect.gen(function* () {
      try {
        yield* makeGitHubApiRequest(accessToken, '/user')
        return { isValid: true }
      } catch {
        return {
          isValid: false,
          reason: 'GitHub token is invalid or expired',
        }
      }
    }).pipe(
      Effect.catchAll(() =>
        Effect.succeed({
          isValid: false,
          reason: 'GitHub token validation failed',
        })
      )
    ),
})
