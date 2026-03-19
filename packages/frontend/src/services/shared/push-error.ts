import type { BehaviorSubject } from 'rxjs';

import type { ApiError } from '@/services/api';
import type { NavigationServiceInterface } from '@/services/navigation';

const AUTH_REDIRECT_DELAY_MS = 3000;

export const pushServiceError = (
  model: {
    loading$: BehaviorSubject<boolean>;
    error$: BehaviorSubject<string | null>;
  },
  nav: NavigationServiceInterface,
  error: ApiError
): void => {
  model.loading$.next(false);
  model.error$.next(error.message);
  const { redirectUrl } = error;
  if (redirectUrl) {
    nav.navigateDelayed(redirectUrl, AUTH_REDIRECT_DELAY_MS);
  }
};
