import { Effect } from 'effect';

import { UserRepository } from '../../../repositories/user-repository';

export const clearUserAuth = (userId: string) =>
  Effect.gen(function* () {
    const userRepo = yield* UserRepository;
    yield* userRepo.clearAuthToken(userId);
  });
