import { Context, Layer } from 'effect';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'light' | 'dark';

export interface ThemeModelService {
  readonly theme$: BehaviorSubject<Theme>;
  readonly effectiveTheme$: BehaviorSubject<EffectiveTheme>;
}

const instance: ThemeModelService = {
  theme$: new BehaviorSubject<Theme>('system'),
  effectiveTheme$: new BehaviorSubject<EffectiveTheme>('light'),
};

export class ThemeModel extends Context.Tag('ThemeModel')<
  ThemeModel,
  ThemeModelService
>() {}

export const ThemeModelLive = Layer.succeed(ThemeModel, instance);

export const themeModel = instance;
