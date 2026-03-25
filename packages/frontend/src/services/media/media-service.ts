import type { Effect } from 'effect';

import { Context } from 'effect';

import type { ApiError } from '@/services/api';

export interface UploadResult {
  id: string;
  filePath: string;
  url: string;
}

export interface MediaServiceInterface {
  readonly uploadImage: (
    siteId: string,
    file: File,
    alt?: string
  ) => Effect.Effect<UploadResult, ApiError>;
  readonly fetchMedia: (siteId: string) => Effect.Effect<void>;
  readonly deleteMedia: (id: string) => Effect.Effect<void>;
}

export class MediaService extends Context.Tag('MediaService')<
  MediaService,
  MediaServiceInterface
>() {}
