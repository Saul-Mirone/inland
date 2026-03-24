import type { Effect } from 'effect';

import { Context } from 'effect';

import type { Theme } from '@/model/theme-model';

// ── Service interface ───────────────────────────────────────────────

export interface ThemeServiceInterface {
  readonly bootstrap: () => Effect.Effect<void>;
  readonly setTheme: (theme: Theme) => Effect.Effect<void>;
  readonly toggle: () => Effect.Effect<void>;
}

// ── DI tag ──────────────────────────────────────────────────────────

export class ThemeService extends Context.Tag('ThemeService')<
  ThemeService,
  ThemeServiceInterface
>() {}
