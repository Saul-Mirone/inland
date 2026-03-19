import { Effect } from 'effect';

import {
  ArticleRepository,
  type ArticleCreateData,
} from '../../../repositories/article-repository';
import { isUniqueConstraintError } from '../../../repositories/repository-error';
import { SiteRepository } from '../../../repositories/site-repository';
import { SiteAccessDeniedError } from '../../site/site-types';
import {
  ArticleCreationError,
  DuplicateSlugError,
  type CreateArticleData,
} from '../article-types';

export const createArticle = (userId: string, data: CreateArticleData) =>
  Effect.gen(function* () {
    const siteRepo = yield* SiteRepository;
    const articleRepo = yield* ArticleRepository;

    const site = yield* siteRepo.findByIdWithUserId(data.siteId);

    if (!site) {
      return yield* new SiteAccessDeniedError({
        siteId: data.siteId,
        userId,
      });
    }

    if (site.userId !== userId) {
      return yield* new SiteAccessDeniedError({
        siteId: data.siteId,
        userId,
      });
    }

    const repoData: ArticleCreateData = {
      siteId: data.siteId,
      title: data.title,
      slug: data.slug,
      content: data.content,
      status: data.status ?? 'draft',
    };
    const article = yield* articleRepo.create(repoData).pipe(
      Effect.catchTag(
        'RepositoryError',
        (
          error
        ): Effect.Effect<never, DuplicateSlugError | ArticleCreationError> =>
          isUniqueConstraintError(error)
            ? Effect.fail(
                new DuplicateSlugError({
                  slug: data.slug,
                  siteId: data.siteId,
                })
              )
            : Effect.fail(
                new ArticleCreationError({
                  reason:
                    error.cause instanceof Error
                      ? error.cause.message
                      : 'Unknown error',
                })
              )
      )
    );
    return article;
  });
