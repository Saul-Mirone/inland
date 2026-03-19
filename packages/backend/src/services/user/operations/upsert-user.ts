import { Effect } from 'effect';

import type { CreateUserData } from '../user-types';

import { UserRepository } from '../../../repositories/user-repository';

export const upsertUser = (data: CreateUserData) =>
  Effect.gen(function* () {
    const userRepo = yield* UserRepository;
    return yield* userRepo.upsert(data);
  });
