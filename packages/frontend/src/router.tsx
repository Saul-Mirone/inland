import { Route, Routes } from 'react-router';

import { AppLayout } from './components/layout/app-layout';
import { ArticleEditPage } from './routes/articles/article-edit';
import { ArticleGuard } from './routes/articles/article-guard';
import { AuthBouncer } from './routes/auth-bouncer';
import { AuthCallback } from './routes/auth-callback';
import { AuthError } from './routes/auth-error';
import { Home } from './routes/home';
import { Welcome } from './routes/welcome';

export const AppRouter = () => (
  <Routes>
    <Route element={<AuthBouncer />}>
      <Route element={<Home />}>
        <Route element={<AppLayout />}>
          <Route index element={<Welcome />} />
          <Route path="articles/:id" element={<ArticleGuard />}>
            <Route index element={<ArticleEditPage />} />
          </Route>
        </Route>
      </Route>
    </Route>
    <Route path="auth">
      <Route path="error" element={<AuthError />} />
      <Route path="callback" element={<AuthCallback />} />
    </Route>
  </Routes>
);
