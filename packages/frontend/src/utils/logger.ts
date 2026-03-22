import pino from 'pino';

export const logger = pino({
  browser: { asObject: false },
  level: import.meta.env.DEV ? 'debug' : 'info',
});
