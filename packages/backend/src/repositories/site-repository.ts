import type { Effect } from 'effect'

import { Context } from 'effect'

import type { Site } from '../../generated/prisma'
import type { DatabaseService } from '../services/database-service'

// Domain types for Site operations
export interface SiteCreateData {
  readonly name: string
  readonly userId: string
  readonly gitRepo?: string | null
  readonly platform?: string
  readonly deployStatus?: string
  readonly deployUrl?: string | null
}

export interface SiteWithUserId {
  readonly id: string
  readonly name: string
  readonly userId: string
  readonly gitRepo: string | null
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface SiteWithCounts extends Site {
  readonly _count: {
    readonly articles: number
    readonly media: number
  }
}

export interface SiteWithDetails extends Site {
  readonly user: {
    readonly id: string
    readonly username: string
  }
  readonly articles: Array<{
    readonly id: string
    readonly title: string
    readonly status: string
    readonly createdAt: Date
  }>
  readonly media: Array<{
    readonly id: string
    readonly filename: string
    readonly fileSize: bigint
    readonly createdAt: Date
  }>
}

export interface SiteUpdateData {
  readonly name?: string
  readonly gitRepo?: string
  readonly platform?: string
  readonly deployStatus?: string
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
  readonly findByUserIdWithCounts: (
    userId: string
  ) => Effect.Effect<SiteWithCounts[], never, DatabaseService>
  readonly findByIdWithFullDetails: (
    id: string
  ) => Effect.Effect<SiteWithDetails | null, never, DatabaseService>
  readonly update: (
    id: string,
    data: SiteUpdateData
  ) => Effect.Effect<Site, never, DatabaseService>
  readonly delete: (id: string) => Effect.Effect<Site, never, DatabaseService>
  readonly create: (
    data: SiteCreateData
  ) => Effect.Effect<Site, never, DatabaseService>
}

// Context tag for dependency injection
export class SiteRepository extends Context.Tag('SiteRepository')<
  SiteRepository,
  SiteRepositoryService
>() {}
