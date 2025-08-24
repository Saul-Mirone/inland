import { Effect } from 'effect'

import {
  ArticleRepository,
  type ArticleCreateData,
  type ArticleUpdateData,
} from '../../repositories/article-repository'
import { SiteRepository } from '../../repositories/site-repository'
import {
  ArticleNotFoundError,
  ArticleCreationError,
  ArticleAccessDeniedError,
  DuplicateSlugError,
  SiteAccessError,
  type CreateArticleData,
  type UpdateArticleData,
} from './article-types'

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
      return yield* new SiteAccessError({ siteId, userId })
    }

    if (site.userId !== userId) {
      return yield* new SiteAccessError({ siteId, userId })
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

    // First verify article exists and user has access
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
      const article = yield* articleRepo.update(articleId, repoData)
      return { article }
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

    // First verify article exists and user has access
    const existingArticle = yield* articleRepo.findById(articleId)

    if (!existingArticle) {
      return yield* new ArticleNotFoundError({ articleId })
    }

    if (existingArticle.site.userId !== userId) {
      return yield* new ArticleAccessDeniedError({ articleId, userId })
    }

    const article = yield* articleRepo.delete(articleId)

    return {
      article: {
        id: article.id,
        siteId: article.siteId,
        title: article.title,
        slug: article.slug,
        content: article.content,
        status: article.status,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
      },
      gitHubDeleted: false, // Set this based on whether it was published to GitHub
      gitHubError: null,
      hasGitHubRepo: Boolean(existingArticle.site.gitRepo),
    }
  })
