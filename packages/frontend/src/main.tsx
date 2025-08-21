import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { AuthCallback } from './components/auth/auth-callback'
import { LoginButton } from './components/auth/login-button'
import { UserInfo } from './components/auth/user-info'
import { SiteManager } from './components/sites/site-manager'
import { isAuthenticated, logout } from './utils/auth'

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const currentPath = window.location.pathname

  useEffect(() => {
    setIsLoggedIn(isAuthenticated())
  }, [])

  if (currentPath === '/auth/callback') {
    return <AuthCallback />
  }

  if (currentPath === '/auth/error') {
    return <div>Authentication failed. Please try again.</div>
  }

  return (
    <div>
      <h1>Inland CMS</h1>
      {isLoggedIn ? (
        <div>
          <p>Welcome! You are logged in.</p>
          <button onClick={logout}>Logout</button>
          <UserInfo />
          <SiteManager />
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
