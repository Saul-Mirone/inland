import type { Mock } from 'vitest';

import { Effect, Layer } from 'effect';
import { vi } from 'vitest';

import { ApiClient, type ApiClientService, ApiError } from '@/services/api';

export interface MockApiClient {
  readonly get: Mock;
  readonly post: Mock;
  readonly put: Mock;
  readonly del: Mock;
  readonly buildUrl: Mock;
}

export const createMockApiClient = (): MockApiClient => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
  buildUrl: vi.fn((path: string) => `http://localhost:3001${path}`),
});

export const mockApi = createMockApiClient();

export const resetMockApi = () => {
  mockApi.get.mockReset();
  mockApi.post.mockReset();
  mockApi.put.mockReset();
  mockApi.del.mockReset();
  mockApi.buildUrl.mockReset();
  mockApi.buildUrl.mockImplementation(
    (path: string) => `http://localhost:3001${path}`
  );
};

export const MockApiClientLive = Layer.succeed(
  ApiClient,
  mockApi as unknown as ApiClientService
);

export const apiSuccess = <T>(data: T) => Effect.succeed(data);

export const apiError = (status: number, message: string) =>
  Effect.fail(new ApiError({ status, message }));
