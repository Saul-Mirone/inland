import type { BehaviorSubject } from 'rxjs'

import { useSyncExternalStore } from 'react'

export function useObservable<T>(subject: BehaviorSubject<T>): T {
  return useSyncExternalStore(
    (callback) => {
      const subscription = subject.subscribe(callback)
      return () => subscription.unsubscribe()
    },
    () => subject.getValue()
  )
}
