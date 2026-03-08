import { Schema as S } from 'effect'

// Basic reusable types
export const Id = S.String.pipe(S.minLength(1))
export const Email = S.String.pipe(S.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
export const Username = S.String.pipe(S.minLength(1), S.maxLength(50))
export const Url = S.String.pipe(S.pattern(/^https?:\/\/.+/))
export const Slug = S.String.pipe(
  S.pattern(/^[a-z0-9-]+$/),
  S.minLength(1),
  S.maxLength(100)
)

// Export types
export type Id = S.Schema.Type<typeof Id>
export type Email = S.Schema.Type<typeof Email>
export type Username = S.Schema.Type<typeof Username>
export type Url = S.Schema.Type<typeof Url>
export type Slug = S.Schema.Type<typeof Slug>
