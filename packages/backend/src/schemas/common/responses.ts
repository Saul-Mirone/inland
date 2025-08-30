import { Schema as S } from 'effect'

// Response schemas (for documentation)
export const SuccessResponse = S.Struct({
  success: S.Literal(true),
  message: S.optional(S.String),
})

export const ErrorResponse = S.Struct({
  success: S.Literal(false),
  error: S.String,
  message: S.optional(S.String),
})

// Export types
export type SuccessResponse = S.Schema.Type<typeof SuccessResponse>
export type ErrorResponse = S.Schema.Type<typeof ErrorResponse>
