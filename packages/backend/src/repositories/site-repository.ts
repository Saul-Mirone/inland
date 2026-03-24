import type { Effect } from 'effect';

import { Context } from 'effect';

import type { Site } from '../../generated/prisma/client';
import type { PaginatedResult, PaginationOptions } from './pagination';
import type { RepositoryError } from './repository-error';

// Domain types for Site operations
export interface SiteCreateData {
  readonly name: string;
  readonly displayName?: string | null;
  readonly userId: string;
  readonly gitRepo?: string | null;
  readonly platform?: string;
  readonly deployStatus?: string;
  readonly deployUrl?: string | null;
}

export interface SiteWithCounts extends Site {
  readonly _count: {
    readonly articles: number;
    readonly media: number;
  };
}

export interface SiteWithDetails extends Site {
  readonly user: {
    readonly id: string;
    readonly username: string;
  };
  readonly articles: Array<{
    readonly id: string;
    readonly title: string;
    readonly status: string;
    readonly createdAt: Date;
  }>;
  readonly media: Array<{
    readonly id: string;
    readonly filename: string;
    readonly fileSize: bigint;
    readonly createdAt: Date;
  }>;
}

export interface SiteUpdateData {
  readonly name?: string;
  readonly displayName?: string;
  readonly gitRepo?: string;
  readonly platform?: string;
  readonly deployStatus?: string;
}

// Repository interface
export interface SiteRepositoryService {
  readonly findById: (
    id: string
  ) => Effect.Effect<Site | null, RepositoryError>;
  readonly findByIdWithUserId: (
    id: string
  ) => Effect.Effect<{ userId: string } | null, RepositoryError>;
  readonly findByIdWithDetails: (id: string) => Effect.Effect<
    {
      readonly id: string;
      readonly gitRepo: string | null;
      readonly userId: string;
    } | null,
    RepositoryError
  >;
  readonly findByUserId: (
    userId: string
  ) => Effect.Effect<Site[], RepositoryError>;
  readonly findByUserIdWithCounts: (
    userId: string,
    pagination?: PaginationOptions
  ) => Effect.Effect<PaginatedResult<SiteWithCounts>, RepositoryError>;
  readonly findByIdWithFullDetails: (
    id: string
  ) => Effect.Effect<SiteWithDetails | null, RepositoryError>;
  readonly update: (
    id: string,
    data: SiteUpdateData
  ) => Effect.Effect<Site, RepositoryError>;
  readonly delete: (id: string) => Effect.Effect<Site, RepositoryError>;
  readonly create: (
    data: SiteCreateData
  ) => Effect.Effect<Site, RepositoryError>;
}

// Context tag for dependency injection
export class SiteRepository extends Context.Tag('SiteRepository')<
  SiteRepository,
  SiteRepositoryService
>() {}
