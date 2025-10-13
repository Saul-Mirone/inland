import { Effect } from 'effect'

import { ArticleRepository } from '../../../repositories/article-repository'
import { ArticleNotFoundError } from '../article-types'

export const findArticleById = (articleId: string) =>
  Effect.gen(function* () {
    const articleRepo = yield* ArticleRepository

    const article = yield* articleRepo.findById(articleId)

    if (!article) {
      return yield* new ArticleNotFoundError({ articleId })
    }

    return article
  })
