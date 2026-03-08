import { Context } from 'effect'

import type {
  validateTitle,
  validateSlug,
  generateSlugFromTitle,
} from './article-validation'
import type { deleteArticleFromGit } from './git/delete-article-from-git'
import type { importArticlesFromGit } from './git/import-articles-from-git'
import type { publishArticleToGit } from './git/publish-article-to-git'
import type { createArticle } from './operations/create-article'
import type { deleteArticle } from './operations/delete-article'
import type { findArticleById } from './operations/find-article-by-id'
import type { findSiteArticles } from './operations/find-site-articles'
import type { findUserArticles } from './operations/find-user-articles'
import type { updateArticle } from './operations/update-article'

export interface ArticleServiceInterface {
  readonly createArticle: typeof createArticle
  readonly deleteArticle: typeof deleteArticle
  readonly findArticleById: typeof findArticleById
  readonly findSiteArticles: typeof findSiteArticles
  readonly findUserArticles: typeof findUserArticles
  readonly updateArticle: typeof updateArticle
  readonly deleteArticleFromGit: typeof deleteArticleFromGit
  readonly importArticlesFromGit: typeof importArticlesFromGit
  readonly publishArticleToGit: typeof publishArticleToGit
  readonly validateTitle: typeof validateTitle
  readonly validateSlug: typeof validateSlug
  readonly generateSlugFromTitle: typeof generateSlugFromTitle
}

export class ArticleService extends Context.Tag('ArticleService')<
  ArticleService,
  ArticleServiceInterface
>() {}
