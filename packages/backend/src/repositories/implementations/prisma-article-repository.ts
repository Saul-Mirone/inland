import { Effect, Layer } from 'effect';

import { DatabaseService } from '../../services/database-service';
import {
  ArticleRepository,
  type ArticleRepositoryService,
  type ArticleCreateData,
  type ArticleUpdateData,
} from '../article-repository';
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  type PaginationOptions,
} from '../pagination';
import { RepositoryError } from '../repository-error';
import { withDatabase } from '../with-database';

// Individual atomic operations
const createArticle = (data: ArticleCreateData) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService;
    return yield* Effect.tryPromise({
      try: () =>
        prisma.article.create({
          data: {
            siteId: data.siteId,
            title: data.title,
            slug: data.slug,
            content: data.content,
            ...(data.excerpt !== undefined && {
              excerpt: data.excerpt,
            }),
            ...(data.tags !== undefined && { tags: data.tags }),
            status: data.status || 'draft',
            ...(data.publishedAt !== undefined && {
              publishedAt: data.publishedAt,
            }),
            ...(data.gitSha !== undefined && { gitSha: data.gitSha }),
            ...(data.gitSyncedAt !== undefined && {
              gitSyncedAt: data.gitSyncedAt,
            }),
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
    });
  });

const findArticleById = (id: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService;
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
    });
  });

const findArticleBySiteIdAndSlug = (siteId: string, slug: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService;
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
    });
  });

const findArticlesBySiteId = (siteId: string, pagination?: PaginationOptions) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService;
    const page = pagination?.page ?? DEFAULT_PAGE;
    const limit = pagination?.limit ?? DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const [items, total] = yield* Effect.tryPromise({
      try: () =>
        prisma.$transaction([
          prisma.article.findMany({
            where: { siteId },
            orderBy: { updatedAt: 'desc' },
            select: {
              id: true,
              title: true,
              slug: true,
              excerpt: true,
              tags: true,
              status: true,
              publishedAt: true,
              gitSyncedAt: true,
              createdAt: true,
              updatedAt: true,
            },
            skip,
            take: limit,
          }),
          prisma.article.count({ where: { siteId } }),
        ]),
      catch: (error) =>
        new RepositoryError({
          operation: 'article.findBySiteId',
          cause: error,
        }),
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  });

const findArticlesByUserId = (userId: string, pagination?: PaginationOptions) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService;
    const page = pagination?.page ?? DEFAULT_PAGE;
    const limit = pagination?.limit ?? DEFAULT_LIMIT;
    const skip = (page - 1) * limit;
    const where = { site: { userId } };

    const [items, total] = yield* Effect.tryPromise({
      try: () =>
        prisma.$transaction([
          prisma.article.findMany({
            where,
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
            skip,
            take: limit,
          }),
          prisma.article.count({ where }),
        ]),
      catch: (error) =>
        new RepositoryError({
          operation: 'article.findByUserId',
          cause: error,
        }),
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  });

const updateArticle = (id: string, data: ArticleUpdateData) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService;
    return yield* Effect.tryPromise({
      try: () =>
        prisma.article.update({
          where: { id },
          data: {
            ...(data.title !== undefined && { title: data.title }),
            ...(data.slug !== undefined && { slug: data.slug }),
            ...(data.content !== undefined && { content: data.content }),
            ...(data.excerpt !== undefined && {
              excerpt: data.excerpt,
            }),
            ...(data.tags !== undefined && { tags: data.tags }),
            ...(data.status !== undefined && { status: data.status }),
            ...(data.publishedAt !== undefined && {
              publishedAt: data.publishedAt,
            }),
            ...(data.gitSha !== undefined && { gitSha: data.gitSha }),
            ...(data.gitSyncedAt !== undefined && {
              gitSyncedAt: data.gitSyncedAt,
            }),
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
    });
  });

const findAllForSync = (siteId: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService;
    return yield* Effect.tryPromise({
      try: () =>
        prisma.article.findMany({
          where: { siteId },
          select: { id: true, slug: true, status: true, gitSha: true },
        }),
      catch: (error) =>
        new RepositoryError({
          operation: 'article.findAllForSync',
          cause: error,
        }),
    });
  });

const findAllPublishedBySiteId = (siteId: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService;
    return yield* Effect.tryPromise({
      try: () =>
        prisma.article.findMany({
          where: { siteId, status: 'published' },
          orderBy: { updatedAt: 'desc' },
        }),
      catch: (error) =>
        new RepositoryError({
          operation: 'article.findAllPublishedBySiteId',
          cause: error,
        }),
    });
  });

const deleteArticle = (id: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService;
    return yield* Effect.tryPromise({
      try: () =>
        prisma.article.delete({
          where: { id },
        }),
      catch: (error) =>
        new RepositoryError({ operation: 'article.delete', cause: error }),
    });
  });

// Repository implementation — DatabaseService resolved at layer construction
export const PrismaArticleRepositoryLive = Layer.effect(
  ArticleRepository,
  Effect.gen(function* () {
    const bind = withDatabase(yield* DatabaseService);

    return {
      create: bind(createArticle),
      findById: bind(findArticleById),
      findBySiteIdAndSlug: bind(findArticleBySiteIdAndSlug),
      findBySiteId: bind(findArticlesBySiteId),
      findByUserId: bind(findArticlesByUserId),
      update: bind(updateArticle),
      delete: bind(deleteArticle),
      findAllForSync: bind(findAllForSync),
      findAllPublishedBySiteId: bind(findAllPublishedBySiteId),
    } satisfies ArticleRepositoryService;
  })
);
