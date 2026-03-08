import { Effect } from 'effect'

import type { PaginationOptions } from '../../../repositories/pagination'

import { ArticleRepository } from '../../../repositories/article-repository'

export const findUserArticles = (
  userId: string,
  pagination?: PaginationOptions
) =>
  Effect.gen(function* () {
    const articleRepo = yield* ArticleRepository
    return yield* articleRepo.findByUserId(userId, pagination)
  })
