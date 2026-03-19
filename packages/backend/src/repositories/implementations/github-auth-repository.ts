import { Effect, Layer } from 'effect';

import {
  AuthProviderRepository,
  type AuthProviderRepositoryService,
  type PlatformUser,
  AuthProviderAPIError,
} from '../auth-provider-repository';
import {
  githubFetch,
  assertFields,
  type GitHubUser,
  type GitHubEmail,
} from './github-utils';

const makeError = (message: string, status?: number) =>
  new AuthProviderAPIError({ message, status });

const makeGitHubApiRequest = (accessToken: string, endpoint: string) =>
  githubFetch(accessToken, endpoint, makeError);

const assertGitHubUser = (
  data: unknown
): Effect.Effect<GitHubUser, AuthProviderAPIError> =>
  assertFields(data, ['id', 'login', 'avatar_url'], '/user', makeError).pipe(
    Effect.map((obj) => obj as unknown as GitHubUser)
  );

const isGitHubEmail = (item: unknown): item is GitHubEmail =>
  typeof item === 'object' &&
  item !== null &&
  'email' in item &&
  'primary' in item &&
  'verified' in item;

const convertGitHubUserToPlatformUser = (
  githubUser: GitHubUser
): PlatformUser => ({
  id: githubUser.id,
  username: githubUser.login,
  email: githubUser.email,
  avatarUrl: githubUser.avatar_url,
});

export const makeGitHubAuthRepository = (): AuthProviderRepositoryService => ({
  fetchUser: (accessToken: string) =>
    Effect.gen(function* () {
      const data = yield* makeGitHubApiRequest(accessToken, '/user');
      const githubUser = yield* assertGitHubUser(data);
      return convertGitHubUserToPlatformUser(githubUser);
    }),

  fetchUserEmail: (accessToken: string) =>
    Effect.gen(function* () {
      const emails = yield* makeGitHubApiRequest(accessToken, '/user/emails');

      if (!Array.isArray(emails)) {
        return null;
      }

      const primaryEmail = emails.filter(isGitHubEmail).find((e) => e.primary);
      return primaryEmail?.email ?? null;
    }).pipe(Effect.catchAll(() => Effect.succeed(null))),

  validateToken: (accessToken: string) =>
    Effect.gen(function* () {
      yield* makeGitHubApiRequest(accessToken, '/user');
      return { isValid: true };
    }).pipe(
      Effect.catchAll(() =>
        Effect.succeed({
          isValid: false,
          reason: 'GitHub token validation failed',
        })
      )
    ),
});

export const GitHubAuthRepositoryLive = Layer.succeed(
  AuthProviderRepository,
  makeGitHubAuthRepository()
);
