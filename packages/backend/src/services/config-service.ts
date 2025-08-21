import { Effect, Context, Layer, Config } from 'effect'

export interface AppConfig {
  readonly jwtSecret: string
  readonly sessionSecret: string
  readonly githubClientId: string
  readonly githubClientSecret: string
  readonly authCallbackUrl: string
  readonly appUrl: string
  readonly apiUrl: string
  readonly redisUrl: string
}

export class ConfigService extends Context.Tag('ConfigService')<
  ConfigService,
  AppConfig
>() {}

const jwtSecret = Config.string('JWT_SECRET').pipe(
  Config.withDefault('fallback-secret-for-development')
)

const sessionSecret = Config.string('SESSION_SECRET').pipe(
  Config.withDefault('fallback-session-secret')
)

const githubClientId = Config.string('GITHUB_CLIENT_ID').pipe(
  Config.withDefault('')
)

const githubClientSecret = Config.string('GITHUB_CLIENT_SECRET').pipe(
  Config.withDefault('')
)

const authCallbackUrl = Config.string('AUTH_CALLBACK_URL').pipe(
  Config.withDefault('http://localhost:3001/auth/github/callback')
)

const appUrl = Config.string('APP_URL').pipe(
  Config.withDefault('http://localhost:3000')
)

const apiUrl = Config.string('API_URL').pipe(
  Config.withDefault('http://localhost:3001')
)

const redisUrl = Config.string('REDIS_URL').pipe(
  Config.withDefault('redis://localhost:6379')
)

export const makeConfigService = Layer.effect(
  ConfigService,
  Effect.all({
    jwtSecret,
    sessionSecret,
    githubClientId,
    githubClientSecret,
    authCallbackUrl,
    appUrl,
    apiUrl,
    redisUrl,
  })
)
