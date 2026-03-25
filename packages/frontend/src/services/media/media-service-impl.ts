import { Effect } from 'effect';

import type { MediaItem, MediaModelService } from '@/model/media-model';
import type { ApiClientService, ApiError } from '@/services/api';

import type { MediaServiceInterface, UploadResult } from './media-service';

interface FetchMediaResponse {
  media: MediaItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class MediaServiceImpl implements MediaServiceInterface {
  constructor(
    private readonly model: MediaModelService,
    private readonly api: ApiClientService
  ) {}

  uploadImage = (
    siteId: string,
    file: File,
    alt?: string
  ): Effect.Effect<UploadResult, ApiError> =>
    Effect.gen(this, function* () {
      const formData = new FormData();
      formData.append('file', file);
      if (alt !== undefined) {
        formData.append('alt', alt);
      }

      const result = yield* this.api.postFormData<UploadResult>(
        `/sites/${siteId}/media`,
        formData
      );

      yield* this.fetchMedia(siteId);
      return result;
    });

  fetchMedia = (siteId: string): Effect.Effect<void> =>
    Effect.gen(this, function* () {
      this.model.loading$.next(true);
      this.model.error$.next(null);

      const data = yield* this.api.get<FetchMediaResponse>(
        `/sites/${siteId}/media?limit=100`
      );

      this.model.media$.next(data.media);
      this.model.total$.next(data.total);
      this.model.loading$.next(false);
    }).pipe(
      Effect.catchAll((error) =>
        Effect.sync(() => {
          this.model.loading$.next(false);
          this.model.error$.next(error.message);
        })
      )
    );

  deleteMedia = (id: string): Effect.Effect<void> =>
    Effect.gen(this, function* () {
      const currentMedia = this.model.media$.getValue();
      this.model.media$.next(currentMedia.filter((m) => m.id !== id));

      yield* this.api.del(`/media/${id}`);
    }).pipe(
      Effect.catchAll((error) =>
        Effect.sync(() => {
          this.model.error$.next(error.message);
        })
      )
    );
}
