import { Route, Routes } from 'react-router'

import { AuthBouncer } from './routes/auth-bouncer'
import { AuthCallback } from './routes/auth-callback'
import { AuthError } from './routes/auth-error'
import { Home } from './routes/home'

export const AppRouter = () => (
  <Routes>
    <Route element={<AuthBouncer />}>
      <Route index element={<Home />} />
    </Route>
    <Route path="auth">
      <Route path="error" element={<AuthError />} />
      <Route path="callback" element={<AuthCallback />} />
    </Route>
  </Routes>
)
