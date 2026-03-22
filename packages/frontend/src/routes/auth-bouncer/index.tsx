import { Effect } from 'effect';
import { useEffect } from 'react';
import { Outlet } from 'react-router';

import { authModel } from '@/model/auth-model';
import { sitesModel } from '@/model/sites-model';
import { ArticleService } from '@/services/article';
import { AuthService } from '@/services/auth';
import { SiteService } from '@/services/site';
import { runEffect } from '@/utils/effect-runtime';
import { useObservable } from '@/utils/use-observable';

export function AuthBouncer() {
  const authState = useObservable(authModel.authState$);

  useEffect(() => {
    void runEffect(
      Effect.gen(function* () {
        const auth = yield* AuthService;
        const result = yield* auth.bootstrap();
        if (result.status === 'authenticated') {
          const site = yield* SiteService;
          yield* site.bootstrap();
          const selectedSiteId = sitesModel.selectedSiteId$.getValue();
          if (selectedSiteId) {
            const article = yield* ArticleService;
            yield* article.fetchArticles(selectedSiteId);
          }
        }
      })
    );
  }, []);

  if (authState.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Checking session...
      </div>
    );
  }

  return <Outlet />;
}
