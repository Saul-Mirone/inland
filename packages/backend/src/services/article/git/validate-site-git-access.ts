import { Effect } from 'effect';

import { SiteRepository } from '../../../repositories/site-repository';
import { AuthService } from '../../auth';
import { SiteAccessDeniedError } from '../../site/site-types';
import { GitRepositoryError } from '../article-types';

export const validateSiteGitAccess = (siteId: string, userId: string) =>
  Effect.gen(function* () {
    const siteRepo = yield* SiteRepository;
    const site = yield* siteRepo.findByIdWithDetails(siteId);

    if (!site) {
      return yield* new SiteAccessDeniedError({ siteId, userId });
    }

    if (site.userId !== userId) {
      return yield* new SiteAccessDeniedError({ siteId, userId });
    }

    if (!site.gitRepo) {
      return yield* new GitRepositoryError({
        siteId,
        message: 'Site does not have a linked Git repository',
      });
    }

    const authService = yield* AuthService;
    const accessToken = yield* authService.getUserAuthToken(userId);

    return {
      site,
      gitRepo: site.gitRepo,
      accessToken,
    };
  });
