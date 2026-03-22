import { authModel } from '@/model/auth-model';
import { useObservable } from '@/utils/use-observable';

export function Welcome() {
  const authState = useObservable(authModel.authState$);
  const user = authState.user;

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">
          {user ? `Hello, ${user.username}` : 'Hello'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Select an article from the sidebar to get started.
        </p>
      </div>
    </div>
  );
}
