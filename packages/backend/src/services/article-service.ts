import { Context, type Effect } from 'effect'

import type {
  ArticleWithSite,
  ArticleRepository,
} from '../repositories/article-repository'
import type {
  AuthProviderRepositoryService,
  AuthProviderAPIError,
} from '../repositories/auth-provider-repository'
import type {
  GitProviderError,
  GitProviderRepositoryService,
} from '../repositories/git-provider-repository'
import type { RepositoryError } from '../repositories/repository-error'
import type { SiteRepository } from '../repositories/site-repository'
import type { UserRepositoryService } from '../repositories/user-repository'
import type {
  SiteAccessError,
  GitRepositoryError,
} from './article/article-types'
import type { AuthTokenError } from './auth-service'
import type { DatabaseService } from './database-service'

// Article service interface for dependency injection
export interface ArticleServiceInterface {
  readonly importArticlesFromGit: (
    siteId: string,
    userId: string
  ) => Effect.Effect<
    {
      imported: number
      total: number
      articles: ArticleWithSite[]
    },
    | SiteAccessError
    | GitRepositoryError
    | AuthTokenError
    | AuthProviderAPIError
    | GitProviderError
    | RepositoryError,
    | DatabaseService
    | GitProviderRepositoryService
    | ArticleRepository
    | SiteRepository
    | UserRepositoryService
    | AuthProviderRepositoryService
  >
}

// Context tag for dependency injection
export const ArticleService = Context.GenericTag<ArticleServiceInterface>(
  '@services/ArticleService'
)
