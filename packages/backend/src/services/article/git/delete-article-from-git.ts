import { Effect } from 'effect'

import { ArticleRepository } from '../../../repositories/article-repository'
import { GitProviderRepository } from '../../../repositories/git-provider-repository'
import { AuthService } from '../../auth'
import {
  ArticleNotFoundError,
  ArticleAccessDeniedError,
} from '../article-types'

export const deleteArticleFromGit = (articleId: string, userId: string) =>
  Effect.gen(function* () {
    const articleRepo = yield* ArticleRepository
    const gitProvider = yield* GitProviderRepository

    const article = yield* articleRepo.findById(articleId)

    if (!article) {
      return yield* new ArticleNotFoundError({ articleId })
    }

    if (article.site.userId !== userId) {
      return yield* new ArticleAccessDeniedError({ articleId, userId })
    }

    if (!article.site.gitRepo) {
      return {
        deleted: false,
        reason: 'Site does not have a linked Git repository',
      }
    }

    const authService = yield* AuthService
    const accessToken = yield* authService.getUserAuthToken(userId)

    const result = yield* gitProvider.deleteArticleFromRepo(
      accessToken,
      article.site.gitRepo,
      article.slug
    )

    yield* Effect.logInfo(
      `Article deletion from Git repository: ${article.title} -> deleted: ${result.deleted}`
    )

    return {
      deleted: result.deleted,
      reason: result.reason,
      filePath: result.filePath,
    }
  })
