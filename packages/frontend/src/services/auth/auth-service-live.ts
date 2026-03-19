import { Effect, Layer } from 'effect'

import { AuthModel } from '@/model/auth-model'
import { ApiClient } from '@/services/api'
import { NavigationService } from '@/services/navigation'

import { AuthService } from './auth-service'
import { AuthServiceImpl } from './auth-service-impl'

export const AuthServiceLive = Layer.effect(
  AuthService,
  Effect.gen(function* () {
    const model = yield* AuthModel
    const api = yield* ApiClient
    const nav = yield* NavigationService
    return new AuthServiceImpl(model, api, nav)
  })
)
