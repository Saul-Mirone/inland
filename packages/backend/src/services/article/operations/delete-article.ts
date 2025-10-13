import { Effect } from 'effect'

import { ArticleRepository } from '../../../repositories/article-repository'
import {
  ArticleNotFoundError,
  ArticleAccessDeniedError,
} from '../article-types'
import * as ArticleGit from '../git'

export const deleteArticle = (articleId: string, userId: string) =>
  Effect.gen(function* () {
    const articleRepo = yield* ArticleRepository

    const existingArticle = yield* articleRepo.findById(articleId)

    if (!existingArticle) {
      return yield* new ArticleNotFoundError({ articleId })
    }

    if (existingArticle.site.userId !== userId) {
      return yield* new ArticleAccessDeniedError({ articleId, userId })
    }

    const article = yield* articleRepo.delete(articleId)

    let gitDeleted = false
    let gitError: string | null = null
    const hasGitRepo = Boolean(existingArticle.site.gitRepo)

    if (hasGitRepo && existingArticle.status === 'published') {
      try {
        const gitDeleteResult = yield* ArticleGit.deleteArticleFromGit(
          existingArticle.id,
          userId
        )
        gitDeleted = gitDeleteResult.deleted
        if (!gitDeleteResult.deleted && gitDeleteResult.reason) {
          gitError = gitDeleteResult.reason
        }
      } catch (error) {
        gitError = error instanceof Error ? error.message : 'Unknown Git error'
        yield* Effect.logError('Failed to delete article from Git repository', {
          error,
          articleId,
          userId,
        })
      }
    }

    return {
      article: {
        id: article.id,
        siteId: article.siteId,
        title: article.title,
        slug: article.slug,
        content: article.content,
        status: article.status,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
      },
      gitDeleted,
      gitError,
      hasGitRepo,
    }
  })
