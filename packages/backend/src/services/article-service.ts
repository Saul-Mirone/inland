import { Effect, Data } from 'effect'

import {
  ArticleRepository,
  type ArticleCreateData,
  type ArticleUpdateData,
} from '../repositories/article-repository'
import { SiteRepository } from '../repositories/site-repository'
import * as AuthService from './auth-service'
import * as GitHubService from './github-service'

export class ArticleNotFoundError extends Data.TaggedError(
  'ArticleNotFoundError'
)<{
  readonly articleId: string
}> {}

export class ArticleCreationError extends Data.TaggedError(
  'ArticleCreationError'
)<{
  readonly reason: string
}> {}

export class ArticleAccessDeniedError extends Data.TaggedError(
  'ArticleAccessDeniedError'
)<{
  readonly articleId: string
  readonly userId: string
}> {}

export class DuplicateSlugError extends Data.TaggedError('DuplicateSlugError')<{
  readonly slug: string
  readonly siteId: string
}> {}

export class SiteAccessError extends Data.TaggedError('SiteAccessError')<{
  readonly siteId: string
  readonly userId: string
}> {}

export interface CreateArticleData {
  readonly siteId: string
  readonly title: string
  readonly slug: string
  readonly content: string
  readonly status?: 'draft' | 'published'
}

export interface UpdateArticleData {
  readonly title?: string
  readonly slug?: string
  readonly content?: string
  readonly status?: 'draft' | 'published'
}

export const createArticle = (userId: string, data: CreateArticleData) =>
  Effect.gen(function* () {
    const siteRepo = yield* SiteRepository
    const articleRepo = yield* ArticleRepository

    // First verify user has access to the site
    const site = yield* siteRepo.findByIdWithUserId(data.siteId)

    if (!site) {
      return yield* new SiteAccessError({
        siteId: data.siteId,
        userId,
      })
    }

    if (site.userId !== userId) {
      return yield* new SiteAccessError({
        siteId: data.siteId,
        userId,
      })
    }

    try {
      const repoData: ArticleCreateData = {
        siteId: data.siteId,
        title: data.title,
        slug: data.slug,
        content: data.content,
        status: data.status || 'draft',
      }
      const article = yield* articleRepo.create(repoData)
      return article
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Unique constraint')
      ) {
        return yield* new DuplicateSlugError({
          slug: data.slug,
          siteId: data.siteId,
        })
      }
      return yield* new ArticleCreationError({
        reason: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  })

export const findArticleById = (articleId: string) =>
  Effect.gen(function* () {
    const articleRepo = yield* ArticleRepository

    const article = yield* articleRepo.findById(articleId)

    if (!article) {
      return yield* new ArticleNotFoundError({ articleId })
    }

    return article
  })

export const findSiteArticles = (siteId: string, userId: string) =>
  Effect.gen(function* () {
    const siteRepo = yield* SiteRepository
    const articleRepo = yield* ArticleRepository

    // First verify user has access to the site
    const site = yield* siteRepo.findByIdWithUserId(siteId)

    if (!site) {
      return yield* new SiteAccessError({
        siteId,
        userId,
      })
    }

    if (site.userId !== userId) {
      return yield* new SiteAccessError({
        siteId,
        userId,
      })
    }

    const articles = yield* articleRepo.findBySiteId(siteId)

    return articles
  })

export const findUserArticles = (userId: string) =>
  Effect.gen(function* () {
    const articleRepo = yield* ArticleRepository

    const articles = yield* articleRepo.findByUserId(userId)

    return articles
  })

export const updateArticle = (
  articleId: string,
  userId: string,
  data: UpdateArticleData
) =>
  Effect.gen(function* () {
    const articleRepo = yield* ArticleRepository

    // First check if article exists and user has access
    const existingArticle = yield* articleRepo.findById(articleId)

    if (!existingArticle) {
      return yield* new ArticleNotFoundError({ articleId })
    }

    if (existingArticle.site.userId !== userId) {
      return yield* new ArticleAccessDeniedError({ articleId, userId })
    }

    try {
      const repoData: ArticleUpdateData = {
        ...(data.title && { title: data.title }),
        ...(data.slug && { slug: data.slug }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.status && { status: data.status }),
      }
      const updatedArticle = yield* articleRepo.update(articleId, repoData)

      return updatedArticle
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Unique constraint')
      ) {
        return yield* new DuplicateSlugError({
          slug: data.slug || '',
          siteId: existingArticle.siteId,
        })
      }
      return yield* new ArticleCreationError({
        reason: error instanceof Error ? error.message : 'Update failed',
      })
    }
  })

export const deleteArticle = (articleId: string, userId: string) =>
  Effect.gen(function* () {
    const articleRepo = yield* ArticleRepository

    // First check if article exists and user has access
    const existingArticle = yield* articleRepo.findById(articleId)

    if (!existingArticle) {
      return yield* new ArticleNotFoundError({ articleId })
    }

    if (existingArticle.site.userId !== userId) {
      return yield* new ArticleAccessDeniedError({ articleId, userId })
    }

    // Delete from GitHub repo if site has a linked repository
    let gitHubDeleted = false
    let gitHubError: string | null = null

    if (existingArticle.site.gitRepo) {
      try {
        const accessToken = yield* AuthService.getUserGitHubToken(userId)

        const deleteResult = yield* GitHubService.deleteArticleFromRepo(
          accessToken,
          existingArticle.site.gitRepo,
          existingArticle.slug
        )

        if (deleteResult.deleted) {
          gitHubDeleted = true
          yield* Effect.logInfo(
            `Deleted article file from GitHub: ${deleteResult.filePath}`
          )
        } else {
          yield* Effect.logInfo(
            `Article file not found in GitHub repo: ${deleteResult.reason}`
          )
        }
      } catch (error) {
        // Log the error but don't fail the deletion - database cleanup should proceed
        gitHubError = error instanceof Error ? error.message : 'Unknown error'
        yield* Effect.logError(
          `Failed to delete article from GitHub repo: ${existingArticle.slug}`,
          { error }
        )
      }
    }

    // Delete from database
    const deletedArticle = yield* articleRepo.delete(articleId)

    return {
      article: deletedArticle,
      gitHubDeleted,
      gitHubError,
      hasGitHubRepo: !!existingArticle.site.gitRepo,
    }
  })

export const validateTitle = (title: string) =>
  Effect.gen(function* () {
    const trimmedTitle = title.trim()

    if (trimmedTitle.length === 0) {
      return yield* Effect.fail('Article title cannot be empty')
    }

    if (trimmedTitle.length > 200) {
      return yield* Effect.fail('Article title cannot exceed 200 characters')
    }

    return trimmedTitle
  })

export const validateSlug = (slug: string) =>
  Effect.gen(function* () {
    const trimmedSlug = slug.trim()

    if (trimmedSlug.length === 0) {
      return yield* Effect.fail('Article slug cannot be empty')
    }

    // Basic slug validation - URL safe characters
    const validSlugPattern = /^[a-z0-9-]+$/
    if (!validSlugPattern.test(trimmedSlug)) {
      return yield* Effect.fail(
        'Slug can only contain lowercase letters, numbers, and hyphens'
      )
    }

    if (trimmedSlug.length > 100) {
      return yield* Effect.fail('Slug cannot exceed 100 characters')
    }

    return trimmedSlug
  })

export const generateSlugFromTitle = (title: string) =>
  Effect.gen(function* () {
    const trimmedTitle = title.trim()

    if (trimmedTitle.length === 0) {
      return yield* Effect.fail('Cannot generate slug from empty title')
    }

    // Convert title to URL-friendly slug
    const slug = trimmedTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .substring(0, 100) // Limit length

    if (slug.length === 0) {
      return yield* Effect.fail('Generated slug is empty')
    }

    return slug
  })

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
