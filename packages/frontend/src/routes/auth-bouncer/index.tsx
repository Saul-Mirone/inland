import { Effect } from 'effect'
import { useEffect } from 'react'
import { Outlet } from 'react-router'

import { authModel } from '@/model/auth-model'
import { AuthService } from '@/services/auth'
import { runEffect } from '@/utils/effect-runtime'
import { useObservable } from '@/utils/use-observable'

export function AuthBouncer() {
  const authState = useObservable(authModel.authState$)

  useEffect(() => {
    void runEffect(Effect.flatMap(AuthService, (s) => s.bootstrap()))
  }, [])

  if (authState.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Checking session...
      </div>
    )
  }

  return <Outlet />
}
