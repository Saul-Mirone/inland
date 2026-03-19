import { Effect } from 'effect';

import { AuthProviderRepository } from '../../../repositories/auth-provider-repository';
import { UserRepository } from '../../../repositories/user-repository';
import { AuthTokenError } from '../auth-types';

export const getUserAuthToken = (userId: string) =>
  Effect.gen(function* () {
    const userRepo = yield* UserRepository;
    const authProvider = yield* AuthProviderRepository;

    const accessToken = yield* userRepo.getAuthToken(userId);

    if (!accessToken) {
      return yield* new AuthTokenError({
        message: 'No auth integration found for user',
      });
    }

    const validation = yield* authProvider.validateToken(accessToken);

    if (!validation.isValid) {
      yield* userRepo.clearAuthToken(userId);
      return yield* new AuthTokenError({
        message:
          validation.reason ||
          'Auth token is invalid. Please reconnect your account.',
      });
    }

    return accessToken;
  });
