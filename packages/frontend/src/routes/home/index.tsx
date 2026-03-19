import { Effect } from 'effect'

import { ArticleManager } from '@/components/articles/article-manager'
import { LoginButton } from '@/components/auth/login-button'
import { UserInfo } from '@/components/auth/user-info'
import { SiteManager } from '@/components/sites/site-manager'
import { authModel } from '@/model/auth-model'
import { AuthService } from '@/services/auth'
import { runEffect } from '@/utils/effect-runtime'
import { useObservable } from '@/utils/use-observable'

export function Home() {
  const authState = useObservable(authModel.authState$)

  if (authState.status === 'loading') {
    return <div>Checking session...</div>
  }

  return (
    <div>
      <h1>Inland CMS</h1>
      {authState.status === 'authenticated' ? (
        <div>
          <p>Welcome! You are logged in.</p>
          <button
            onClick={() => {
              void runEffect(Effect.flatMap(AuthService, (s) => s.logout()))
            }}
          >
            Logout
          </button>
          <UserInfo />
          <SiteManager />
          <ArticleManager />
        </div>
      ) : (
        <div>
          <p>Please log in to continue.</p>
          <LoginButton />
        </div>
      )}
    </div>
  )
}
