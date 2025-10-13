import { Layer } from 'effect'

import { importArticlesFromGit } from '../article'
import {
  ArticleService,
  type ArticleServiceInterface,
} from '../article-service'

// Implementation that wraps the existing article module functions
export const makeArticleService = (): ArticleServiceInterface => ({
  importArticlesFromGit,
})

// Layer that provides the ArticleService implementation
export const ArticleServiceLive = Layer.succeed(
  ArticleService,
  makeArticleService()
)
