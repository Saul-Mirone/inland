import { logger } from './logger';

export function fireAndForget(value: void | Promise<void>): void {
  if (value instanceof Promise) {
    value.catch((error: unknown) => {
      logger.error(error, 'Unhandled rejection in fireAndForget');
    });
  }
}
