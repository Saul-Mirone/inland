import { Layer } from 'effect';
import { type DeepMockProxy, mockDeep, mockReset } from 'vitest-mock-extended';

import type { PrismaClient } from '../../../generated/prisma/client';

import { DatabaseService } from '../../services/database-service';

// Create a deep mock of Prisma client
export const mockPrisma = mockDeep<PrismaClient>();

// Reset the mock before each test
export const resetMockPrisma = () => {
  mockReset(mockPrisma);
};

// Create a test DatabaseService layer that provides the mock Prisma client
export const TestDatabaseServiceLayer = Layer.succeed(
  DatabaseService,
  DatabaseService.of({
    prisma: mockPrisma as unknown as PrismaClient,
  })
);

// Type helper for better type inference in tests
export type MockPrisma = DeepMockProxy<PrismaClient>;
