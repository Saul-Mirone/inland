import { Effect } from 'effect';

import type { PaginationOptions } from '../../repositories/pagination';

import { MediaRepository } from '../../repositories/media-repository';
import { SiteRepository } from '../../repositories/site-repository';
import { SiteAccessDeniedError } from '../site/site-types';

export const listMedia = (
  siteId: string,
  userId: string,
  pagination?: PaginationOptions
) =>
  Effect.gen(function* () {
    const siteRepo = yield* SiteRepository;
    const site = yield* siteRepo.findByIdWithUserId(siteId);

    if (!site || site.userId !== userId) {
      return yield* new SiteAccessDeniedError({ siteId, userId });
    }

    const mediaRepo = yield* MediaRepository;
    return yield* mediaRepo.findBySiteId(siteId, pagination);
  });
