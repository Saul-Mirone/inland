import { Effect, Layer } from 'effect'

import { ArticlesModel } from '@/model/articles-model'
import { ApiClient } from '@/services/api'

import { ArticleService } from './article-service'
import { ArticleServiceImpl } from './article-service-impl'

export const ArticleServiceLive = Layer.effect(
  ArticleService,
  Effect.gen(function* () {
    const model = yield* ArticlesModel
    const api = yield* ApiClient
    return new ArticleServiceImpl(model, api)
  })
)
