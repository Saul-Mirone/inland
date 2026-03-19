import type { Effect } from 'effect';

import { Context } from 'effect';

import type { AuthState } from '@/model/auth-model';

export interface AuthServiceInterface {
  readonly bootstrap: (force?: boolean) => Effect.Effect<AuthState>;
  readonly login: () => Effect.Effect<void>;
  readonly logout: () => Effect.Effect<void>;
}

export class AuthService extends Context.Tag('AuthService')<
  AuthService,
  AuthServiceInterface
>() {}
