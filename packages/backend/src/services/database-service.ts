import { Effect, Context, Layer } from 'effect'

import type { prisma } from '../database/client'

export class DatabaseService extends Context.Tag('DatabaseService')<
  DatabaseService,
  {
    readonly prisma: typeof prisma
  }
>() {}

export const makeDatabaseService = (prismaClient: typeof prisma) =>
  Layer.succeed(DatabaseService, { prisma: prismaClient })

export const getPrisma = DatabaseService.pipe(
  Effect.map((service) => service.prisma)
)
