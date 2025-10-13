import { Effect } from 'effect'

import {
  ArticleRepository,
  type ArticleCreateData,
} from '../../../repositories/article-repository'
import { GitProviderRepository } from '../../../repositories/git-provider-repository'
import { SiteRepository } from '../../../repositories/site-repository'
import * as AuthService from '../../auth-service'
import { SiteAccessError, GitRepositoryError } from '../article-types'

export const importArticlesFromGit = (siteId: string, userId: string) =>
  Effect.gen(function* () {
    const siteRepo = yield* SiteRepository
    const articleRepo = yield* ArticleRepository
    const gitProvider = yield* GitProviderRepository

    const site = yield* siteRepo.findByIdWithDetails(siteId)

    if (!site) {
      return yield* new SiteAccessError({ siteId, userId })
    }

    if (site.userId !== userId) {
      return yield* new SiteAccessError({ siteId, userId })
    }

    if (!site.gitRepo) {
      return yield* new GitRepositoryError({
        siteId,
        message: 'Site does not have a linked Git repository',
      })
    }

    const accessToken = yield* AuthService.getUserAuthToken(userId)

    const repoInfo = yield* gitProvider.getRepositoryInfo(
      accessToken,
      site.gitRepo
    )
    const defaultBranch = repoInfo.defaultBranch

    const articles = yield* gitProvider.getMarkdownFilesFromRepo(
      accessToken,
      site.gitRepo,
      defaultBranch
    )

    yield* Effect.logInfo(
      `Importing ${articles.length} articles from ${site.gitRepo}`
    )

    const importedArticles = []
    for (const articleData of articles) {
      try {
        const existingArticle = yield* articleRepo.findBySiteIdAndSlug(
          site.id,
          articleData.slug
        )

        if (existingArticle) {
          yield* Effect.logInfo(
            `Skipping existing article: ${articleData.slug}`
          )
          continue
        }

        const repoData: ArticleCreateData = {
          siteId: site.id,
          title: articleData.title,
          slug: articleData.slug,
          content: articleData.content,
          status: articleData.status,
        }
        const article = yield* articleRepo.create(repoData)

        importedArticles.push(article)
        yield* Effect.logInfo(`Imported article: ${articleData.title}`)
      } catch (error) {
        yield* Effect.logError(
          `Failed to import article ${articleData.title}:`,
          { error }
        )
      }
    }

    return {
      imported: importedArticles.length,
      total: articles.length,
      articles: importedArticles,
    }
  })
