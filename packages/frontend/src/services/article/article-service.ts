import type { Effect } from 'effect';

import { Context } from 'effect';

import type { EditingState } from '@/model/articles-model';

export interface ArticleData {
  siteId: string;
  title: string;
  slug?: string;
  content: string;
  excerpt?: string;
  tags?: string;
  status: 'draft' | 'published';
}

export type CreateArticleData = ArticleData;
export type UpdateArticleData = ArticleData;

export interface ArticleServiceInterface {
  readonly clearArticles: () => Effect.Effect<void>;
  readonly fetchArticles: (siteId?: string) => Effect.Effect<void>;
  readonly openArticle: (id: string) => Effect.Effect<void>;
  readonly refreshCurrentArticle: () => Effect.Effect<void>;
  readonly quickCreate: (siteId: string) => Effect.Effect<string>;
  readonly createArticle: (data: CreateArticleData) => Effect.Effect<void>;
  readonly updateEditField: <K extends keyof EditingState>(
    field: K,
    value: EditingState[K]
  ) => Effect.Effect<void>;
  readonly saveCurrentArticle: () => Effect.Effect<void>;
  readonly updateArticle: (
    id: string,
    data: UpdateArticleData
  ) => Effect.Effect<void>;
  readonly deleteCurrentArticle: () => Effect.Effect<void>;
  readonly deleteArticle: (id: string) => Effect.Effect<void>;
  readonly publishCurrentArticle: () => Effect.Effect<void>;
  readonly publishArticle: (id: string) => Effect.Effect<void>;
  readonly selectTag: (tag: string | null) => Effect.Effect<void>;
}

export class ArticleService extends Context.Tag('ArticleService')<
  ArticleService,
  ArticleServiceInterface
>() {}
