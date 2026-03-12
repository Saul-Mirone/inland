import { Data } from 'effect'

export class SessionError extends Data.TaggedError('SessionError')<{
  readonly message: string
  readonly cause?: unknown
}> {}
