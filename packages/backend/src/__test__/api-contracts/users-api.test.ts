import { ManagedRuntime } from 'effect'
import { describe, it, expect, beforeEach } from 'vitest'

import * as UserService from '../../services/user'
import { mockPrisma, resetMockPrisma } from '../helpers/mock-database'
import { TestRepositoryLayer } from '../helpers/test-layers'

// Create test runtime
const testRuntime = ManagedRuntime.make(TestRepositoryLayer)

describe('Users API Contract Tests', () => {
  beforeEach(() => {
    resetMockPrisma()
  })

  describe('findUserById API Contract', () => {
    it('should return user with gitIntegrations array directly (not wrapped)', async () => {
      // Mock data
      const mockUserWithIntegrations = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        avatarUrl: 'https://example.com/avatar.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
        gitIntegrations: [
          {
            platform: 'github',
            platformUsername: 'testuser-github',
          },
          {
            platform: 'gitlab',
            platformUsername: 'testuser-gitlab',
          },
        ],
      }

      // Setup mocks
      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithIntegrations)

      // Execute
      const result = await testRuntime.runPromise(
        UserService.findUserById('user-1')
      )

      // Verify API contract: should return user object with gitIntegrations array
      expect(result).toEqual(mockUserWithIntegrations)
      expect(result.gitIntegrations).toBeDefined()
      expect(Array.isArray(result.gitIntegrations)).toBe(true)
      expect(result.gitIntegrations.length).toBe(2)

      // Verify gitIntegrations can be used like an array (preventing regression)
      const platforms = result.gitIntegrations.map(
        (integration) => integration.platform
      )
      expect(platforms).toEqual(['github', 'gitlab'])

      // Verify the structure matches what frontend expects
      expect(result.gitIntegrations[0]).toHaveProperty('platform')
      expect(result.gitIntegrations[0]).toHaveProperty('platformUsername')
    })

    it('should return user with empty gitIntegrations array when no integrations exist', async () => {
      // Mock data
      const mockUserWithoutIntegrations = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        avatarUrl: 'https://example.com/avatar.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
        gitIntegrations: [],
      }

      // Setup mocks
      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithoutIntegrations)

      // Execute
      const result = await testRuntime.runPromise(
        UserService.findUserById('user-1')
      )

      // Verify API contract: should return user object with empty gitIntegrations array
      expect(result).toEqual(mockUserWithoutIntegrations)
      expect(result.gitIntegrations).toBeDefined()
      expect(Array.isArray(result.gitIntegrations)).toBe(true)
      expect(result.gitIntegrations.length).toBe(0)

      // Verify empty array can still be mapped over (preventing regression)
      const platforms = result.gitIntegrations.map(
        (integration) => integration.platform
      )
      expect(platforms).toEqual([])
    })
  })

  describe('createUser API Contract', () => {
    it('should return created user object directly', async () => {
      // Mock data
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        avatarUrl: 'https://example.com/avatar.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Setup mocks
      mockPrisma.user.create.mockResolvedValue(mockUser)

      // Test data
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        avatarUrl: 'https://example.com/avatar.jpg',
      }

      // Execute
      const result = await testRuntime.runPromise(
        UserService.createUser(userData)
      )

      // Verify API contract: should return user object directly
      expect(result).toEqual(mockUser)
      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('username')
      expect(result).toHaveProperty('email')
      expect(result).toHaveProperty('avatarUrl')
      expect(result).toHaveProperty('createdAt')
      expect(result).toHaveProperty('updatedAt')

      // Verify structure matches what frontend expects
      expect(typeof result.id).toBe('string')
      expect(typeof result.username).toBe('string')
    })
  })

  describe('upsertGitIntegration API Contract', () => {
    it('should return integration object directly', async () => {
      // Mock data
      const mockIntegration = {
        id: 'integration-1',
        userId: 'user-1',
        platform: 'github',
        platformUsername: 'testuser-github',
        accessToken: 'token123',
        installationId: 'install123',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Setup mocks
      mockPrisma.gitIntegration.upsert.mockResolvedValue(mockIntegration)

      // Test data
      const integrationData = {
        userId: 'user-1',
        platform: 'github',
        platformUsername: 'testuser-github',
        accessToken: 'token123',
        installationId: 'install123',
      }

      // Execute
      const result = await testRuntime.runPromise(
        UserService.upsertGitIntegration(integrationData)
      )

      // Verify API contract: should return integration object directly
      expect(result).toEqual(mockIntegration)
      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('userId')
      expect(result).toHaveProperty('platform')
      expect(result).toHaveProperty('platformUsername')
      expect(result).toHaveProperty('accessToken')
      expect(result).toHaveProperty('installationId')
      expect(result).toHaveProperty('createdAt')
      expect(result).toHaveProperty('updatedAt')

      // Verify structure matches what frontend expects
      expect(typeof result.id).toBe('string')
      expect(typeof result.userId).toBe('string')
      expect(typeof result.platform).toBe('string')
    })
  })
})
