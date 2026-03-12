import { beginLogin } from '@/utils/auth'

export const LoginButton = () => {
  return <button onClick={beginLogin}>Login with GitHub</button>
}
