import { Effect, Layer } from 'effect'

import { DatabaseService } from '../../services/database-service'
import {
  ArticleRepository,
  type ArticleRepositoryService,
  type ArticleCreateData,
  type ArticleUpdateData,
} from '../article-repository'

// Individual atomic operations
const createArticle = (data: ArticleCreateData) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    return yield* Effect.promise(() =>
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
              userId: true,
              gitRepo: true,
            },
          },
        },
      })
    )
  })

const findArticleById = (id: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    return yield* Effect.promise(() =>
      prisma.article.findUnique({
        where: { id },
        include: {
          site: {
            select: {
              id: true,
              name: true,
              userId: true,
              gitRepo: true,
            },
          },
        },
      })
    )
  })

const findArticleBySiteIdAndSlug = (siteId: string, slug: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    return yield* Effect.promise(() =>
      prisma.article.findFirst({
        where: { siteId, slug },
      })
    )
  })

const findArticlesBySiteId = (siteId: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    return yield* Effect.promise(() =>
      prisma.article.findMany({
        where: { siteId },
        orderBy: { updatedAt: 'desc' },
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
  })

const findArticlesByUserId = (userId: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    return yield* Effect.promise(() =>
      prisma.article.findMany({
        where: {
          site: { userId },
        },
        include: {
          site: {
            select: {
              id: true,
              name: true,
              userId: true,
              gitRepo: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      })
    )
  })

const updateArticle = (id: string, data: ArticleUpdateData) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    return yield* Effect.promise(() =>
      prisma.article.update({
        where: { id },
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
              userId: true,
              gitRepo: true,
            },
          },
        },
      })
    )
  })

const deleteArticle = (id: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    return yield* Effect.promise(() =>
      prisma.article.delete({
        where: { id },
      })
    )
  })

// Repository implementation using atomic operations
export const PrismaArticleRepositoryLive = Layer.effect(
  ArticleRepository,
  Effect.succeed({
    create: createArticle,
    findById: findArticleById,
    findBySiteIdAndSlug: findArticleBySiteIdAndSlug,
    findBySiteId: findArticlesBySiteId,
    findByUserId: findArticlesByUserId,
    update: updateArticle,
    delete: deleteArticle,
  } satisfies ArticleRepositoryService)
)
