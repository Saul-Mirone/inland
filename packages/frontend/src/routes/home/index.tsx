import { useEffect, useState } from 'react'

import { ArticleManager } from '@/components/articles/article-manager'
import { LoginButton } from '@/components/auth/login-button'
import { UserInfo } from '@/components/auth/user-info'
import { SiteManager } from '@/components/sites/site-manager'
import { isAuthenticated, logout } from '@/utils/auth'

export function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    setIsLoggedIn(isAuthenticated())
  }, [])

  return (
    <div>
      <h1>Inland CMS</h1>
      {isLoggedIn ? (
        <div>
          <p>Welcome! You are logged in.</p>
          <button onClick={logout}>Logout</button>
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
