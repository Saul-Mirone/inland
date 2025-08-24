import type { PrismaClient } from '@prisma/client'

import { Layer } from 'effect'
import { mockDeep, mockReset, type DeepMockProxy } from 'vitest-mock-extended'

import { DatabaseService } from '../../services/database-service'

// Create a deep mock of Prisma client
export const mockPrisma = mockDeep<PrismaClient>()

// Reset the mock before each test
export const resetMockPrisma = () => {
  mockReset(mockPrisma)
}

// Create a test DatabaseService layer that provides the mock Prisma client
export const TestDatabaseServiceLayer = Layer.succeed(
  DatabaseService,
  DatabaseService.of({
    prisma: mockPrisma as PrismaClient,
  })
)

// Type helper for better type inference in tests
export type MockPrisma = DeepMockProxy<PrismaClient>
