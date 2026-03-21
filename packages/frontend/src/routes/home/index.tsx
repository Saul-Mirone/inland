import { Outlet } from 'react-router';

import { LoginButton } from '@/components/auth/login-button';
import { authModel } from '@/model/auth-model';
import { useObservable } from '@/utils/use-observable';

export function Home() {
  const authState = useObservable(authModel.authState$);

  if (authState.status !== 'authenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <h1 className="text-2xl font-bold text-foreground">Inland CMS</h1>
          <p className="text-sm text-muted-foreground">
            Please log in to continue.
          </p>
          <LoginButton />
        </div>
      </div>
    );
  }

  return <Outlet />;
}
