import { ManagedRuntime, Exit } from 'effect'
import { describe, it, expect, beforeEach } from 'vitest'

import * as SiteService from '../services/site-service'
import { mockPrisma, resetMockPrisma } from './helpers/mock-database'
import { TestRepositoryLayer } from './helpers/test-layers'

// Create test runtime
const testRuntime = ManagedRuntime.make(TestRepositoryLayer)

describe('SiteService', () => {
  beforeEach(() => {
    resetMockPrisma()
  })

  describe('findUserSites', () => {
    it('should find sites for a user', async () => {
      // Mock data
      const mockSites = [
        {
          id: 'site-1',
          name: 'Test Site 1',
          userId: 'user-1',
          gitRepo: 'user/repo1',
          platform: 'github',
          deployStatus: 'deployed',
          deployUrl: 'https://test1.com',
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: {
            articles: 5,
            media: 3,
          },
        },
        {
          id: 'site-2',
          name: 'Test Site 2',
          userId: 'user-1',
          gitRepo: 'user/repo2',
          platform: 'github',
          deployStatus: 'deployed',
          deployUrl: 'https://test2.com',
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: {
            articles: 2,
            media: 1,
          },
        },
      ]

      // Setup mocks
      mockPrisma.site.findMany.mockResolvedValue(mockSites)

      // Execute
      const result = await testRuntime.runPromise(
        SiteService.findUserSites('user-1')
      )

      // Verify
      expect(result).toEqual(mockSites)
      expect(mockPrisma.site.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: {
          _count: {
            select: {
              articles: true,
              media: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      })
    })

    it('should return empty array when user has no sites', async () => {
      // Setup mocks
      mockPrisma.site.findMany.mockResolvedValue([])

      // Execute
      const result = await testRuntime.runPromise(
        SiteService.findUserSites('user-without-sites')
      )

      // Verify
      expect(result).toEqual([])
    })
  })

  describe('updateSite', () => {
    it('should update a site successfully', async () => {
      // Mock data
      const mockSiteAccess = {
        userId: 'user-1',
      }

      const mockUpdatedSite = {
        id: 'site-1',
        name: 'Updated Site Name',
        userId: 'user-1',
        gitRepo: 'user/updated-repo',
        platform: 'github',
        deployStatus: 'deployed',
        deployUrl: 'https://updated.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Setup mocks
      mockPrisma.site.findUnique.mockResolvedValue(mockSiteAccess)
      mockPrisma.site.update.mockResolvedValue(mockUpdatedSite)

      // Test data
      const updateData = {
        name: 'Updated Site Name',
        gitRepo: 'user/updated-repo',
      }

      // Execute
      const result = await testRuntime.runPromise(
        SiteService.updateSite('site-1', 'user-1', updateData)
      )

      // Verify
      expect(result).toEqual(mockUpdatedSite)
      expect(mockPrisma.site.findUnique).toHaveBeenCalledWith({
        where: { id: 'site-1' },
        select: { userId: true },
      })
      expect(mockPrisma.site.update).toHaveBeenCalledWith({
        where: { id: 'site-1' },
        data: {
          name: 'Updated Site Name',
          gitRepo: 'user/updated-repo',
        },
      })
    })

    it('should fail when site is not found', async () => {
      // Setup mocks
      mockPrisma.site.findUnique.mockResolvedValue(null)

      // Execute and verify
      const result = await testRuntime.runPromiseExit(
        SiteService.updateSite('nonexistent-site', 'user-1', { name: 'Test' })
      )

      expect(Exit.isFailure(result)).toBe(true)
    })

    it('should fail when user does not have access to site', async () => {
      // Mock data
      const mockSiteAccess = {
        userId: 'other-user',
      }

      // Setup mocks
      mockPrisma.site.findUnique.mockResolvedValue(mockSiteAccess)

      // Execute and verify
      const result = await testRuntime.runPromiseExit(
        SiteService.updateSite('site-1', 'user-1', { name: 'Test' })
      )

      expect(Exit.isFailure(result)).toBe(true)
    })
  })

  describe('deleteSite', () => {
    it('should delete a site successfully', async () => {
      // Mock data
      const mockSiteAccess = {
        userId: 'user-1',
      }

      const mockDeletedSite = {
        id: 'site-1',
        name: 'Deleted Site',
        userId: 'user-1',
        gitRepo: 'user/deleted-repo',
        platform: 'github',
        deployStatus: 'deployed',
        deployUrl: 'https://deleted.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Setup mocks
      mockPrisma.site.findUnique.mockResolvedValue(mockSiteAccess)
      mockPrisma.site.delete.mockResolvedValue(mockDeletedSite)

      // Execute
      const result = await testRuntime.runPromise(
        SiteService.deleteSite('site-1', 'user-1')
      )

      // Verify
      expect(result).toEqual(mockDeletedSite)
      expect(mockPrisma.site.findUnique).toHaveBeenCalledWith({
        where: { id: 'site-1' },
        select: { userId: true },
      })
      expect(mockPrisma.site.delete).toHaveBeenCalledWith({
        where: { id: 'site-1' },
      })
    })

    it('should fail when site is not found', async () => {
      // Setup mocks
      mockPrisma.site.findUnique.mockResolvedValue(null)

      // Execute and verify
      const result = await testRuntime.runPromiseExit(
        SiteService.deleteSite('nonexistent-site', 'user-1')
      )

      expect(Exit.isFailure(result)).toBe(true)
    })

    it('should fail when user does not have access to site', async () => {
      // Mock data
      const mockSiteAccess = {
        userId: 'other-user',
      }

      // Setup mocks
      mockPrisma.site.findUnique.mockResolvedValue(mockSiteAccess)

      // Execute and verify
      const result = await testRuntime.runPromiseExit(
        SiteService.deleteSite('site-1', 'user-1')
      )

      expect(Exit.isFailure(result)).toBe(true)
    })
  })

  describe('validateSiteName', () => {
    it('should validate a correct site name', async () => {
      const result = await testRuntime.runPromise(
        SiteService.validateSiteName('my-awesome-site')
      )

      expect(result).toBe('my-awesome-site')
    })

    it('should fail when site name is empty', async () => {
      const result = await testRuntime.runPromiseExit(
        SiteService.validateSiteName('')
      )

      expect(Exit.isFailure(result)).toBe(true)
    })

    it('should fail when site name is too long', async () => {
      const longName = 'a'.repeat(101)
      const result = await testRuntime.runPromiseExit(
        SiteService.validateSiteName(longName)
      )

      expect(Exit.isFailure(result)).toBe(true)
    })

    it('should fail when site name contains invalid characters', async () => {
      const result = await testRuntime.runPromiseExit(
        SiteService.validateSiteName('site with spaces!')
      )

      expect(Exit.isFailure(result)).toBe(true)
    })
  })

  describe('validateGitRepo', () => {
    it('should validate a correct git repo format', async () => {
      const result = await testRuntime.runPromise(
        SiteService.validateGitRepo('username/repository-name')
      )

      expect(result).toBe('username/repository-name')
    })

    it('should fail when git repo is empty', async () => {
      const result = await testRuntime.runPromiseExit(
        SiteService.validateGitRepo('')
      )

      expect(Exit.isFailure(result)).toBe(true)
    })

    it('should fail when git repo format is invalid', async () => {
      const result = await testRuntime.runPromiseExit(
        SiteService.validateGitRepo('invalid-format')
      )

      expect(Exit.isFailure(result)).toBe(true)
    })
  })
})
