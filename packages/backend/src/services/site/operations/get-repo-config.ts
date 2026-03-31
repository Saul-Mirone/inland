import { Effect } from 'effect';

import { GitProviderRepository } from '../../../repositories/git-provider-repository';
import { AuthService } from '../../auth';

export const getRepoConfig = (userId: string, repo: string) =>
  Effect.gen(function* () {
    const authService = yield* AuthService;
    const accessToken = yield* authService.getUserAuthToken(userId);
    const gitProvider = yield* GitProviderRepository;
    return yield* gitProvider.getSiteConfig(accessToken, repo);
  });
