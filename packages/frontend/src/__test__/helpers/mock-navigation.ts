import type { Mock } from 'vitest';

import { Layer } from 'effect';
import { vi } from 'vitest';

import {
  NavigationService,
  type NavigationServiceInterface,
} from '@/services/navigation';

export interface MockNavigation {
  readonly navigate: Mock;
  readonly navigateDelayed: Mock;
}

export const mockNav: MockNavigation = {
  navigate: vi.fn(),
  navigateDelayed: vi.fn(),
};

export const resetMockNav = () => {
  mockNav.navigate.mockReset();
  mockNav.navigateDelayed.mockReset();
};

export const MockNavigationLive = Layer.succeed(
  NavigationService,
  mockNav as unknown as NavigationServiceInterface
);
