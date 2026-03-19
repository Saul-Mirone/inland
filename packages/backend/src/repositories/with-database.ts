import type { Context } from 'effect'

import { Effect } from 'effect'

import { DatabaseService } from '../services/database-service'

type DatabaseServiceShape = Context.Tag.Service<typeof DatabaseService>

/**
 * Binds a resolved DatabaseService instance into repository
 * operations, removing DatabaseService from their R channel.
 */
export const withDatabase =
  (db: DatabaseServiceShape) =>
  <Args extends readonly unknown[], A, E>(
    fn: (...args: Args) => Effect.Effect<A, E, DatabaseService>
  ) =>
  (...args: Args): Effect.Effect<A, E> =>
    fn(...args).pipe(Effect.provideService(DatabaseService, db))
