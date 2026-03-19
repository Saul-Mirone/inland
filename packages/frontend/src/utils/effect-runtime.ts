import type { Effect } from 'effect'

import { Layer, ManagedRuntime } from 'effect'
import { toast } from 'sonner'

import { ArticlesModelLive } from '@/model/articles-model'
import { SitesModelLive } from '@/model/sites-model'
import { ApiClientLive } from '@/services/api'
import { ArticleServiceLive } from '@/services/article'
import { SiteServiceLive } from '@/services/site'

const MainLayer = Layer.mergeAll(SiteServiceLive, ArticleServiceLive).pipe(
  Layer.provideMerge(
    Layer.mergeAll(ApiClientLive, SitesModelLive, ArticlesModelLive)
  )
)

export const runtime = ManagedRuntime.make(MainLayer)

export const runEffect = <A, E>(
  effect: Effect.Effect<A, E, Layer.Layer.Success<typeof MainLayer>>
): Promise<A> =>
  runtime.runPromise(effect).catch((error) => {
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred'
    toast.error(message)
    throw error
  })
