import { ManagedRuntime, Exit } from 'effect'
import { describe, it, expect, beforeEach } from 'vitest'

import * as UserService from '../../services/user'
import { mockPrisma, resetMockPrisma } from '../helpers/mock-database'
import { TestRepositoryLayer } from '../helpers/test-layers'

// Create test runtime
const testRuntime = ManagedRuntime.make(TestRepositoryLayer)

describe('UserService', () => {
  beforeEach(() => {
    resetMockPrisma()
  })

  describe('createUser', () => {
    it('should create a user successfully', async () => {
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

      // Verify
      expect(result).toEqual(mockUser)
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          username: 'testuser',
          email: 'test@example.com',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
      })
    })

    it('should handle creation error', async () => {
      // Setup mocks
      mockPrisma.user.create.mockRejectedValue(new Error('Database error'))

      // Test data
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        avatarUrl: null,
      }

      // Execute and verify
      const result = await testRuntime.runPromiseExit(
        UserService.createUser(userData)
      )

      expect(Exit.isFailure(result)).toBe(true)
    })
  })

  describe('findUserByUsername', () => {
    it('should find a user by username', async () => {
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
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      // Execute
      const result = await testRuntime.runPromise(
        UserService.findUserByUsername('testuser')
      )

      // Verify
      expect(result).toEqual(mockUser)
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      })
    })

    it('should fail when user is not found', async () => {
      // Setup mocks
      mockPrisma.user.findUnique.mockResolvedValue(null)

      // Execute and verify
      const result = await testRuntime.runPromiseExit(
        UserService.findUserByUsername('nonexistent')
      )

      expect(Exit.isFailure(result)).toBe(true)
    })
  })

  describe('findUserById', () => {
    it('should find a user by id with integrations', async () => {
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
        ],
      }

      // Setup mocks
      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithIntegrations)

      // Execute
      const result = await testRuntime.runPromise(
        UserService.findUserById('user-1')
      )

      // Verify
      expect(result).toEqual(mockUserWithIntegrations)
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: {
          gitIntegrations: {
            select: {
              platform: true,
              platformUsername: true,
            },
          },
        },
      })
    })

    it('should fail when user is not found', async () => {
      // Setup mocks
      mockPrisma.user.findUnique.mockResolvedValue(null)

      // Execute and verify
      const result = await testRuntime.runPromiseExit(
        UserService.findUserById('nonexistent')
      )

      expect(Exit.isFailure(result)).toBe(true)
    })
  })

  describe('upsertUser', () => {
    it('should upsert a user successfully', async () => {
      // Mock data
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'updated@example.com',
        avatarUrl: 'https://example.com/new-avatar.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Setup mocks
      mockPrisma.user.upsert.mockResolvedValue(mockUser)

      // Test data
      const userData = {
        username: 'testuser',
        email: 'updated@example.com',
        avatarUrl: 'https://example.com/new-avatar.jpg',
      }

      // Execute
      const result = await testRuntime.runPromise(
        UserService.upsertUser(userData)
      )

      // Verify
      expect(result).toEqual(mockUser)
      expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
        where: { username: 'testuser' },
        update: {
          email: 'updated@example.com',
          avatarUrl: 'https://example.com/new-avatar.jpg',
        },
        create: {
          username: 'testuser',
          email: 'updated@example.com',
          avatarUrl: 'https://example.com/new-avatar.jpg',
        },
      })
    })
  })

  describe('upsertGitIntegration', () => {
    it('should upsert a git integration successfully', async () => {
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

      // Verify
      expect(result).toEqual(mockIntegration)
      expect(mockPrisma.gitIntegration.upsert).toHaveBeenCalledWith({
        where: {
          userId_platform: {
            userId: 'user-1',
            platform: 'github',
          },
        },
        update: {
          platformUsername: 'testuser-github',
          accessToken: 'token123',
          installationId: 'install123',
        },
        create: {
          userId: 'user-1',
          platform: 'github',
          platformUsername: 'testuser-github',
          accessToken: 'token123',
          installationId: 'install123',
        },
      })
    })

    it('should handle upsert without installationId', async () => {
      // Mock data
      const mockIntegration = {
        id: 'integration-1',
        userId: 'user-1',
        platform: 'github',
        platformUsername: 'testuser-github',
        accessToken: 'token123',
        installationId: null,
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
      }

      // Execute
      const result = await testRuntime.runPromise(
        UserService.upsertGitIntegration(integrationData)
      )

      // Verify
      expect(result).toEqual(mockIntegration)
      expect(mockPrisma.gitIntegration.upsert).toHaveBeenCalledWith({
        where: {
          userId_platform: {
            userId: 'user-1',
            platform: 'github',
          },
        },
        update: {
          platformUsername: 'testuser-github',
          accessToken: 'token123',
          installationId: undefined,
        },
        create: {
          userId: 'user-1',
          platform: 'github',
          platformUsername: 'testuser-github',
          accessToken: 'token123',
          installationId: undefined,
        },
      })
    })
  })
})
