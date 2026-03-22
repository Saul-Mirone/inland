import { Layer } from 'effect';

import { NavigationService } from './navigation-service';
import { NavigationServiceImpl } from './navigation-service-impl';

export const NavigationServiceLive = Layer.succeed(
  NavigationService,
  new NavigationServiceImpl()
);
