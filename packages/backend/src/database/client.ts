import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from '../../generated/prisma/client'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

// Create a single Prisma client instance
const prisma = new PrismaClient({
  adapter,
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['warn', 'error'],
})

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

export { prisma }
