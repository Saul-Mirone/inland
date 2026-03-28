import { Effect } from 'effect';

import type { SiteConfig } from '../../../repositories/git-provider-repository';

import { GitProviderRepository } from '../../../repositories/git-provider-repository';
import { isUniqueConstraintError } from '../../../repositories/repository-error';
import { SiteRepository } from '../../../repositories/site-repository';
import { AuthService } from '../../auth';
import {
  SiteNotFoundError,
  SiteUpdateError,
  SiteAccessDeniedError,
  DuplicateSiteNameError,
  type UpdateSiteData,
} from '../site-types';
import { validateSiteName, validateGitRepo } from '../site-validation';

const CONFIG_FIELDS: ReadonlyArray<keyof UpdateSiteData> = [
  'name',
  'displayName',
  'description',
];

export const updateSite = (
  siteId: string,
  userId: string,
  data: UpdateSiteData
) =>
  Effect.gen(function* () {
    const siteRepo = yield* SiteRepository;

    const existingSite = yield* siteRepo.findById(siteId);

    if (!existingSite) {
      return yield* new SiteNotFoundError({ siteId });
    }

    if (existingSite.userId !== userId) {
      return yield* new SiteAccessDeniedError({ siteId, userId });
    }

    const validatedData: UpdateSiteData = {
      ...(data.name !== undefined && {
        name: yield* validateSiteName(data.name),
      }),
      ...(data.displayName !== undefined && {
        displayName: data.displayName,
      }),
      ...(data.description !== undefined && {
        description: data.description,
      }),
      ...(data.gitRepo !== undefined && {
        gitRepo: yield* validateGitRepo(data.gitRepo),
      }),
      ...(data.platform !== undefined && {
        platform: data.platform,
      }),
      ...(data.deployStatus !== undefined && {
        deployStatus: data.deployStatus,
      }),
    };

    const updatedSite = yield* siteRepo.update(siteId, validatedData).pipe(
      Effect.catchTag(
        'RepositoryError',
        (
          error
        ): Effect.Effect<never, DuplicateSiteNameError | SiteUpdateError> =>
          isUniqueConstraintError(error)
            ? Effect.fail(
                new DuplicateSiteNameError({
                  name: data.name ?? '',
                  userId,
                })
              )
            : Effect.fail(
                new SiteUpdateError({
                  reason:
                    error.cause instanceof Error
                      ? error.cause.message
                      : 'Update failed',
                })
              )
      )
    );

    const shouldPushConfig = CONFIG_FIELDS.some(
      (field) => data[field] !== undefined
    );

    if (shouldPushConfig && updatedSite.gitRepo) {
      yield* pushSiteConfigToRepo(userId, updatedSite).pipe(
        Effect.catchAll((error) =>
          Effect.logError('Failed to push site config to repository', { error })
        )
      );
    }

    return updatedSite;
  });

const pushSiteConfigToRepo = (
  userId: string,
  site: {
    gitRepo: string | null;
    name: string;
    displayName: string | null;
    description: string | null;
  }
) =>
  Effect.gen(function* () {
    if (!site.gitRepo) return;

    const authService = yield* AuthService;
    const gitProvider = yield* GitProviderRepository;

    const accessToken = yield* authService.getUserAuthToken(userId);
    const platformUser = yield* authService.fetchUser(accessToken);

    const [owner, repoName] = site.gitRepo.split('/');
    const config: SiteConfig = {
      name: site.displayName ?? site.name,
      description: site.description ?? '',
      url: `https://${owner}.github.io/${repoName}`,
      author: platformUser.displayName ?? platformUser.username,
      avatarUrl: `https://github.com/${platformUser.username}.png`,
      authorUrl: `https://github.com/${platformUser.username}`,
    };

    yield* gitProvider.pushSiteConfig(accessToken, site.gitRepo, config);
  });
