import { Effect, Data } from 'effect'

import { DatabaseService } from './database-service'

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
    const { prisma } = yield* DatabaseService

    // First verify user has access to the site
    const site = yield* Effect.promise(() =>
      prisma.site.findUnique({
        where: { id: data.siteId },
        select: { userId: true },
      })
    )

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
      const article = yield* Effect.promise(() =>
        prisma.article.create({
          data: {
            siteId: data.siteId,
            title: data.title,
            slug: data.slug,
            content: data.content,
            status: data.status || 'draft',
          },
          include: {
            site: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
      )
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
    const { prisma } = yield* DatabaseService

    const article = yield* Effect.promise(() =>
      prisma.article.findUnique({
        where: { id: articleId },
        include: {
          site: {
            select: {
              id: true,
              name: true,
              userId: true,
            },
          },
        },
      })
    )

    if (!article) {
      return yield* new ArticleNotFoundError({ articleId })
    }

    return article
  })

export const findSiteArticles = (siteId: string, userId: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService

    // First verify user has access to the site
    const site = yield* Effect.promise(() =>
      prisma.site.findUnique({
        where: { id: siteId },
        select: { userId: true },
      })
    )

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

    const articles = yield* Effect.promise(() =>
      prisma.article.findMany({
        where: { siteId },
        orderBy: {
          updatedAt: 'desc',
        },
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    )

    return articles
  })

export const findUserArticles = (userId: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService

    const articles = yield* Effect.promise(() =>
      prisma.article.findMany({
        where: {
          site: {
            userId,
          },
        },
        include: {
          site: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      })
    )

    return articles
  })

export const updateArticle = (
  articleId: string,
  userId: string,
  data: UpdateArticleData
) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService

    // First check if article exists and user has access
    const existingArticle = yield* Effect.promise(() =>
      prisma.article.findUnique({
        where: { id: articleId },
        include: {
          site: {
            select: { userId: true },
          },
        },
      })
    )

    if (!existingArticle) {
      return yield* new ArticleNotFoundError({ articleId })
    }

    if (existingArticle.site.userId !== userId) {
      return yield* new ArticleAccessDeniedError({ articleId, userId })
    }

    try {
      const updatedArticle = yield* Effect.promise(() =>
        prisma.article.update({
          where: { id: articleId },
          data: {
            ...(data.title && { title: data.title }),
            ...(data.slug && { slug: data.slug }),
            ...(data.content !== undefined && { content: data.content }),
            ...(data.status && { status: data.status }),
          },
          include: {
            site: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
      )

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
    const { prisma } = yield* DatabaseService

    // First check if article exists and user has access
    const existingArticle = yield* Effect.promise(() =>
      prisma.article.findUnique({
        where: { id: articleId },
        include: {
          site: {
            select: { userId: true },
          },
        },
      })
    )

    if (!existingArticle) {
      return yield* new ArticleNotFoundError({ articleId })
    }

    if (existingArticle.site.userId !== userId) {
      return yield* new ArticleAccessDeniedError({ articleId, userId })
    }

    const deletedArticle = yield* Effect.promise(() =>
      prisma.article.delete({
        where: { id: articleId },
      })
    )

    return deletedArticle
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
