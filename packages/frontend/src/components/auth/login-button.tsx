import { Effect } from 'effect';

import { Button } from '@/components/ui/button';
import { AuthService } from '@/services/auth';
import { runEffect } from '@/utils/effect-runtime';

export const LoginButton = () => {
  return (
    <Button
      onClick={() =>
        void runEffect(Effect.flatMap(AuthService, (s) => s.login()))
      }
    >
      Login with GitHub
    </Button>
  );
};
