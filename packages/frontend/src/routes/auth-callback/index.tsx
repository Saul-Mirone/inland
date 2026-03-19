import { Effect } from 'effect'
import { useEffect } from 'react'
import { useNavigate } from 'react-router'

import { AuthService } from '@/services/auth'
import { runEffect } from '@/utils/effect-runtime'

export function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const finishLogin = async () => {
      const authState = await runEffect(
        Effect.flatMap(AuthService, (s) => s.bootstrap(true))
      )

      if (authState.status === 'authenticated') {
        await navigate('/', { replace: true })
        return
      }

      await navigate('/auth/error', { replace: true })
    }

    finishLogin().catch(console.error)
  }, [navigate])

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      Processing authentication...
    </div>
  )
}
