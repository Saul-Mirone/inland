import { Layer } from 'effect';
import { BehaviorSubject } from 'rxjs';

import {
  ArticlesModel,
  type Article,
  type ArticlesModelService,
  type EditingState,
} from '@/model/articles-model';
import {
  AuthModel,
  type AuthModelService,
  type AuthState,
} from '@/model/auth-model';
import {
  SitesModel,
  type PaginationMeta,
  type SitesModelService,
  type SiteWithCounts,
} from '@/model/sites-model';
import {
  ThemeModel,
  type EffectiveTheme,
  type Theme,
  type ThemeModelService,
} from '@/model/theme-model';

// ── Articles Model ──────────────────────────────────────────────────

export const mockArticlesModel: ArticlesModelService = {
  articles$: new BehaviorSubject<Article[]>([]),
  currentArticle$: new BehaviorSubject<Article | null>(null),
  editing$: new BehaviorSubject<EditingState>({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    tags: '',
    status: 'draft',
    saving: false,
  }),
  loading$: new BehaviorSubject(false),
  articleLoading$: new BehaviorSubject(false),
  error$: new BehaviorSubject<string | null>(null),
  deletingId$: new BehaviorSubject<string | null>(null),
  publishingId$: new BehaviorSubject<string | null>(null),
};

export const resetMockArticlesModel = () => {
  mockArticlesModel.articles$.next([]);
  mockArticlesModel.currentArticle$.next(null);
  mockArticlesModel.editing$.next({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    tags: '',
    status: 'draft',
    saving: false,
  });
  mockArticlesModel.loading$.next(false);
  mockArticlesModel.articleLoading$.next(false);
  mockArticlesModel.error$.next(null);
  mockArticlesModel.deletingId$.next(null);
  mockArticlesModel.publishingId$.next(null);
};

export const MockArticlesModelLive = Layer.succeed(
  ArticlesModel,
  mockArticlesModel
);

// ── Auth Model ──────────────────────────────────────────────────────

export const mockAuthModel: AuthModelService = {
  authState$: new BehaviorSubject<AuthState>({
    status: 'loading',
    user: null,
    error: null,
  }),
};

export const resetMockAuthModel = () => {
  mockAuthModel.authState$.next({
    status: 'loading',
    user: null,
    error: null,
  });
};

export const MockAuthModelLive = Layer.succeed(AuthModel, mockAuthModel);

// ── Theme Model ─────────────────────────────────────────────────────

export const mockThemeModel: ThemeModelService = {
  theme$: new BehaviorSubject<Theme>('system'),
  effectiveTheme$: new BehaviorSubject<EffectiveTheme>('light'),
};

export const resetMockThemeModel = () => {
  mockThemeModel.theme$.next('system');
  mockThemeModel.effectiveTheme$.next('light');
};

export const MockThemeModelLive = Layer.succeed(ThemeModel, mockThemeModel);

// ── Sites Model ─────────────────────────────────────────────────────

export const mockSitesModel: SitesModelService = {
  sites$: new BehaviorSubject<SiteWithCounts[]>([]),
  selectedSiteId$: new BehaviorSubject<string | null>(null),
  loading$: new BehaviorSubject(false),
  error$: new BehaviorSubject<string | null>(null),
  pagination$: new BehaviorSubject<PaginationMeta | null>(null),
};

export const resetMockSitesModel = () => {
  mockSitesModel.sites$.next([]);
  mockSitesModel.selectedSiteId$.next(null);
  mockSitesModel.loading$.next(false);
  mockSitesModel.error$.next(null);
  mockSitesModel.pagination$.next(null);
};

export const MockSitesModelLive = Layer.succeed(SitesModel, mockSitesModel);
