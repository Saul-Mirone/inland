import { Layer } from 'effect'

import { NavigationService } from './navigation-service'

export const NavigationServiceLive = Layer.succeed(NavigationService, {
  navigate: (url: string) => {
    window.location.assign(url)
  },
  navigateDelayed: (url: string, delayMs: number) => {
    setTimeout(() => {
      window.location.href = url
    }, delayMs)
  },
})
