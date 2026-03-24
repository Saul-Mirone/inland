import { Effect } from 'effect';
import { toast } from 'sonner';

import type {
  Article,
  ArticlesModelService,
  EditingState,
} from '@/model/articles-model';
import type { ApiClientService, ApiError } from '@/services/api';
import type { NavigationServiceInterface } from '@/services/navigation';

import { pushServiceError } from '@/services/shared/push-error';

import type {
  ArticleServiceInterface,
  CreateArticleData,
  UpdateArticleData,
} from './article-service';

interface FetchArticlesResponse {
  articles: Article[];
}

interface DeleteArticleResponse {
  hasGitHubRepo?: boolean;
  gitHubDeleted?: boolean;
  gitHubError?: string;
}

interface PublishArticleResponse {
  wasUpdate?: boolean;
  filePath?: string;
}

export class ArticleServiceImpl implements ArticleServiceInterface {
  constructor(
    private readonly model: ArticlesModelService,
    private readonly api: ApiClientService,
    private readonly nav: NavigationServiceInterface
  ) {}

  private pushError(error: ApiError): void {
    pushServiceError(this.model, this.nav, error);
  }

  openArticle = (id: string): Effect.Effect<void> =>
    Effect.gen(this, function* () {
      this.model.articleLoading$.next(true);
      this.model.error$.next(null);

      const data = yield* this.api.get<{ article: Article }>(`/articles/${id}`);

      this.model.currentArticle$.next(data.article);
      this.model.editing$.next({
        title: data.article.title,
        slug: data.article.slug,
        content: data.article.content,
        status: data.article.status,
        saving: false,
      });
      this.model.articleLoading$.next(false);
    }).pipe(
      Effect.catchAll((error) => Effect.sync(() => this.pushError(error)))
    );

  updateEditField = <K extends keyof EditingState>(
    field: K,
    value: EditingState[K]
  ): Effect.Effect<void> =>
    Effect.sync(() => {
      const current = this.model.editing$.getValue();
      this.model.editing$.next({ ...current, [field]: value });
    });

  saveCurrentArticle = (): Effect.Effect<void> =>
    Effect.gen(this, function* () {
      const article = this.model.currentArticle$.getValue();
      if (!article) return;

      const editing = this.model.editing$.getValue();
      this.model.editing$.next({ ...editing, saving: true });

      yield* this.api.put(`/articles/${article.id}`, {
        siteId: article.siteId,
        title: editing.title,
        slug: editing.slug,
        content: editing.content,
        status: editing.status,
      });

      this.model.articles$.next(
        this.model.articles$.getValue().map((a) =>
          a.id === article.id
            ? {
                ...a,
                title: editing.title,
                slug: editing.slug,
                status: editing.status,
              }
            : a
        )
      );

      const current = this.model.editing$.getValue();
      this.model.editing$.next({ ...current, saving: false });
    }).pipe(
      Effect.catchAll((error) => Effect.sync(() => this.pushError(error)))
    );

  deleteCurrentArticle = (): Effect.Effect<void> =>
    Effect.gen(this, function* () {
      const article = this.model.currentArticle$.getValue();
      if (!article) return;
      yield* this.deleteArticle(article.id);
      this.model.currentArticle$.next(null);
    });

  publishCurrentArticle = (): Effect.Effect<void> =>
    Effect.gen(this, function* () {
      const article = this.model.currentArticle$.getValue();
      if (!article) return;
      yield* this.publishArticle(article.id);
      this.model.editing$.next({
        ...this.model.editing$.getValue(),
        status: 'published',
      });
    });

  quickCreate = (siteId: string): Effect.Effect<string> =>
    Effect.gen(this, function* () {
      const existing = this.model.articles$.getValue();
      const untitledCount = existing.filter((a) =>
        a.title.startsWith('Untitled')
      ).length;
      const title =
        untitledCount === 0 ? 'Untitled' : `Untitled ${untitledCount + 1}`;

      const result = yield* this.api.post<{ article: Article }>('/articles', {
        siteId,
        title,
        content: '',
        status: 'draft' as const,
      });

      this.model.articles$.next([
        result.article,
        ...this.model.articles$.getValue(),
      ]);

      return result.article.id;
    }).pipe(
      Effect.catchAll((error) =>
        Effect.sync(() => {
          this.pushError(error);
          return '';
        })
      )
    );

  fetchArticles = (siteId?: string): Effect.Effect<void> =>
    Effect.gen(this, function* () {
      this.model.loading$.next(true);
      this.model.error$.next(null);

      const path = siteId ? `/sites/${siteId}/articles` : '/articles';
      const data = yield* this.api.get<FetchArticlesResponse>(path);

      this.model.articles$.next(data.articles);
      this.model.loading$.next(false);
    }).pipe(
      Effect.catchAll((error) => Effect.sync(() => this.pushError(error)))
    );

  createArticle = (data: CreateArticleData): Effect.Effect<void> =>
    Effect.gen(this, function* () {
      yield* this.api.post('/articles', data);
      yield* this.fetchArticles();
    }).pipe(
      Effect.catchAll((error) => Effect.sync(() => this.pushError(error)))
    );

  updateArticle = (id: string, data: UpdateArticleData): Effect.Effect<void> =>
    Effect.gen(this, function* () {
      yield* this.api.put(`/articles/${id}`, data);
      yield* this.fetchArticles();
    }).pipe(
      Effect.catchAll((error) => Effect.sync(() => this.pushError(error)))
    );

  deleteArticle = (id: string): Effect.Effect<void> =>
    Effect.gen(this, function* () {
      this.model.deletingId$.next(id);

      const currentArticles = this.model.articles$.getValue();
      this.model.articles$.next(currentArticles.filter((a) => a.id !== id));

      const result = yield* this.api.del<DeleteArticleResponse>(
        `/articles/${id}`
      );

      let message = 'Article deleted successfully from database';
      if (result.hasGitHubRepo) {
        if (result.gitHubDeleted) {
          message += ' and GitHub repository';
        } else if (result.gitHubError) {
          message += `, but failed to delete from GitHub: ${result.gitHubError}`;
        } else {
          message += ', file was not found in GitHub repository';
        }
      }
      toast.success(message);
    }).pipe(
      Effect.catchAll((error) =>
        Effect.gen(this, function* () {
          this.pushError(error);
          yield* this.fetchArticles();
        })
      ),
      Effect.ensuring(Effect.sync(() => this.model.deletingId$.next(null)))
    );

  publishArticle = (id: string): Effect.Effect<void> =>
    Effect.gen(this, function* () {
      this.model.publishingId$.next(id);

      const result = yield* this.api.post<PublishArticleResponse>(
        `/articles/${id}/publish`
      );

      this.model.articles$.next(
        this.model.articles$
          .getValue()
          .map((a) =>
            a.id === id ? { ...a, status: 'published' as const } : a
          )
      );

      const action = result.wasUpdate ? 'updated' : 'published';
      toast.success(
        `Article ${action} successfully!${result.filePath ? ` File: ${result.filePath}` : ''}`
      );
    }).pipe(
      Effect.catchAll((error) => Effect.sync(() => this.pushError(error))),
      Effect.ensuring(Effect.sync(() => this.model.publishingId$.next(null)))
    );
}
