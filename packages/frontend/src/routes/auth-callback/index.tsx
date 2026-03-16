import { useEffect } from 'react'
import { useNavigate } from 'react-router'

import { bootstrapAuth } from '@/utils/auth'

export function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const finishLogin = async () => {
      const authState = await bootstrapAuth(true)

      if (authState.status === 'authenticated') {
        await navigate('/', { replace: true })
        return
      }

      await navigate('/auth/error', { replace: true })
    }

    finishLogin().catch(console.error)
  }, [navigate])

  return <div>Processing authentication...</div>
}
