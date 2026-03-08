import { Data } from 'effect'

export class RepositoryError extends Data.TaggedError('RepositoryError')<{
  readonly operation: string
  readonly cause: unknown
}> {}

export const isUniqueConstraintError = (error: RepositoryError): boolean => {
  const cause = error.cause
  return cause instanceof Error && cause.message.includes('Unique constraint')
}
