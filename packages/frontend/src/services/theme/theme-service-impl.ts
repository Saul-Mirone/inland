import { Effect } from 'effect';

import type { Theme, ThemeModelService } from '@/model/theme-model';

import type { ThemeServiceInterface } from './theme-service';

// Keep in sync with FOUC script in index.html
const STORAGE_KEY = 'inland-theme';

function resolveEffective(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return theme;
}

function applyToDOM(effective: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', effective === 'dark');
}

export class ThemeServiceImpl implements ThemeServiceInterface {
  private mediaQuery: MediaQueryList | null = null;
  private mediaHandler: (() => void) | null = null;

  constructor(private readonly model: ThemeModelService) {}

  bootstrap = (): Effect.Effect<void> =>
    Effect.sync(() => {
      const stored = localStorage.getItem(STORAGE_KEY);
      const theme: Theme =
        stored === 'light' || stored === 'dark' || stored === 'system'
          ? stored
          : 'system';

      this.apply(theme, false);
    });

  setTheme = (theme: Theme): Effect.Effect<void> =>
    Effect.sync(() => {
      this.apply(theme, true);
    });

  toggle = (): Effect.Effect<void> =>
    Effect.sync(() => {
      const current = this.model.effectiveTheme$.getValue();
      const next: Theme = current === 'dark' ? 'light' : 'dark';
      this.apply(next, true);
    });

  private apply(theme: Theme, persist: boolean) {
    if (persist) {
      localStorage.setItem(STORAGE_KEY, theme);
    }
    const effective = resolveEffective(theme);
    this.model.theme$.next(theme);
    this.model.effectiveTheme$.next(effective);
    applyToDOM(effective);
    this.listenSystemChange();
  }

  private listenSystemChange() {
    if (this.mediaHandler && this.mediaQuery) {
      this.mediaQuery.removeEventListener('change', this.mediaHandler);
    }

    if (this.model.theme$.getValue() === 'system') {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.mediaHandler = () => {
        if (this.model.theme$.getValue() === 'system') {
          const effective = resolveEffective('system');
          this.model.effectiveTheme$.next(effective);
          applyToDOM(effective);
        }
      };
      this.mediaQuery.addEventListener('change', this.mediaHandler);
    }
  }
}
