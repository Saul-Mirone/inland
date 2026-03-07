import { Effect, Context, Layer } from 'effect'

import type { PrismaClient } from '../../generated/prisma/client'

export class DatabaseService extends Context.Tag('DatabaseService')<
  DatabaseService,
  {
    readonly prisma: PrismaClient
  }
>() {}

export const makeDatabaseService = (prismaClient: PrismaClient) =>
  Layer.succeed(DatabaseService, { prisma: prismaClient })

export const getPrisma = DatabaseService.pipe(
  Effect.map((service) => service.prisma)
)
