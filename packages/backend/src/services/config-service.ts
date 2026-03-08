import { Context, Layer } from 'effect'

export interface AppConfig {
  readonly jwtSecret: string
  readonly sessionSecret: string
  readonly githubClientId: string
  readonly githubClientSecret: string
  readonly authCallbackUrl: string
  readonly appUrl: string
  readonly apiUrl: string
  readonly redisUrl: string
  readonly templateRepo: string
}

export class ConfigService extends Context.Tag('ConfigService')<
  ConfigService,
  AppConfig
>() {}

export function resolveConfig(): AppConfig {
  return {
    jwtSecret: process.env.JWT_SECRET || 'fallback-secret-for-development',
    sessionSecret: process.env.SESSION_SECRET || 'fallback-session-secret',
    githubClientId: process.env.GITHUB_CLIENT_ID || '',
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    authCallbackUrl:
      process.env.AUTH_CALLBACK_URL ||
      'http://localhost:3001/auth/github/callback',
    appUrl: process.env.APP_URL || 'http://localhost:3000',
    apiUrl: process.env.API_URL || 'http://localhost:3001',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    templateRepo:
      process.env.TEMPLATE_REPO || 'Saul-Mirone/inland-template-basic',
  }
}

export const makeConfigService = Layer.succeed(ConfigService, resolveConfig())
