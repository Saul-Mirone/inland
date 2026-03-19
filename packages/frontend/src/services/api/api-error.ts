import { Data } from 'effect';

export class ApiError extends Data.TaggedError('ApiError')<{
  readonly status: number;
  readonly message: string;
  readonly redirectUrl?: string;
}> {}
