import { Effect, Layer } from 'effect';

import { DatabaseService } from '../../services/database-service';
import {
  MediaRepository,
  type MediaRepositoryService,
  type MediaCreateData,
} from '../media-repository';
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  type PaginationOptions,
} from '../pagination';
import { RepositoryError } from '../repository-error';
import { withDatabase } from '../with-database';

const createMedia = (data: MediaCreateData) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService;
    return yield* Effect.tryPromise({
      try: () =>
        prisma.media.create({
          data: {
            siteId: data.siteId,
            filename: data.filename,
            originalName: data.originalName,
            filePath: data.filePath,
            fileSize: data.fileSize,
            mimeType: data.mimeType,
            storageType: data.storageType ?? 'github',
            ...(data.contentHash !== undefined && {
              contentHash: data.contentHash,
            }),
            ...(data.externalUrl !== undefined && {
              externalUrl: data.externalUrl,
            }),
            ...(data.alt !== undefined && { alt: data.alt }),
          },
        }),
      catch: (cause) =>
        new RepositoryError({ operation: 'media.create', cause }),
    });
  });

const findById = (id: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService;
    return yield* Effect.tryPromise({
      try: () =>
        prisma.media.findUnique({
          where: { id },
          include: {
            site: {
              select: { id: true, userId: true, gitRepo: true },
            },
          },
        }),
      catch: (cause) =>
        new RepositoryError({ operation: 'media.findById', cause }),
    });
  });

const findBySiteId = (siteId: string, pagination?: PaginationOptions) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService;
    const page = pagination?.page ?? DEFAULT_PAGE;
    const limit = pagination?.limit ?? DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const [items, total] = yield* Effect.tryPromise({
      try: () =>
        prisma.$transaction([
          prisma.media.findMany({
            where: { siteId },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
          }),
          prisma.media.count({ where: { siteId } }),
        ]),
      catch: (cause) =>
        new RepositoryError({
          operation: 'media.findBySiteId',
          cause,
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

const findBySiteIdAndHash = (siteId: string, contentHash: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService;
    return yield* Effect.tryPromise({
      try: () =>
        prisma.media.findFirst({
          where: { siteId, contentHash },
        }),
      catch: (cause) =>
        new RepositoryError({
          operation: 'media.findBySiteIdAndHash',
          cause,
        }),
    });
  });

const findBySiteIdAndPath = (siteId: string, filePath: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService;
    return yield* Effect.tryPromise({
      try: () =>
        prisma.media.findUnique({
          where: { siteId_filePath: { siteId, filePath } },
        }),
      catch: (cause) =>
        new RepositoryError({
          operation: 'media.findBySiteIdAndPath',
          cause,
        }),
    });
  });

const deleteMedia = (id: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService;
    return yield* Effect.tryPromise({
      try: () => prisma.media.delete({ where: { id } }),
      catch: (cause) =>
        new RepositoryError({ operation: 'media.delete', cause }),
    });
  });

export const PrismaMediaRepositoryLive = Layer.effect(
  MediaRepository,
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    const bind = withDatabase(db);
    return {
      create: bind(createMedia),
      findById: bind(findById),
      findBySiteId: bind(findBySiteId),
      findBySiteIdAndHash: bind(findBySiteIdAndHash),
      findBySiteIdAndPath: bind(findBySiteIdAndPath),
      delete: bind(deleteMedia),
    } satisfies MediaRepositoryService;
  })
);
