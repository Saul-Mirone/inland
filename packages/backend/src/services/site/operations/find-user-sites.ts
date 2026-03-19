import { Effect } from 'effect';

import type { PaginationOptions } from '../../../repositories/pagination';

import { SiteRepository } from '../../../repositories/site-repository';

export const findUserSites = (userId: string, pagination?: PaginationOptions) =>
  Effect.gen(function* () {
    const siteRepo = yield* SiteRepository;
    return yield* siteRepo.findByUserIdWithCounts(userId, pagination);
  });
