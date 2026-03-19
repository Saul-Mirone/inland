import { Effect } from 'effect';

import { ArticleRepository } from '../../../repositories/article-repository';
import {
  ArticleNotFoundError,
  ArticleAccessDeniedError,
} from '../article-types';

export const findArticleById = (articleId: string, userId: string) =>
  Effect.gen(function* () {
    const articleRepo = yield* ArticleRepository;

    const article = yield* articleRepo.findById(articleId);

    if (!article) {
      return yield* new ArticleNotFoundError({ articleId });
    }

    if (article.site.userId !== userId) {
      return yield* new ArticleAccessDeniedError({ articleId, userId });
    }

    return article;
  });
