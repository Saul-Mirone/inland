import { Effect } from 'effect'

import { ArticleRepository } from '../../../repositories/article-repository'

export const findUserArticles = (userId: string) =>
  Effect.gen(function* () {
    const articleRepo = yield* ArticleRepository

    const articles = yield* articleRepo.findByUserId(userId)
    return articles
  })
