import { Effect } from 'effect'
import { toast } from 'sonner'

import type { Article, ArticlesModelService } from '@/model/articles-model'
import type { ApiClientService, ApiError } from '@/services/api'
import type { NavigationServiceInterface } from '@/services/navigation'

import { pushServiceError } from '@/services/shared/push-error'

import type {
  ArticleServiceInterface,
  CreateArticleData,
  UpdateArticleData,
} from './article-service'

interface FetchArticlesResponse {
  articles: Article[]
}

interface DeleteArticleResponse {
  hasGitHubRepo?: boolean
  gitHubDeleted?: boolean
  gitHubError?: string
}

interface PublishArticleResponse {
  wasUpdate?: boolean
  filePath?: string
}

export class ArticleServiceImpl implements ArticleServiceInterface {
  constructor(
    private readonly model: ArticlesModelService,
    private readonly api: ApiClientService,
    private readonly nav: NavigationServiceInterface
  ) {}

  private pushError(error: ApiError): void {
    pushServiceError(this.model, this.nav, error)
  }

  fetchArticles = (siteId?: string): Effect.Effect<void> =>
    Effect.gen(this, function* () {
      this.model.loading$.next(true)
      this.model.error$.next(null)

      const path = siteId ? `/sites/${siteId}/articles` : '/articles'
      const data = yield* this.api.get<FetchArticlesResponse>(path)

      this.model.articles$.next(data.articles)
      this.model.loading$.next(false)
    }).pipe(
      Effect.catchAll((error) => Effect.sync(() => this.pushError(error)))
    )

  createArticle = (data: CreateArticleData): Effect.Effect<void> =>
    Effect.gen(this, function* () {
      yield* this.api.post('/articles', data)
      yield* this.fetchArticles()
    }).pipe(
      Effect.catchAll((error) => Effect.sync(() => this.pushError(error)))
    )

  updateArticle = (id: string, data: UpdateArticleData): Effect.Effect<void> =>
    Effect.gen(this, function* () {
      yield* this.api.put(`/articles/${id}`, data)
      yield* this.fetchArticles()
    }).pipe(
      Effect.catchAll((error) => Effect.sync(() => this.pushError(error)))
    )

  deleteArticle = (id: string): Effect.Effect<void> =>
    Effect.gen(this, function* () {
      this.model.deletingId$.next(id)

      const currentArticles = this.model.articles$.getValue()
      this.model.articles$.next(currentArticles.filter((a) => a.id !== id))

      const result = yield* this.api.del<DeleteArticleResponse>(
        `/articles/${id}`
      )

      let message = 'Article deleted successfully from database'
      if (result.hasGitHubRepo) {
        if (result.gitHubDeleted) {
          message += ' and GitHub repository'
        } else if (result.gitHubError) {
          message += `, but failed to delete from GitHub: ${result.gitHubError}`
        } else {
          message += ', file was not found in GitHub repository'
        }
      }
      toast.success(message)
    }).pipe(
      Effect.catchAll((error) =>
        Effect.gen(this, function* () {
          this.pushError(error)
          yield* this.fetchArticles()
        })
      ),
      Effect.ensuring(Effect.sync(() => this.model.deletingId$.next(null)))
    )

  publishArticle = (id: string): Effect.Effect<void> =>
    Effect.gen(this, function* () {
      this.model.publishingId$.next(id)

      const result = yield* this.api.post<PublishArticleResponse>(
        `/articles/${id}/publish`
      )

      this.model.articles$.next(
        this.model.articles$
          .getValue()
          .map((a) =>
            a.id === id ? { ...a, status: 'published' as const } : a
          )
      )

      const action = result.wasUpdate ? 'updated' : 'published'
      toast.success(
        `Article ${action} successfully!${result.filePath ? ` File: ${result.filePath}` : ''}`
      )
    }).pipe(
      Effect.catchAll((error) => Effect.sync(() => this.pushError(error))),
      Effect.ensuring(Effect.sync(() => this.model.publishingId$.next(null)))
    )
}
