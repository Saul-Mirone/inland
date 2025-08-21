import { Effect, Data } from 'effect'

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
}

const makeGitHubRequest = (
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
      return yield* new GitHubAPIError({
        message: `GitHub API error: ${errorText}`,
        status: response.status,
      })
    }

    return yield* Effect.promise(() => response.json())
  })

export const createRepositoryWithPages = (
  accessToken: string,
  data: CreateRepoData
) =>
  Effect.gen(function* () {
    try {
      // Step 1: Create repository
      const repoData = yield* makeGitHubRequest(accessToken, '/user/repos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description || `Blog site: ${data.name}`,
          private: false,
          auto_init: true,
          license_template: 'mit',
        }),
      })

      const repoResponse = repoData as GitHubRepoResponse

      const repo: GitHubRepo = {
        id: repoResponse.id,
        name: repoResponse.name,
        fullName: repoResponse.full_name,
        htmlUrl: repoResponse.html_url,
        cloneUrl: repoResponse.clone_url,
        defaultBranch: repoResponse.default_branch,
      }

      // Step 2: Create initial blog structure
      yield* createInitialBlogStructure(accessToken, repo.fullName)

      // Step 3: Enable GitHub Pages
      const pagesUrl = yield* enableGitHubPages(accessToken, repo.fullName)

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

const createInitialBlogStructure = (
  accessToken: string,
  repoFullName: string
) =>
  Effect.gen(function* () {
    // Create main index.html
    const indexContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Blog</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <h1>My Blog</h1>
        <nav>
            <a href="#home">Home</a>
            <a href="#articles">Articles</a>
        </nav>
    </header>
    
    <main>
        <section id="hero">
            <h2>Welcome to My Blog</h2>
            <p>This blog is powered by Inland CMS. Articles will appear here automatically when you publish them.</p>
        </section>
        
        <section id="articles">
            <h2>Recent Articles</h2>
            <div id="article-list">
                <p>No articles yet. Create your first article in Inland CMS!</p>
            </div>
        </section>
    </main>
    
    <footer>
        <p>Powered by <a href="https://github.com/your-org/inland" target="_blank">Inland CMS</a></p>
    </footer>
</body>
</html>`

    yield* makeGitHubRequest(
      accessToken,
      `/repos/${repoFullName}/contents/index.html`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Initial blog setup by Inland CMS',
          content: Buffer.from(indexContent).toString('base64'),
        }),
      }
    )

    // Create CSS styles
    const cssContent = `/* Modern Blog Styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    line-height: 1.6;
    color: #333;
    background-color: #fafafa;
}

header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 2rem 0;
    text-align: center;
}

header h1 {
    font-size: 2.5rem;
    margin-bottom: 1rem;
}

nav a {
    color: white;
    text-decoration: none;
    margin: 0 1rem;
    padding: 0.5rem 1rem;
    border-radius: 5px;
    transition: background-color 0.3s;
}

nav a:hover {
    background-color: rgba(255, 255, 255, 0.2);
}

main {
    max-width: 800px;
    margin: 2rem auto;
    padding: 0 2rem;
}

#hero {
    text-align: center;
    margin-bottom: 3rem;
    padding: 2rem;
    background: white;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

#hero h2 {
    color: #667eea;
    margin-bottom: 1rem;
}

#articles {
    background: white;
    padding: 2rem;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.article {
    border-bottom: 1px solid #eee;
    padding: 1.5rem 0;
    margin-bottom: 1.5rem;
}

.article:last-child {
    border-bottom: none;
    margin-bottom: 0;
}

.article h3 {
    color: #333;
    margin-bottom: 0.5rem;
}

.article-meta {
    color: #888;
    font-size: 0.9rem;
    margin-bottom: 1rem;
}

.article-excerpt {
    margin-bottom: 1rem;
}

.read-more {
    color: #667eea;
    text-decoration: none;
    font-weight: bold;
}

.read-more:hover {
    text-decoration: underline;
}

footer {
    text-align: center;
    padding: 2rem;
    color: #888;
    border-top: 1px solid #eee;
    margin-top: 3rem;
}

footer a {
    color: #667eea;
    text-decoration: none;
}

footer a:hover {
    text-decoration: underline;
}

/* Article page styles */
.article-page {
    background: white;
    padding: 2rem;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;
}

.article-header {
    border-bottom: 1px solid #eee;
    padding-bottom: 1rem;
    margin-bottom: 2rem;
}

.article-title {
    color: #333;
    margin-bottom: 0.5rem;
}

.article-content {
    line-height: 1.8;
}

.article-content p {
    margin-bottom: 1.5rem;
}

.article-content h1,
.article-content h2,
.article-content h3 {
    margin: 2rem 0 1rem 0;
    color: #333;
}

.article-content blockquote {
    border-left: 4px solid #667eea;
    padding-left: 1rem;
    margin: 1.5rem 0;
    font-style: italic;
    color: #666;
}

.article-content code {
    background-color: #f5f5f5;
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
}

.article-content pre {
    background-color: #f5f5f5;
    padding: 1rem;
    border-radius: 5px;
    overflow-x: auto;
    margin: 1.5rem 0;
}

.back-link {
    display: inline-block;
    color: #667eea;
    text-decoration: none;
    margin-bottom: 1rem;
    padding: 0.5rem 1rem;
    border: 1px solid #667eea;
    border-radius: 5px;
    transition: all 0.3s;
}

.back-link:hover {
    background-color: #667eea;
    color: white;
}

@media (max-width: 768px) {
    header h1 {
        font-size: 2rem;
    }
    
    main {
        padding: 0 1rem;
    }
    
    nav a {
        display: block;
        margin: 0.5rem 0;
    }
}`

    yield* makeGitHubRequest(
      accessToken,
      `/repos/${repoFullName}/contents/styles.css`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Add blog styles',
          content: Buffer.from(cssContent).toString('base64'),
        }),
      }
    )

    return true
  })

const enableGitHubPages = (accessToken: string, repoFullName: string) =>
  Effect.gen(function* () {
    try {
      yield* makeGitHubRequest(accessToken, `/repos/${repoFullName}/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: {
            branch: 'main',
            path: '/',
          },
        }),
      })

      // Generate the GitHub Pages URL
      const [owner, repo] = repoFullName.split('/')
      const pagesUrl = `https://${owner}.github.io/${repo}`

      return pagesUrl
    } catch (error) {
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
    const filePath = `articles/${articleSlug}.html`

    try {
      // Get the current file to get its SHA
      const currentFileResponse = yield* makeGitHubRequest(
        accessToken,
        `/repos/${repoFullName}/contents/${filePath}`
      )
      const currentFile = currentFileResponse as GitHubFileResponse

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
    } catch (error) {
      // File might not exist, which is fine for delete operations
      return { deleted: false, reason: 'File not found' }
    }
  })
