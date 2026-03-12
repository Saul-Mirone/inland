import { ArticleManager } from '@/components/articles/article-manager'
import { LoginButton } from '@/components/auth/login-button'
import { UserInfo } from '@/components/auth/user-info'
import { SiteManager } from '@/components/sites/site-manager'
import { authState$, logout } from '@/utils/auth'
import { useObservable } from '@/utils/use-observable'

export function Home() {
  const authState = useObservable(authState$)

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
              void logout()
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
