import { Effect } from 'effect'

import {
  ArticleRepository,
  type ArticleCreateData,
  type ArticleUpdateData,
} from '../../repositories/article-repository'
import { SiteRepository } from '../../repositories/site-repository'
import * as AuthService from '../auth-service'
import * as GitHubService from '../github-service'
import {
  ArticleNotFoundError,
  ArticleAccessDeniedError,
  SiteAccessError,
} from './article-types'

export const importArticlesFromGitHub = (siteId: string, userId: string) =>
  Effect.gen(function* () {
    const siteRepo = yield* SiteRepository
    const articleRepo = yield* ArticleRepository

    // Get site information and verify access
    const site = yield* siteRepo.findByIdWithDetails(siteId)

    if (!site) {
      return yield* new SiteAccessError({ siteId, userId })
    }

    if (site.userId !== userId) {
      return yield* new SiteAccessError({ siteId, userId })
    }

    if (!site.gitRepo) {
      return yield* Effect.fail('Site does not have a linked GitHub repository')
    }

    // Get user's GitHub access token
    const accessToken = yield* AuthService.getUserGitHubToken(userId)

    // Fetch repository information to get default branch
    const repoInfo = yield* GitHubService.makeGitHubRequest(
      accessToken,
      `/repos/${site.gitRepo}`
    )
    const defaultBranch =
      (repoInfo as { default_branch?: string }).default_branch || 'main'

    // Fetch markdown files from GitHub repo
    const articles = yield* GitHubService.getMarkdownFilesFromRepo(
      accessToken,
      site.gitRepo,
      defaultBranch
    )

    yield* Effect.logInfo(
      `Importing ${articles.length} articles from ${site.gitRepo}`
    )

    // Import articles to database
    const importedArticles = []
    for (const articleData of articles) {
      try {
        // Check if article with this slug already exists
        const existingArticle = yield* articleRepo.findBySiteIdAndSlug(
          site.id,
          articleData.slug
        )

        if (existingArticle) {
          yield* Effect.logInfo(
            `Skipping existing article: ${articleData.slug}`
          )
          continue
        }

        // Create new article
        const repoData: ArticleCreateData = {
          siteId: site.id,
          title: articleData.title,
          slug: articleData.slug,
          content: articleData.content,
          status: articleData.status,
        }
        const article = yield* articleRepo.create(repoData)

        importedArticles.push(article)
        yield* Effect.logInfo(`Imported article: ${articleData.title}`)
      } catch (error) {
        yield* Effect.logError(
          `Failed to import article ${articleData.title}:`,
          { error }
        )
      }
    }

    return {
      imported: importedArticles.length,
      total: articles.length,
      articles: importedArticles,
    }
  })

export const publishArticleToGitHub = (articleId: string, userId: string) =>
  Effect.gen(function* () {
    const articleRepo = yield* ArticleRepository

    // Get article with site information
    const article = yield* articleRepo.findById(articleId)

    if (!article) {
      return yield* new ArticleNotFoundError({ articleId })
    }

    // Check if user has access to this article
    if (article.site.userId !== userId) {
      return yield* new ArticleAccessDeniedError({ articleId, userId })
    }

    if (!article.site.gitRepo) {
      return yield* Effect.fail('Site does not have a linked GitHub repository')
    }

    // Get user's GitHub access token
    const accessToken = yield* AuthService.getUserGitHubToken(userId)

    // Create markdown file content with front matter (matching template format)
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    const excerpt = generateExcerpt(article.content)

    const frontMatter = `---
title: ${article.title}
date: ${today}
excerpt: ${excerpt}
---

`
    const markdownContent = frontMatter + article.content
    const filePath = `content/${article.slug}.md`

    // Check if file already exists to get SHA for update
    let fileSha: string | undefined
    const existingFileResult = yield* GitHubService.makeGitHubRequest(
      accessToken,
      `/repos/${article.site.gitRepo}/contents/${filePath}`
    ).pipe(
      Effect.catchTag('GitHubAPIError', (error) => {
        // File doesn't exist (404), which is fine for new files
        if (error.status === 404) {
          return Effect.succeed(null)
        }
        // Re-throw other GitHub API errors
        return Effect.fail(error)
      })
    )

    if (existingFileResult) {
      fileSha = (existingFileResult as { sha: string }).sha
      yield* Effect.logInfo(`Updating existing file: ${filePath}`)
    } else {
      yield* Effect.logInfo(`Creating new file: ${filePath}`)
    }

    // Publish to GitHub
    const commitData = {
      message: `${fileSha ? 'Update' : 'Add'} article: ${article.title}`,
      content: Buffer.from(markdownContent).toString('base64'),
      ...(fileSha && { sha: fileSha }),
    }

    const response = yield* GitHubService.makeGitHubRequest(
      accessToken,
      `/repos/${article.site.gitRepo}/contents/${filePath}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commitData),
      }
    )

    yield* Effect.logInfo(
      `Article published to GitHub: ${article.title} -> ${filePath}`
    )

    // Always update article status to published and update timestamp
    const repoData: ArticleUpdateData = {
      status: 'published',
    }
    const updatedArticle = yield* articleRepo.update(articleId, repoData)

    return {
      article: updatedArticle,
      published: true,
      filePath,
      commitSha: (response as { commit: { sha: string } }).commit.sha,
      wasUpdate: fileSha !== undefined,
    }
  })

const generateExcerpt = (content: string): string => {
  // Remove common markdown syntax to extract plain text
  let text = content
    // Remove colons
    .replace(':', '')
    // Remove headers (# ## ### etc.)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic (**text** or *text*)
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    // Remove links [text](url)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove inline code `code`
    .replace(/`([^`]+)`/g, '$1')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove list markers (- * +)
    .replace(/^[\s]*[-*+]\s+/gm, '')
    // Remove numbered list markers (1. 2. etc.)
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Replace multiple whitespace/newlines with single space
    .replace(/\s+/g, ' ')
    // Trim whitespace
    .trim()

  // Truncate to approximately 150 characters, but try to end at word boundary
  if (text.length <= 150) {
    return text
  }

  const truncated = text.substring(0, 150)
  const lastSpaceIndex = truncated.lastIndexOf(' ')

  // If we can find a word boundary within reasonable distance, use it
  if (lastSpaceIndex > 100) {
    return truncated.substring(0, lastSpaceIndex) + '...'
  }

  // Otherwise, just truncate at 150 chars
  return truncated + '...'
}
