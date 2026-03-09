import type { Effect } from 'effect'

import { Layer, ManagedRuntime } from 'effect'

import { SitesControllerLive } from '@/controller/sites'
import { SitesModelLive } from '@/model/sites-model'

import { ApiClientLive } from './api-client'

const MainLayer = SitesControllerLive.pipe(
  Layer.provideMerge(Layer.mergeAll(ApiClientLive, SitesModelLive))
)

export const runtime = ManagedRuntime.make(MainLayer)

export const runEffect = <A, E>(
  effect: Effect.Effect<A, E, Layer.Layer.Success<typeof MainLayer>>
): void => {
  runtime.runPromise(effect).catch(console.error)
}
