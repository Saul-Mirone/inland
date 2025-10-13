import { Effect, Layer } from 'effect'

import {
  ArticleService,
  type ArticleServiceInterface,
} from '../../services/article-service'

// Mock implementation for testing
export const makeMockArticleService = (): ArticleServiceInterface => ({
  importArticlesFromGit: (_siteId: string, _userId: string) =>
    Effect.succeed({
      imported: 2,
      total: 3,
      articles: [],
    }),
})

// Mock layer for testing
export const MockArticleServiceLive = Layer.succeed(
  ArticleService,
  makeMockArticleService()
)
