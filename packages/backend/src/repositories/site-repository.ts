import type { Effect } from 'effect'

import { Context } from 'effect'

import type { Site } from '../../generated/prisma'
import type { DatabaseService } from '../services/database-service'

// Domain types for Site operations
export interface SiteCreateData {
  readonly name: string
  readonly userId: string
  readonly gitRepo?: string | null
}

export interface SiteWithUserId {
  readonly id: string
  readonly name: string
  readonly userId: string
  readonly gitRepo: string | null
  readonly createdAt: Date
  readonly updatedAt: Date
}

// Repository interface
export interface SiteRepositoryService {
  readonly findById: (
    id: string
  ) => Effect.Effect<Site | null, never, DatabaseService>
  readonly findByIdWithUserId: (
    id: string
  ) => Effect.Effect<{ userId: string } | null, never, DatabaseService>
  readonly findByIdWithDetails: (id: string) => Effect.Effect<
    {
      readonly id: string
      readonly gitRepo: string | null
      readonly userId: string
    } | null,
    never,
    DatabaseService
  >
  readonly findByUserId: (
    userId: string
  ) => Effect.Effect<Site[], never, DatabaseService>
  readonly create: (
    data: SiteCreateData
  ) => Effect.Effect<Site, never, DatabaseService>
}

// Context tag for dependency injection
export class SiteRepository extends Context.Tag('SiteRepository')<
  SiteRepository,
  SiteRepositoryService
>() {}
