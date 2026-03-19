import { Effect } from 'effect'

import { AuthService } from '@/services/auth'
import { runEffect } from '@/utils/effect-runtime'

export const LoginButton = () => {
  return (
    <button
      onClick={() => runEffect(Effect.flatMap(AuthService, (s) => s.login()))}
    >
      Login with GitHub
    </button>
  )
}
