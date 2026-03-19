import { Layer } from 'effect'

import { ApiClient } from './api-client'
import { ApiClientImpl } from './api-client-impl'

export const ApiClientLive = Layer.succeed(ApiClient, new ApiClientImpl())
