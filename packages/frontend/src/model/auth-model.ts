import { Context, Layer } from 'effect';
import { BehaviorSubject } from 'rxjs';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string;
  gitIntegrations: Array<{
    platform: string;
    platformUsername: string;
  }>;
}

export interface AuthState {
  status: 'loading' | 'anonymous' | 'authenticated';
  user: AuthUser | null;
  error: string | null;
}

export interface AuthModelService {
  readonly authState$: BehaviorSubject<AuthState>;
}

const instance: AuthModelService = {
  authState$: new BehaviorSubject<AuthState>({
    status: 'loading',
    user: null,
    error: null,
  }),
};

export class AuthModel extends Context.Tag('AuthModel')<
  AuthModel,
  AuthModelService
>() {}

export const AuthModelLive = Layer.succeed(AuthModel, instance);

export const authModel = instance;
