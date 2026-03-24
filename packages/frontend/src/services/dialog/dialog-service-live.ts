import { Layer } from 'effect';

import { DialogService } from './dialog-service';
import { DialogServiceImpl } from './dialog-service-impl';

export const DialogServiceLive = Layer.succeed(
  DialogService,
  new DialogServiceImpl()
);
