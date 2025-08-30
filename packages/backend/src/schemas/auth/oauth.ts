import { Schema as S } from 'effect'

// OAuth callback query parameters
export const GitHubCallbackQuery = S.Struct({
  code: S.String.pipe(S.minLength(1)),
  state: S.optional(S.String),
  error: S.optional(S.String),
  error_description: S.optional(S.String),
})

// Auth callback redirect query (from frontend)
export const AuthCallbackQuery = S.Struct({
  token: S.String.pipe(S.minLength(1)),
})

// Auth error query parameters
export const AuthErrorQuery = S.Struct({
  reason: S.optional(S.Literal('provider', 'token', 'user')),
})

// Export types
export type GitHubCallbackQuery = S.Schema.Type<typeof GitHubCallbackQuery>
export type AuthCallbackQuery = S.Schema.Type<typeof AuthCallbackQuery>
export type AuthErrorQuery = S.Schema.Type<typeof AuthErrorQuery>
