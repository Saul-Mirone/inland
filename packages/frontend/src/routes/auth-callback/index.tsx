import { Effect } from 'effect';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { AuthService } from '@/services/auth';
import { runEffect } from '@/utils/effect-runtime';

export function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const finishLogin = async () => {
      const authState = await runEffect(
        Effect.flatMap(AuthService, (s) => s.bootstrap(true))
      );

      if (authState.status === 'authenticated') {
        await navigate('/', { replace: true });
        return;
      }

      await navigate('/auth/error', { replace: true });
    };

    finishLogin().catch(() => {
      setError('Authentication failed. Please try again.');
    });
  }, [navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2">
        <p className="text-sm text-destructive">{error}</p>
        <a href="/" className="text-sm underline">
          Return home
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      Processing authentication...
    </div>
  );
}
