import { Effect, Layer } from 'effect';

import {
  ArticleService,
  type ArticleServiceInterface,
} from '../../services/article/article-service';

const notImplemented = (name: string) => () =>
  Effect.die(new Error(`MockArticleService.${name} not implemented`));

// Mock implementation for testing
export const makeMockArticleService = (): ArticleServiceInterface => ({
  createArticle: notImplemented('createArticle'),
  deleteArticle: notImplemented('deleteArticle'),
  findArticleById: notImplemented('findArticleById'),
  findSiteArticles: notImplemented('findSiteArticles'),
  findUserArticles: notImplemented('findUserArticles'),
  updateArticle: notImplemented('updateArticle'),
  deleteArticleFromGit: notImplemented('deleteArticleFromGit'),
  importArticlesFromGit: () =>
    Effect.succeed({
      imported: 2,
      total: 3,
      articles: [],
    }),
  publishArticleToGit: notImplemented('publishArticleToGit'),
  syncArticlesFromGit: () =>
    Effect.succeed({
      created: 1,
      updated: 0,
      markedDraft: 0,
      unchanged: 1,
      total: 2,
    }),
  validateTitle: notImplemented('validateTitle'),
  validateSlug: notImplemented('validateSlug'),
  generateSlugFromTitle: notImplemented('generateSlugFromTitle'),
});

// Mock layer for testing
export const MockArticleServiceLive = Layer.succeed(
  ArticleService,
  makeMockArticleService()
);
