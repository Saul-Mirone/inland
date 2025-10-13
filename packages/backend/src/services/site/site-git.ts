import { Effect } from 'effect'

import { GitProviderRepository } from '../../repositories/git-provider-repository'
import { SiteRepository } from '../../repositories/site-repository'
import * as ArticleService from '../article'
import * as AuthService from '../auth-service'
import {
  SiteCreationError,
  DuplicateSiteNameError,
  type CreateSiteData,
  type ImportRepoData,
} from './site-types'

export const createSite = (data: CreateSiteData) =>
  Effect.gen(function* () {
    const siteRepo = yield* SiteRepository
    const gitProvider = yield* GitProviderRepository

    try {
      // Step 1: Get user's auth access token
      const accessToken = yield* AuthService.getUserAuthToken(data.userId)

      // Step 2: Get user's platform username for template data
      const platformUser = yield* AuthService.fetchUser(accessToken)

      // Step 3: Create Git repository with Pages (always use template)
      const gitRepo = yield* gitProvider.createRepositoryWithPages(
        accessToken,
        {
          name: data.name,
          description: data.description,
          templateOwner: data.templateOwner || 'Saul-Mirone',
          templateRepo: data.templateRepo || 'inland-template-basic',
        },
        {
          siteName: data.name,
          siteDescription: data.description || `Blog site: ${data.name}`,
          siteNameSlug: data.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          siteAuthor: data.author || platformUser.username,
          platformUsername: platformUser.username,
        }
      )

      // Step 4: Save site to database
      const site = yield* siteRepo.create({
        userId: data.userId,
        name: data.name,
        gitRepo: gitRepo.fullName,
        platform: 'github',
        deployStatus: 'deployed',
        deployUrl: gitRepo.pagesUrl,
      })

      // Step 5: Import existing articles from GitHub repo
      try {
        const importResult = yield* ArticleService.importArticlesFromGit(
          site.id,
          data.userId
        )

        yield* Effect.logInfo(
          `Imported ${importResult.imported}/${importResult.total} articles for site ${site.name}`
        )
      } catch (importError) {
        // Don't fail site creation if import fails, just log the error
        yield* Effect.logError('Failed to import articles from Git repo', {
          importError,
        })
      }

      return {
        ...site,
        gitUrl: gitRepo.htmlUrl,
        pagesUrl: gitRepo.pagesUrl,
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Unique constraint')
      ) {
        return yield* new DuplicateSiteNameError({
          name: data.name,
          userId: data.userId,
        })
      }
      return yield* new SiteCreationError({
        reason: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  })

export const importRepo = (data: ImportRepoData) =>
  Effect.gen(function* () {
    const siteRepo = yield* SiteRepository
    const gitProvider = yield* GitProviderRepository

    // Step 1: Get user's auth access token
    const accessToken = yield* AuthService.getUserAuthToken(data.userId)

    // Step 2: Verify repo exists and user has access
    const repoInfo = yield* gitProvider.getRepositoryInfo(
      accessToken,
      data.gitRepoFullName
    )

    yield* Effect.logInfo(
      `Importing repository: ${data.gitRepoFullName} (branch: ${repoInfo.defaultBranch})`
    )

    // Step 3: Check Pages status
    const pagesStatus = yield* gitProvider.checkPagesStatus(
      accessToken,
      data.gitRepoFullName
    )

    yield* Effect.logInfo(
      `Pages status: ${pagesStatus.enabled ? `enabled (${pagesStatus.url})` : 'disabled'}`
    )

    // Step 4: Inject Inland workflow if requested (default: true)
    let workflowResult:
      | { filesCreated: string[]; filesSkipped: string[] }
      | undefined
    if (data.setupWorkflow !== false) {
      // Get user's platform username for template data
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

    // Step 5: Enable Pages if not already enabled and requested (default: true)
    let pagesUrl = pagesStatus.url
    if (!pagesStatus.enabled && data.enablePages !== false) {
      const [owner, repoName] = data.gitRepoFullName.split('/')
      const potentialPagesUrl = `https://${owner}.github.io/${repoName}`

      // Try to enable GitHub Pages using GitProvider
      const enablePagesEffect = Effect.gen(function* () {
        // Make a direct API call to enable Pages
        const response = yield* Effect.tryPromise({
          try: () =>
            fetch(
              `https://api.github.com/repos/${data.gitRepoFullName}/pages`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  Accept: 'application/vnd.github.v3+json',
                  'User-Agent': 'Inland-CMS/1.0',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ build_type: 'workflow' }),
              }
            ),
          catch: (error) => ({
            message: error instanceof Error ? error.message : 'Unknown error',
          }),
        })

        if (response.ok) {
          pagesUrl = potentialPagesUrl
          yield* Effect.logInfo(`Pages enabled: ${pagesUrl}`)
        }
      }).pipe(
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

    // Step 6: Create site record in database
    const site = yield* siteRepo.create({
      userId: data.userId,
      name: data.name,
      gitRepo: data.gitRepoFullName,
      platform: data.platform || 'github',
      deployStatus: pagesUrl ? 'deployed' : 'pending',
      deployUrl: pagesUrl,
    })

    // Step 7: Import articles from the repository
    const importResult = yield* ArticleService.importArticlesFromGit(
      site.id,
      data.userId
    ).pipe(
      Effect.catchAll((error) => {
        // Don't fail import if article import fails
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
        gitUrl: `https://github.com/${data.gitRepoFullName}`,
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
