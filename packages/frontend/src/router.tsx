import { Route, Routes } from 'react-router';

import { AppLayout } from './components/layout/app-layout';
import { ArticlesPage } from './routes/articles';
import { ArticleEditPage } from './routes/articles/article-edit';
import { ArticleGuard } from './routes/articles/article-guard';
import { AuthBouncer } from './routes/auth-bouncer';
import { AuthCallback } from './routes/auth-callback';
import { AuthError } from './routes/auth-error';
import { Dashboard } from './routes/dashboard';
import { Home } from './routes/home';

export const AppRouter = () => (
  <Routes>
    <Route element={<AuthBouncer />}>
      <Route element={<Home />}>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="articles" element={<ArticlesPage />} />
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
