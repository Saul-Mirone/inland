import type { Effect } from 'effect'

import { Layer, ManagedRuntime } from 'effect'
import { toast } from 'sonner'

import { ArticlesModelLive } from '@/model/articles-model'
import { AuthModelLive } from '@/model/auth-model'
import { SitesModelLive } from '@/model/sites-model'
import { ApiClientLive } from '@/services/api'
import { ArticleServiceLive } from '@/services/article'
import { AuthServiceLive } from '@/services/auth'
import { NavigationServiceLive } from '@/services/navigation'
import { SiteServiceLive } from '@/services/site'

const MainLayer = Layer.mergeAll(
  SiteServiceLive,
  ArticleServiceLive,
  AuthServiceLive
).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      ApiClientLive,
      NavigationServiceLive,
      SitesModelLive,
      ArticlesModelLive,
      AuthModelLive
    )
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
