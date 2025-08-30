import { Schema as S } from 'effect'

import { Username } from '../common'

// Git platform schemas
export const GitPlatform = S.Literal('github', 'gitlab', 'gitea')

export const CreateGitIntegrationData = S.Struct({
  platform: GitPlatform,
  platformUsername: Username,
  accessToken: S.String.pipe(S.minLength(1)),
  installationId: S.optional(S.String),
})

// Re-export OAuth schemas
export * from './oauth'

// Export types
export type GitPlatform = S.Schema.Type<typeof GitPlatform>
export type CreateGitIntegrationData = S.Schema.Type<
  typeof CreateGitIntegrationData
>
