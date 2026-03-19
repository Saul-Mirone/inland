import { Layer } from 'effect';
import { BehaviorSubject } from 'rxjs';

import {
  ArticlesModel,
  type Article,
  type ArticlesModelService,
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

// ── Articles Model ──────────────────────────────────────────────────

export const mockArticlesModel: ArticlesModelService = {
  articles$: new BehaviorSubject<Article[]>([]),
  loading$: new BehaviorSubject(false),
  error$: new BehaviorSubject<string | null>(null),
  deletingId$: new BehaviorSubject<string | null>(null),
  publishingId$: new BehaviorSubject<string | null>(null),
};

export const resetMockArticlesModel = () => {
  mockArticlesModel.articles$.next([]);
  mockArticlesModel.loading$.next(false);
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

// ── Sites Model ─────────────────────────────────────────────────────

export const mockSitesModel: SitesModelService = {
  sites$: new BehaviorSubject<SiteWithCounts[]>([]),
  loading$: new BehaviorSubject(false),
  error$: new BehaviorSubject<string | null>(null),
  pagination$: new BehaviorSubject<PaginationMeta | null>(null),
};

export const resetMockSitesModel = () => {
  mockSitesModel.sites$.next([]);
  mockSitesModel.loading$.next(false);
  mockSitesModel.error$.next(null);
  mockSitesModel.pagination$.next(null);
};

export const MockSitesModelLive = Layer.succeed(SitesModel, mockSitesModel);
