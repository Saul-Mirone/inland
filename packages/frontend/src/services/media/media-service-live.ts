import { Effect, Layer } from 'effect';

import { MediaModel } from '@/model/media-model';
import { ApiClient } from '@/services/api';

import { MediaService } from './media-service';
import { MediaServiceImpl } from './media-service-impl';

export const MediaServiceLive = Layer.effect(
  MediaService,
  Effect.gen(function* () {
    const model = yield* MediaModel;
    const api = yield* ApiClient;
    return new MediaServiceImpl(model, api);
  })
);
