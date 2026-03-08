import { Effect, Layer } from 'effect'

import { DatabaseService } from '../../services/database-service'
import {
  ArticleRepository,
  type ArticleRepositoryService,
  type ArticleCreateData,
  type ArticleUpdateData,
} from '../article-repository'
import { RepositoryError } from '../repository-error'

// Individual atomic operations
const createArticle = (data: ArticleCreateData) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    return yield* Effect.tryPromise({
      try: () =>
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
        }),
      catch: (error) =>
        new RepositoryError({ operation: 'article.create', cause: error }),
    })
  })

const findArticleById = (id: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    return yield* Effect.tryPromise({
      try: () =>
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
        }),
      catch: (error) =>
        new RepositoryError({ operation: 'article.findById', cause: error }),
    })
  })

const findArticleBySiteIdAndSlug = (siteId: string, slug: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    return yield* Effect.tryPromise({
      try: () =>
        prisma.article.findFirst({
          where: { siteId, slug },
        }),
      catch: (error) =>
        new RepositoryError({
          operation: 'article.findBySiteIdAndSlug',
          cause: error,
        }),
    })
  })

const findArticlesBySiteId = (siteId: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    return yield* Effect.tryPromise({
      try: () =>
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
        }),
      catch: (error) =>
        new RepositoryError({
          operation: 'article.findBySiteId',
          cause: error,
        }),
    })
  })

const findArticlesByUserId = (userId: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    return yield* Effect.tryPromise({
      try: () =>
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
        }),
      catch: (error) =>
        new RepositoryError({
          operation: 'article.findByUserId',
          cause: error,
        }),
    })
  })

const updateArticle = (id: string, data: ArticleUpdateData) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    return yield* Effect.tryPromise({
      try: () =>
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
        }),
      catch: (error) =>
        new RepositoryError({ operation: 'article.update', cause: error }),
    })
  })

const deleteArticle = (id: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    return yield* Effect.tryPromise({
      try: () =>
        prisma.article.delete({
          where: { id },
        }),
      catch: (error) =>
        new RepositoryError({ operation: 'article.delete', cause: error }),
    })
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
