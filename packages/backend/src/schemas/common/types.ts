import { Schema as S } from 'effect';

import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
} from '../../repositories/pagination';

// Basic reusable types
export const Id = S.String.pipe(S.minLength(1));
export const Email = S.String.pipe(S.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/));
export const Username = S.String.pipe(S.minLength(1), S.maxLength(50));
export const Url = S.String.pipe(S.pattern(/^https?:\/\/.+/));
export const Slug = S.String.pipe(
  S.pattern(/^[a-z0-9-]+$/),
  S.minLength(1),
  S.maxLength(100)
);

// Pagination query params (coerces string query params to numbers)
export const PaginationParams = S.Struct({
  page: S.optionalWith(
    S.NumberFromString.pipe(S.int(), S.greaterThanOrEqualTo(1)),
    { default: () => DEFAULT_PAGE }
  ),
  limit: S.optionalWith(
    S.NumberFromString.pipe(
      S.int(),
      S.greaterThanOrEqualTo(1),
      S.lessThanOrEqualTo(MAX_LIMIT)
    ),
    {
      default: () => DEFAULT_LIMIT,
    }
  ),
});

// Export types
export type Id = S.Schema.Type<typeof Id>;
export type Email = S.Schema.Type<typeof Email>;
export type Username = S.Schema.Type<typeof Username>;
export type Url = S.Schema.Type<typeof Url>;
export type Slug = S.Schema.Type<typeof Slug>;
export type PaginationParams = S.Schema.Type<typeof PaginationParams>;
