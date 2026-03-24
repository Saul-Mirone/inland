// @vitest-environment jsdom
import { Effect, ManagedRuntime } from 'effect';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeService } from '@/services/theme';

import { mockThemeModel, resetMockThemeModel } from '../helpers/mock-models';
import { ThemeTestLayer } from '../helpers/test-layers';

const testRuntime = ManagedRuntime.make(ThemeTestLayer);

// Stub matchMedia so `resolveEffective('system')` works in Node
function stubMatchMedia(prefersDark: boolean) {
  const listeners: Array<(e: { matches: boolean }) => void> = [];
  const mql = {
    matches: prefersDark,
    addEventListener: vi.fn(
      (_: string, cb: (e: { matches: boolean }) => void) => {
        listeners.push(cb);
      }
    ),
    removeEventListener: vi.fn(),
  } as unknown as MediaQueryList;

  window.matchMedia = vi.fn(() => mql);
  return { mql, listeners };
}

describe('ThemeService', () => {
  beforeEach(() => {
    resetMockThemeModel();
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    stubMatchMedia(false);
  });

  describe('bootstrap', () => {
    it('should default to system theme when nothing stored', async () => {
      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ThemeService;
          yield* service.bootstrap();
        })
      );

      expect(mockThemeModel.theme$.getValue()).toBe('system');
    });

    it('should restore a stored theme', async () => {
      localStorage.setItem('inland-theme', 'dark');

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ThemeService;
          yield* service.bootstrap();
        })
      );

      expect(mockThemeModel.theme$.getValue()).toBe('dark');
      expect(mockThemeModel.effectiveTheme$.getValue()).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should ignore invalid stored values', async () => {
      localStorage.setItem('inland-theme', 'invalid');

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ThemeService;
          yield* service.bootstrap();
        })
      );

      expect(mockThemeModel.theme$.getValue()).toBe('system');
    });

    it('should not persist theme to localStorage', async () => {
      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ThemeService;
          yield* service.bootstrap();
        })
      );

      expect(localStorage.getItem('inland-theme')).toBeNull();
    });

    it('should resolve system theme to dark when OS prefers dark', async () => {
      stubMatchMedia(true);

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ThemeService;
          yield* service.bootstrap();
        })
      );

      expect(mockThemeModel.effectiveTheme$.getValue()).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('setTheme', () => {
    it('should apply the theme and persist to localStorage', async () => {
      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ThemeService;
          yield* service.setTheme('dark');
        })
      );

      expect(mockThemeModel.theme$.getValue()).toBe('dark');
      expect(mockThemeModel.effectiveTheme$.getValue()).toBe('dark');
      expect(localStorage.getItem('inland-theme')).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove dark class when set to light', async () => {
      document.documentElement.classList.add('dark');

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ThemeService;
          yield* service.setTheme('light');
        })
      );

      expect(mockThemeModel.effectiveTheme$.getValue()).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should resolve system theme using matchMedia', async () => {
      stubMatchMedia(true);

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ThemeService;
          yield* service.setTheme('system');
        })
      );

      expect(mockThemeModel.theme$.getValue()).toBe('system');
      expect(mockThemeModel.effectiveTheme$.getValue()).toBe('dark');
    });
  });

  describe('toggle', () => {
    it('should toggle from light to dark', async () => {
      mockThemeModel.effectiveTheme$.next('light');

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ThemeService;
          yield* service.toggle();
        })
      );

      expect(mockThemeModel.theme$.getValue()).toBe('dark');
      expect(mockThemeModel.effectiveTheme$.getValue()).toBe('dark');
      expect(localStorage.getItem('inland-theme')).toBe('dark');
    });

    it('should toggle from dark to light', async () => {
      mockThemeModel.effectiveTheme$.next('dark');

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ThemeService;
          yield* service.toggle();
        })
      );

      expect(mockThemeModel.theme$.getValue()).toBe('light');
      expect(mockThemeModel.effectiveTheme$.getValue()).toBe('light');
      expect(localStorage.getItem('inland-theme')).toBe('light');
    });

    it('should toggle based on effective theme when set to system', async () => {
      stubMatchMedia(true);
      mockThemeModel.theme$.next('system');
      mockThemeModel.effectiveTheme$.next('dark');

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ThemeService;
          yield* service.toggle();
        })
      );

      expect(mockThemeModel.theme$.getValue()).toBe('light');
      expect(mockThemeModel.effectiveTheme$.getValue()).toBe('light');
    });
  });

  describe('system theme listener', () => {
    it('should register matchMedia listener when theme is system', async () => {
      const { mql } = stubMatchMedia(false);

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ThemeService;
          yield* service.setTheme('system');
        })
      );

      expect(mql.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );
    });

    it('should not register listener for explicit themes', async () => {
      const { mql } = stubMatchMedia(false);

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ThemeService;
          yield* service.setTheme('dark');
        })
      );

      expect(mql.addEventListener).not.toHaveBeenCalled();
    });

    it('should update effective theme when system preference changes', async () => {
      const { listeners } = stubMatchMedia(false);

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ThemeService;
          yield* service.setTheme('system');
        })
      );

      // Simulate OS switching to dark mode
      window.matchMedia = vi.fn(
        () =>
          ({
            matches: true,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          }) as unknown as MediaQueryList
      );
      listeners[0]({ matches: true });

      expect(mockThemeModel.effectiveTheme$.getValue()).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });
});
