import { Effect } from 'effect';

import type { CreateGitIntegrationData } from '../user-types';

import { UserRepository } from '../../../repositories/user-repository';

export const upsertGitIntegration = (data: CreateGitIntegrationData) =>
  Effect.gen(function* () {
    const userRepo = yield* UserRepository;
    return yield* userRepo.upsertGitIntegration(data);
  });
