import { Effect, Layer } from 'effect';

import { DatabaseService } from '../../services/database-service';
import { RepositoryError } from '../repository-error';
import {
  UserRepository,
  type UserRepositoryService,
  type CreateUserData,
  type CreateGitIntegrationData,
} from '../user-repository';
import { withDatabase } from '../with-database';

// Individual atomic operations
const createUser = (data: CreateUserData) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService;
    return yield* Effect.tryPromise({
      try: () =>
        prisma.user.create({
          data: {
            username: data.username,
            email: data.email,
            avatarUrl: data.avatarUrl,
          },
        }),
      catch: (error) =>
        new RepositoryError({ operation: 'user.create', cause: error }),
    });
  });

const findUserByUsername = (username: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService;
    return yield* Effect.tryPromise({
      try: () =>
        prisma.user.findUnique({
          where: { username },
        }),
      catch: (error) =>
        new RepositoryError({
          operation: 'user.findByUsername',
          cause: error,
        }),
    });
  });

const findUserById = (userId: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService;
    return yield* Effect.tryPromise({
      try: () =>
        prisma.user.findUnique({
          where: { id: userId },
          include: {
            gitIntegrations: true,
          },
        }),
      catch: (error) =>
        new RepositoryError({ operation: 'user.findById', cause: error }),
    });
  });

const upsertUser = (data: CreateUserData) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService;
    return yield* Effect.tryPromise({
      try: () =>
        prisma.user.upsert({
          where: { username: data.username },
          update: {
            email: data.email,
            avatarUrl: data.avatarUrl,
          },
          create: {
            username: data.username,
            email: data.email,
            avatarUrl: data.avatarUrl,
          },
        }),
      catch: (error) =>
        new RepositoryError({ operation: 'user.upsert', cause: error }),
    });
  });

const upsertGitIntegration = (data: CreateGitIntegrationData) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService;
    return yield* Effect.tryPromise({
      try: () =>
        prisma.gitIntegration.upsert({
          where: {
            userId_platform: {
              userId: data.userId,
              platform: data.platform,
            },
          },
          update: {
            platformUsername: data.platformUsername,
            accessToken: data.accessToken,
            installationId: data.installationId,
          },
          create: {
            userId: data.userId,
            platform: data.platform,
            platformUsername: data.platformUsername,
            accessToken: data.accessToken,
            installationId: data.installationId,
          },
        }),
      catch: (error) =>
        new RepositoryError({
          operation: 'gitIntegration.upsert',
          cause: error,
        }),
    });
  });

const getAuthToken = (userId: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService;

    const gitIntegration = yield* Effect.tryPromise({
      try: () =>
        prisma.gitIntegration.findFirst({
          where: {
            userId,
            platform: 'github',
          },
          select: {
            accessToken: true,
          },
        }),
      catch: (error) =>
        new RepositoryError({
          operation: 'gitIntegration.getAuthToken',
          cause: error,
        }),
    });

    return gitIntegration?.accessToken || null;
  });

const clearAuthToken = (userId: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService;

    yield* Effect.tryPromise({
      try: () =>
        prisma.gitIntegration.updateMany({
          where: {
            userId,
            platform: 'github',
          },
          data: {
            accessToken: '',
            updatedAt: new Date(),
          },
        }),
      catch: (error) =>
        new RepositoryError({
          operation: 'gitIntegration.clearAuthToken',
          cause: error,
        }),
    });
  });

// Repository implementation — DatabaseService resolved at layer construction
export const PrismaUserRepositoryLive = Layer.effect(
  UserRepository,
  Effect.gen(function* () {
    const bind = withDatabase(yield* DatabaseService);

    return {
      create: bind(createUser),
      findByUsername: bind(findUserByUsername),
      findById: bind(findUserById),
      upsert: bind(upsertUser),
      upsertGitIntegration: bind(upsertGitIntegration),
      getAuthToken: bind(getAuthToken),
      clearAuthToken: bind(clearAuthToken),
    } satisfies UserRepositoryService;
  })
);
