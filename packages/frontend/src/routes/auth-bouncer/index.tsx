import { useEffect } from 'react'
import { Outlet } from 'react-router'

import { authState$, bootstrapAuth } from '@/utils/auth'
import { useObservable } from '@/utils/use-observable'

export function AuthBouncer() {
  const authState = useObservable(authState$)

  useEffect(() => {
    void bootstrapAuth()
  }, [])

  if (authState.status === 'loading') {
    return <div>Checking session...</div>
  }

  return <Outlet />
}
