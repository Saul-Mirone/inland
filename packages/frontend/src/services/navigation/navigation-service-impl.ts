import type { NavigationServiceInterface } from './navigation-service';

export class NavigationServiceImpl implements NavigationServiceInterface {
  navigate = (url: string): void => {
    window.location.assign(url);
  };

  navigateDelayed = (url: string, delayMs: number): void => {
    setTimeout(() => {
      window.location.href = url;
    }, delayMs);
  };
}
