import { Context } from 'effect'

export interface NavigationServiceInterface {
  readonly navigate: (url: string) => void
  readonly navigateDelayed: (url: string, delayMs: number) => void
}

export class NavigationService extends Context.Tag('NavigationService')<
  NavigationService,
  NavigationServiceInterface
>() {}
