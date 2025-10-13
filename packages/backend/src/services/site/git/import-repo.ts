import { Effect } from 'effect'

import { GitProviderRepository } from '../../../repositories/git-provider-repository'
import { SiteRepository } from '../../../repositories/site-repository'
import { ArticleService } from '../../article-service'
import * as AuthService from '../../auth-service'
import { DuplicateSiteNameError, type ImportRepoData } from '../site-types'

export const importRepo = (data: ImportRepoData) =>
  Effect.gen(function* () {
    const siteRepo = yield* SiteRepository
    const gitProvider = yield* GitProviderRepository

    const accessToken = yield* AuthService.getUserAuthToken(data.userId)

    const repoInfo = yield* gitProvider.getRepositoryInfo(
      accessToken,
      data.gitRepoFullName
    )

    yield* Effect.logInfo(
      `Importing repository: ${data.gitRepoFullName} (branch: ${repoInfo.defaultBranch})`
    )

    const pagesStatus = yield* gitProvider.checkPagesStatus(
      accessToken,
      data.gitRepoFullName
    )

    yield* Effect.logInfo(
      `Pages status: ${pagesStatus.enabled ? `enabled (${pagesStatus.url})` : 'disabled'}`
    )

    let workflowResult:
      | { filesCreated: string[]; filesSkipped: string[] }
      | undefined
    if (data.setupWorkflow !== false) {
      const platformUser = yield* AuthService.fetchUser(accessToken)

      workflowResult = yield* gitProvider.injectInlandWorkflow(
        accessToken,
        data.gitRepoFullName,
        {
          siteName: data.name,
          siteDescription: data.description || `Blog site: ${data.name}`,
          siteNameSlug: data.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          siteAuthor: platformUser.username,
          platformUsername: platformUser.username,
        },
        { overrideExistingFiles: data.overrideExistingFiles }
      )

      yield* Effect.logInfo(
        `Workflow injection: ${workflowResult.filesCreated.length} files created, ${workflowResult.filesSkipped.length} files skipped`
      )
    }

    let pagesUrl = pagesStatus.url
    if (!pagesStatus.enabled && data.enablePages !== false) {
      const enablePagesEffect = gitProvider
        .enablePages(accessToken, data.gitRepoFullName)
        .pipe(
          Effect.tap((url) =>
            Effect.gen(function* () {
              pagesUrl = url
              yield* Effect.logInfo(`Pages enabled: ${pagesUrl}`)
            })
          ),
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              yield* Effect.logInfo(
                'Failed to enable Pages (may already be enabled or not supported), continuing anyway'
              )
              yield* Effect.logDebug('Pages enable error:', { error })
              return Effect.succeed(undefined)
            })
          )
        )

      yield* enablePagesEffect
    }

    const site = yield* siteRepo.create({
      userId: data.userId,
      name: data.name,
      gitRepo: data.gitRepoFullName,
      platform: data.platform || 'github',
      deployStatus: pagesUrl ? 'deployed' : 'pending',
      deployUrl: pagesUrl,
    })

    const articleService = yield* ArticleService
    const importResult = yield* articleService
      .importArticlesFromGit(site.id, data.userId)
      .pipe(
        Effect.catchAll((error) => {
          Effect.logError('Failed to import articles', { error }).pipe(
            Effect.runSync
          )
          return Effect.succeed({ imported: 0, total: 0, articles: [] })
        })
      )

    yield* Effect.logInfo(
      `Imported ${importResult.imported}/${importResult.total} articles for site ${site.name}`
    )

    return {
      site: {
        ...site,
        gitUrl: repoInfo.htmlUrl,
        pagesUrl,
      },
      pagesConfigured: !!pagesUrl,
      workflowInjected: data.setupWorkflow !== false,
      filesCreated: workflowResult?.filesCreated || [],
      filesSkipped: workflowResult?.filesSkipped || [],
      articlesImported: importResult.imported,
      totalArticles: importResult.total,
    }
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        if (
          error instanceof Error &&
          error.message.includes('Unique constraint')
        ) {
          return yield* new DuplicateSiteNameError({
            name: data.name,
            userId: data.userId,
          })
        }
        return yield* Effect.fail(error)
      })
    )
  )
