import { Effect, Layer } from 'effect';

import { ThemeModel } from '@/model/theme-model';

import { ThemeService } from './theme-service';
import { ThemeServiceImpl } from './theme-service-impl';

export const ThemeServiceLive = Layer.effect(
  ThemeService,
  Effect.gen(function* () {
    const model = yield* ThemeModel;
    return new ThemeServiceImpl(model);
  })
);
