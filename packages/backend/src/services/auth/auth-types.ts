import { Data } from 'effect';

import type { JWTPayload } from '../../types/auth';

export class AuthTokenError extends Data.TaggedError('AuthTokenError')<{
  readonly message: string;
}> {}

export class TokenGenerationError extends Data.TaggedError(
  'TokenGenerationError'
)<{
  readonly reason: string;
}> {}

export class GitHubTokenError extends Data.TaggedError('GitHubTokenError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export interface TokenResponse {
  readonly access_token: string;
  readonly token_type: string;
  readonly scope: string;
}

export const generateJWTPayload = (user: {
  id: string;
  username: string;
  email: string | null;
}): JWTPayload => ({
  userId: user.id,
  username: user.username,
  email: user.email,
});
