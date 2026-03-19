import { Effect } from 'effect';

import { ArticleManager } from '@/components/articles/article-manager';
import { LoginButton } from '@/components/auth/login-button';
import { UserInfo } from '@/components/auth/user-info';
import { SiteManager } from '@/components/sites/site-manager';
import { Button } from '@/components/ui/button';
import { authModel } from '@/model/auth-model';
import { AuthService } from '@/services/auth';
import { runEffect } from '@/utils/effect-runtime';
import { useObservable } from '@/utils/use-observable';

export function Home() {
  const authState = useObservable(authModel.authState$);

  if (authState.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Checking session...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-foreground">Inland CMS</h1>
      {authState.status === 'authenticated' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Welcome! You are logged in.
            </p>
            <Button
              variant="destructive"
              onClick={() => {
                void runEffect(Effect.flatMap(AuthService, (s) => s.logout()));
              }}
            >
              Logout
            </Button>
          </div>
          <UserInfo />
          <SiteManager />
          <ArticleManager />
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Please log in to continue.
          </p>
          <LoginButton />
        </div>
      )}
    </div>
  );
}
