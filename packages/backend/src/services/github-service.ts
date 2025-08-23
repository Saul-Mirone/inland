import { Effect, Data, Schedule } from 'effect'

export class GitHubAPIError extends Data.TaggedError('GitHubAPIError')<{
  readonly message: string
  readonly status?: number
}> {}

export class RepositoryCreationError extends Data.TaggedError(
  'RepositoryCreationError'
)<{
  readonly repoName: string
  readonly reason: string
}> {}

export class PagesDeploymentError extends Data.TaggedError(
  'PagesDeploymentError'
)<{
  readonly repoName: string
  readonly reason: string
}> {}

export interface CreateRepoData {
  readonly name: string
  readonly description?: string
  readonly templateOwner?: string
  readonly templateRepo?: string
}

export interface TemplateData {
  readonly siteName: string
  readonly siteDescription: string
  readonly siteNameSlug: string
  readonly siteAuthor: string
  readonly githubUsername: string
}

export interface GitHubRepo {
  readonly id: number
  readonly name: string
  readonly fullName: string
  readonly htmlUrl: string
  readonly cloneUrl: string
  readonly pagesUrl?: string
  readonly defaultBranch: string
}

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

export const makeGitHubRequest = (
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
      return yield* Effect.fail(
        new GitHubAPIError({
          message: `GitHub API error: ${errorText}`,
          status: response.status,
        })
      )
    }

    return yield* Effect.promise(() => response.json())
  })

export const createRepositoryWithPages = (
  accessToken: string,
  data: CreateRepoData,
  templateData?: TemplateData
) =>
  Effect.gen(function* () {
    try {
      // Step 1: Create repository from template (always use template)
      const repoData = (yield* makeGitHubRequest(
        accessToken,
        `/repos/${data.templateOwner}/${data.templateRepo}/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: data.name,
            description: data.description || `Blog site: ${data.name}`,
            private: false,
          }),
        }
      )) as GitHubRepoResponse

      const repoResponse = repoData

      const repo: GitHubRepo = {
        id: repoResponse.id,
        name: repoResponse.name,
        fullName: repoResponse.full_name,
        htmlUrl: repoResponse.html_url,
        cloneUrl: repoResponse.clone_url,
        defaultBranch: repoResponse.default_branch,
      }

      // Step 2: Replace template placeholders (always needed since we always use template)
      if (templateData) {
        yield* replaceTemplatePlaceholders(
          accessToken,
          repo.fullName,
          repo.defaultBranch,
          templateData
        )
      }

      // Step 3: Enable GitHub Pages with GitHub Actions as source
      const pagesUrl = yield* enableGitHubPages(
        accessToken,
        repo.fullName,
        repo.defaultBranch
      )

      return {
        ...repo,
        pagesUrl,
      }
    } catch (error) {
      return yield* new RepositoryCreationError({
        repoName: data.name,
        reason: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  })

const enableGitHubPages = (
  accessToken: string,
  repoFullName: string,
  defaultBranch: string
) =>
  Effect.gen(function* () {
    yield* Effect.logInfo(
      `Enabling GitHub Pages for repository: ${repoFullName} with branch: ${defaultBranch}`
    )

    try {
      // First check if workflow file exists
      try {
        const workflowCheck = yield* makeGitHubRequest(
          accessToken,
          `/repos/${repoFullName}/contents/.github/workflows/deploy.yml`
        )
        yield* Effect.logInfo(`Workflow file found in ${repoFullName}`, {
          workflowCheck,
        })
      } catch (workflowError) {
        yield* Effect.logError(`Workflow file not found in ${repoFullName}`, {
          workflowError,
        })
      }

      // Try to enable Pages with workflow build type
      const response = yield* makeGitHubRequest(
        accessToken,
        `/repos/${repoFullName}/pages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            build_type: 'workflow',
          }),
        }
      )

      yield* Effect.logInfo(
        `GitHub Pages enabled with workflow build type for ${repoFullName}`,
        { response }
      )

      // Generate the GitHub Pages URL
      const [owner, repo] = repoFullName.split('/')
      const pagesUrl = `https://${owner}.github.io/${repo}`

      return pagesUrl
    } catch (error) {
      yield* Effect.logError(
        `Failed to enable GitHub Pages for ${repoFullName}`,
        { error }
      )

      // If it's a GitHubAPIError, extract more details
      if (error instanceof GitHubAPIError) {
        yield* Effect.logError(
          `GitHub API Error - Status: ${error.status}, Message: ${error.message}`
        )
        return yield* new PagesDeploymentError({
          repoName: repoFullName,
          reason: `GitHub API Error (${error.status}): ${error.message}`,
        })
      }

      return yield* new PagesDeploymentError({
        repoName: repoFullName,
        reason: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  })

export const publishArticleToRepo = (
  accessToken: string,
  repoFullName: string,
  article: {
    title: string
    slug: string
    content: string
    status: 'draft' | 'published'
    createdAt: Date
  }
) =>
  Effect.gen(function* () {
    // Only publish if status is 'published'
    if (article.status !== 'published') {
      return { skipped: true, reason: 'Article is not published' }
    }

    const articleContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${article.title}</title>
    <link rel="stylesheet" href="../styles.css">
</head>
<body>
    <header>
        <h1>My Blog</h1>
        <nav>
            <a href="../index.html" class="back-link">← Back to Home</a>
        </nav>
    </header>

    <main>
        <article class="article-page">
            <div class="article-header">
                <h1 class="article-title">${article.title}</h1>
                <div class="article-meta">
                    Published on ${article.createdAt.toLocaleDateString(
                      'en-US',
                      {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      }
                    )}
                </div>
            </div>
            <div class="article-content">
                ${article.content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}
            </div>
        </article>
    </main>

    <footer>
        <p>Powered by <a href="https://github.com/your-org/inland" target="_blank">Inland CMS</a></p>
    </footer>
</body>
</html>`

    const filePath = `articles/${article.slug}.html`

    yield* makeGitHubRequest(
      accessToken,
      `/repos/${repoFullName}/contents/${filePath}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Publish article: ${article.title}`,
          content: Buffer.from(articleContent).toString('base64'),
        }),
      }
    )

    // Generate article URL
    const [owner, repo] = repoFullName.split('/')
    const articleUrl = `https://${owner}.github.io/${repo}/${filePath}`

    return {
      published: true,
      filePath,
      url: articleUrl,
    }
  })

export const deleteArticleFromRepo = (
  accessToken: string,
  repoFullName: string,
  articleSlug: string
) =>
  Effect.gen(function* () {
    const filePath = `content/${articleSlug}.md`

    // Get the current file to get its SHA
    const currentFileResult = yield* makeGitHubRequest(
      accessToken,
      `/repos/${repoFullName}/contents/${filePath}`
    ).pipe(
      Effect.catchTag('GitHubAPIError', (error) => {
        // File doesn't exist (404), which means it's already "deleted"
        if (error.status === 404) {
          return Effect.succeed(null)
        }
        // Re-throw other GitHub API errors
        return Effect.fail(error)
      })
    )

    if (!currentFileResult) {
      return { deleted: false, reason: 'File not found' }
    }

    const currentFile = currentFileResult as GitHubFileResponse

    yield* makeGitHubRequest(
      accessToken,
      `/repos/${repoFullName}/contents/${filePath}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Delete article: ${articleSlug}`,
          sha: currentFile.sha,
        }),
      }
    )

    return { deleted: true, filePath }
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
    yield* Effect.logInfo(`Creating with template data:`, { templateData })

    // Get all files in the repository, with retry for empty repos
    yield* Effect.logInfo(`Waiting for repository files to be available...`)
    yield* Effect.sleep(1000) // Initial wait to allow repo to be ready

    const files = yield* getRepoFiles(
      accessToken,
      repoFullName,
      defaultBranch
    ).pipe(
      Effect.retry(
        Schedule.exponential(1000).pipe(
          Schedule.intersect(Schedule.recurs(9)), // 10 total attempts
          Schedule.whileInput((error: unknown) => {
            if (error instanceof GitHubAPIError) {
              const isEmptyRepo =
                error.status === 409 ||
                error.status === 422 ||
                error.message.includes('Git Repository is empty')
              if (isEmptyRepo) {
                Effect.logInfo(`Repository not ready, retrying...`).pipe(
                  Effect.runSync
                )
                return true
              }
            }
            return false
          })
        )
      )
    )
    yield* Effect.logInfo(`Found ${files.length} files to process`)

    // Define placeholder mappings
    const placeholders = {
      '{{SITE_NAME}}': templateData.siteName,
      '{{SITE_DESCRIPTION}}': templateData.siteDescription,
      '{{SITE_NAME_SLUG}}': templateData.siteNameSlug,
      '{{SITE_AUTHOR}}': templateData.siteAuthor,
      '{{GITHUB_USERNAME}}': templateData.githubUsername,
    }

    // Process each file that might contain placeholders
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

const getRepoFiles = (
  accessToken: string,
  repoFullName: string,
  defaultBranch: string
) =>
  Effect.gen(function* () {
    const response = yield* makeGitHubRequest(
      accessToken,
      `/repos/${repoFullName}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`
    )

    const tree = response as GitHubTreeResponse
    return tree.tree.filter((item) => item.type === 'blob')
  })

const shouldProcessFile = (filePath: string): boolean => {
  // Process text files that might contain placeholders
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

const processFileWithPlaceholders = (
  accessToken: string,
  repoFullName: string,
  file: { path: string; sha: string },
  placeholders: Record<string, string>
) =>
  Effect.gen(function* () {
    // Get file content
    const fileResponse = yield* makeGitHubRequest(
      accessToken,
      `/repos/${repoFullName}/contents/${file.path}`
    )

    const fileData = fileResponse as GitHubFileContentResponse
    const content = Buffer.from(fileData.content, 'base64').toString('utf-8')

    // Replace placeholders
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

    // Update file if there were changes
    if (hasChanges) {
      yield* makeGitHubRequest(
        accessToken,
        `/repos/${repoFullName}/contents/${file.path}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Replace template placeholders in ${file.path}`,
            content: Buffer.from(updatedContent).toString('base64'),
            sha: fileData.sha,
          }),
        }
      )
    }

    return hasChanges
  })

export const getMarkdownFilesFromRepo = (
  accessToken: string,
  repoFullName: string,
  defaultBranch: string
) =>
  Effect.gen(function* () {
    yield* Effect.logInfo(`Fetching markdown files from ${repoFullName}`)

    // Get all files in the content directory
    const files = yield* getRepoFiles(accessToken, repoFullName, defaultBranch)

    // Filter for markdown files in content directory
    const markdownFiles = files.filter(
      (file) => file.path.startsWith('content/') && file.path.endsWith('.md')
    )

    yield* Effect.logInfo(`Found ${markdownFiles.length} markdown files`)

    // Fetch content for each markdown file
    const articles = []
    for (const file of markdownFiles) {
      try {
        const fileResponse = yield* makeGitHubRequest(
          accessToken,
          `/repos/${repoFullName}/contents/${file.path}`
        )

        const fileData = fileResponse as GitHubFileContentResponse
        const content = Buffer.from(fileData.content, 'base64').toString(
          'utf-8'
        )

        // Parse front matter and content
        const article = parseMarkdownContent(content, file.path)
        if (article) {
          articles.push(article)
        }
      } catch (error) {
        yield* Effect.logError(`Failed to fetch ${file.path}:`, { error })
      }
    }

    return articles
  })

const parseMarkdownContent = (content: string, filePath: string) => {
  try {
    // Extract filename without extension for slug
    const slug = filePath.replace('content/', '').replace('.md', '')

    // Parse front matter
    const frontMatterMatch = content.match(
      /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/
    )

    if (!frontMatterMatch) {
      // No front matter, use content as-is
      return {
        title: slug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        slug,
        content: content.trim(),
        status: 'published' as const,
      }
    }

    const [, frontMatterText, markdownContent] = frontMatterMatch
    const frontMatter: Record<string, string> = {}

    // Simple front matter parser
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
