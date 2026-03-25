import type { Effect } from 'effect';

import { Context } from 'effect';

import type { Media } from '../../generated/prisma/client';
import type { PaginatedResult, PaginationOptions } from './pagination';
import type { RepositoryError } from './repository-error';

export interface MediaCreateData {
  readonly siteId: string;
  readonly filename: string;
  readonly originalName: string;
  readonly filePath: string;
  readonly fileSize: bigint;
  readonly mimeType: string;
  readonly storageType?: string;
  readonly contentHash?: string;
  readonly externalUrl?: string;
  readonly alt?: string;
}

export interface MediaWithSite extends Media {
  readonly site: {
    readonly id: string;
    readonly userId: string;
    readonly gitRepo: string | null;
  };
}

export interface MediaRepositoryService {
  readonly create: (
    data: MediaCreateData
  ) => Effect.Effect<Media, RepositoryError>;
  readonly findById: (
    id: string
  ) => Effect.Effect<MediaWithSite | null, RepositoryError>;
  readonly findBySiteId: (
    siteId: string,
    pagination?: PaginationOptions
  ) => Effect.Effect<PaginatedResult<Media>, RepositoryError>;
  readonly findBySiteIdAndHash: (
    siteId: string,
    contentHash: string
  ) => Effect.Effect<Media | null, RepositoryError>;
  readonly findBySiteIdAndPath: (
    siteId: string,
    filePath: string
  ) => Effect.Effect<Media | null, RepositoryError>;
  readonly delete: (id: string) => Effect.Effect<Media, RepositoryError>;
}

export class MediaRepository extends Context.Tag('MediaRepository')<
  MediaRepository,
  MediaRepositoryService
>() {}
