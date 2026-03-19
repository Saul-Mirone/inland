import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../../generated/prisma/client';
import { resolveConfig } from '../services/config-service';

const config = resolveConfig();

const adapter = new PrismaPg({
  connectionString: config.databaseUrl,
});

const prisma = new PrismaClient({
  adapter,
  log:
    config.nodeEnv === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['warn', 'error'],
});

export { prisma };
