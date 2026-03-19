import { Effect, Layer } from 'effect'

import { SitesModel } from '@/model/sites-model'
import { ApiClient } from '@/services/api'

import { SiteService } from './site-service'
import { SiteServiceImpl } from './site-service-impl'

export const SiteServiceLive = Layer.effect(
  SiteService,
  Effect.gen(function* () {
    const model = yield* SitesModel
    const api = yield* ApiClient
    return new SiteServiceImpl(model, api)
  })
)
