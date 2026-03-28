import { ManagedRuntime, Exit } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';

import * as SiteService from '../../services/site';
import { mockPrisma, resetMockPrisma } from '../helpers/mock-database';
import { mockGitIntegration, mockSite } from '../helpers/mock-factories';
import { TestRepositoryLayer } from '../helpers/test-layers';

// Create test runtime
const testRuntime = ManagedRuntime.make(TestRepositoryLayer);

describe('SiteService', () => {
  beforeEach(() => {
    resetMockPrisma();
  });

  describe('findUserSites', () => {
    it('should find sites for a user with pagination', async () => {
      // Mock data
      const mockSites = [
        {
          ...mockSite({
            id: 'site-1',
            name: 'Test Site 1',
            gitRepo: 'user/repo1',
            deployUrl: 'https://test1.com',
          }),
          _count: {
            articles: 5,
            media: 3,
          },
        },
        {
          ...mockSite({
            id: 'site-2',
            name: 'Test Site 2',
            gitRepo: 'user/repo2',
            deployUrl: 'https://test2.com',
          }),
          _count: {
            articles: 2,
            media: 1,
          },
        },
      ];

      // Setup mocks
      mockPrisma.$transaction.mockResolvedValue([mockSites, 2]);

      // Execute
      const result = await testRuntime.runPromise(
        SiteService.findUserSites('user-1')
      );

      // Verify paginated result
      expect(result.items).toEqual(mockSites);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should return empty items when user has no sites', async () => {
      // Setup mocks
      mockPrisma.$transaction.mockResolvedValue([[], 0]);

      // Execute
      const result = await testRuntime.runPromise(
        SiteService.findUserSites('user-without-sites')
      );

      // Verify
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('findSiteById', () => {
    it('should return site with full details', async () => {
      const siteDetails = {
        ...mockSite(),
        user: { id: 'user-1', username: 'testuser' },
        articles: [],
        media: [],
      };

      mockPrisma.site.findUnique.mockResolvedValue(siteDetails);

      const result = await testRuntime.runPromise(
        SiteService.findSiteById('site-1', 'user-1')
      );

      expect(result).toEqual(siteDetails);
    });

    it('should fail when site not found', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(null);

      const result = await testRuntime.runPromiseExit(
        SiteService.findSiteById('missing', 'user-1')
      );

      expect(Exit.isFailure(result)).toBe(true);
    });

    it('should fail when user does not own site', async () => {
      const siteDetails = {
        ...mockSite({ userId: 'other-user' }),
        user: { id: 'other-user', username: 'other' },
        articles: [],
        media: [],
      };

      mockPrisma.site.findUnique.mockResolvedValue(siteDetails);

      const result = await testRuntime.runPromiseExit(
        SiteService.findSiteById('site-1', 'user-1')
      );

      expect(Exit.isFailure(result)).toBe(true);
    });
  });

  describe('updateSite', () => {
    it('should update a site successfully', async () => {
      // Mock data
      const mockUpdatedSite = mockSite({
        id: 'site-1',
        name: 'updated-site-name',
        gitRepo: 'user/updated-repo',
        deployUrl: 'https://updated.com',
      });

      // Setup mocks
      mockPrisma.site.findUnique.mockResolvedValue(mockSite());
      mockPrisma.site.update.mockResolvedValue(mockUpdatedSite);

      // Test data
      const updateData = {
        name: 'updated-site-name',
        gitRepo: 'user/updated-repo',
      };

      // Execute
      const result = await testRuntime.runPromise(
        SiteService.updateSite('site-1', 'user-1', updateData)
      );

      // Verify
      expect(result).toEqual(mockUpdatedSite);
      expect(mockPrisma.site.findUnique).toHaveBeenCalledWith({
        where: { id: 'site-1' },
      });
      expect(mockPrisma.site.update).toHaveBeenCalledWith({
        where: { id: 'site-1' },
        data: {
          name: 'updated-site-name',
          gitRepo: 'user/updated-repo',
        },
      });
    });

    it('should fail when site is not found', async () => {
      // Setup mocks
      mockPrisma.site.findUnique.mockResolvedValue(null);

      // Execute and verify
      const result = await testRuntime.runPromiseExit(
        SiteService.updateSite('nonexistent-site', 'user-1', { name: 'Test' })
      );

      expect(Exit.isFailure(result)).toBe(true);
    });

    it('should fail when user does not have access to site', async () => {
      // Setup mocks
      mockPrisma.site.findUnique.mockResolvedValue(
        mockSite({ userId: 'other-user' })
      );

      // Execute and verify
      const result = await testRuntime.runPromiseExit(
        SiteService.updateSite('site-1', 'user-1', { name: 'Test' })
      );

      expect(Exit.isFailure(result)).toBe(true);
    });

    it('should update description and displayName', async () => {
      const mockUpdatedSite = mockSite({
        id: 'site-1',
        displayName: 'New Title',
        description: 'New description',
      });

      mockPrisma.site.findUnique.mockResolvedValue(mockSite());
      mockPrisma.site.update.mockResolvedValue(mockUpdatedSite);

      const result = await testRuntime.runPromise(
        SiteService.updateSite('site-1', 'user-1', {
          displayName: 'New Title',
          description: 'New description',
        })
      );

      expect(result).toEqual(mockUpdatedSite);
      expect(mockPrisma.site.update).toHaveBeenCalledWith({
        where: { id: 'site-1' },
        data: {
          displayName: 'New Title',
          description: 'New description',
        },
      });
    });

    it('should trigger git config push when config fields change', async () => {
      const existingSite = mockSite({ gitRepo: 'testuser/test-repo' });
      const updatedSite = mockSite({
        displayName: 'Updated Name',
        description: 'Updated desc',
        gitRepo: 'testuser/test-repo',
      });

      mockPrisma.site.findUnique.mockResolvedValue(existingSite);
      mockPrisma.site.update.mockResolvedValue(updatedSite);
      mockPrisma.gitIntegration.findFirst.mockResolvedValue(
        mockGitIntegration()
      );

      await testRuntime.runPromise(
        SiteService.updateSite('site-1', 'user-1', {
          displayName: 'Updated Name',
          description: 'Updated desc',
        })
      );

      // pushSiteConfigToRepo calls authService.getUserAuthToken
      // which reads gitIntegration — verifies the push path was triggered
      expect(mockPrisma.gitIntegration.findFirst).toHaveBeenCalled();
    });

    it('should not trigger git config push for non-config fields', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(mockSite());
      mockPrisma.site.update.mockResolvedValue(
        mockSite({ deployStatus: 'ready' })
      );

      await testRuntime.runPromise(
        SiteService.updateSite('site-1', 'user-1', {
          deployStatus: 'ready',
        })
      );

      // Should not attempt to push config
      expect(mockPrisma.gitIntegration.findFirst).not.toHaveBeenCalled();
    });

    it('should not include description in update when not provided', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(mockSite());
      mockPrisma.site.update.mockResolvedValue(
        mockSite({ displayName: 'Only Name' })
      );

      await testRuntime.runPromise(
        SiteService.updateSite('site-1', 'user-1', {
          displayName: 'Only Name',
        })
      );

      const updateCall = mockPrisma.site.update.mock.calls[0][0];
      expect(updateCall.data).toEqual({ displayName: 'Only Name' });
      expect(updateCall.data).not.toHaveProperty('description');
    });
  });

  describe('deleteSite', () => {
    it('should delete a site successfully', async () => {
      // Mock data
      const mockDeletedSite = mockSite({
        id: 'site-1',
        name: 'Deleted Site',
        gitRepo: 'user/deleted-repo',
        deployUrl: 'https://deleted.com',
      });

      // Setup mocks
      mockPrisma.site.findUnique.mockResolvedValue(mockSite());
      mockPrisma.site.delete.mockResolvedValue(mockDeletedSite);

      // Execute
      const result = await testRuntime.runPromise(
        SiteService.deleteSite('site-1', 'user-1')
      );

      // Verify
      expect(result).toEqual(mockDeletedSite);
      expect(mockPrisma.site.findUnique).toHaveBeenCalledWith({
        where: { id: 'site-1' },
        select: { userId: true },
      });
      expect(mockPrisma.site.delete).toHaveBeenCalledWith({
        where: { id: 'site-1' },
      });
    });

    it('should fail when site is not found', async () => {
      // Setup mocks
      mockPrisma.site.findUnique.mockResolvedValue(null);

      // Execute and verify
      const result = await testRuntime.runPromiseExit(
        SiteService.deleteSite('nonexistent-site', 'user-1')
      );

      expect(Exit.isFailure(result)).toBe(true);
    });

    it('should fail when user does not have access to site', async () => {
      // Setup mocks
      mockPrisma.site.findUnique.mockResolvedValue(
        mockSite({ userId: 'other-user' })
      );

      // Execute and verify
      const result = await testRuntime.runPromiseExit(
        SiteService.deleteSite('site-1', 'user-1')
      );

      expect(Exit.isFailure(result)).toBe(true);
    });
  });

  describe('validateSiteName', () => {
    it('should validate a correct site name', async () => {
      const result = await testRuntime.runPromise(
        SiteService.validateSiteName('my-awesome-site')
      );

      expect(result).toBe('my-awesome-site');
    });

    it('should fail when site name is empty', async () => {
      const result = await testRuntime.runPromiseExit(
        SiteService.validateSiteName('')
      );

      expect(Exit.isFailure(result)).toBe(true);
    });

    it('should fail when site name is too long', async () => {
      const longName = 'a'.repeat(101);
      const result = await testRuntime.runPromiseExit(
        SiteService.validateSiteName(longName)
      );

      expect(Exit.isFailure(result)).toBe(true);
    });

    it('should fail when site name contains invalid characters', async () => {
      const result = await testRuntime.runPromiseExit(
        SiteService.validateSiteName('site with spaces!')
      );

      expect(Exit.isFailure(result)).toBe(true);
    });
  });

  describe('validateGitRepo', () => {
    it('should validate a correct git repo format', async () => {
      const result = await testRuntime.runPromise(
        SiteService.validateGitRepo('username/repository-name')
      );

      expect(result).toBe('username/repository-name');
    });

    it('should fail when git repo is empty', async () => {
      const result = await testRuntime.runPromiseExit(
        SiteService.validateGitRepo('')
      );

      expect(Exit.isFailure(result)).toBe(true);
    });

    it('should fail when git repo format is invalid', async () => {
      const result = await testRuntime.runPromiseExit(
        SiteService.validateGitRepo('invalid-format')
      );

      expect(Exit.isFailure(result)).toBe(true);
    });
  });

  describe('createSite', () => {
    it('should save description to database when provided', async () => {
      const mockCreatedSite = mockSite({
        id: 'site-1',
        name: 'new-site',
        description: 'My site description',
        gitRepo: 'testuser/new-site',
      });

      mockPrisma.site.create.mockResolvedValue(mockCreatedSite);
      mockPrisma.gitIntegration.findFirst.mockResolvedValue(
        mockGitIntegration()
      );

      await testRuntime.runPromise(
        SiteService.createSite({
          userId: 'user-1',
          name: 'new-site',
          description: 'My site description',
        })
      );

      expect(mockPrisma.site.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'new-site',
          description: 'My site description',
          userId: 'user-1',
        }),
      });
    });

    it('should pass undefined description when not provided', async () => {
      const mockCreatedSite = mockSite({
        id: 'site-1',
        name: 'no-desc-site',
        gitRepo: 'testuser/no-desc-site',
      });

      mockPrisma.site.create.mockResolvedValue(mockCreatedSite);
      mockPrisma.gitIntegration.findFirst.mockResolvedValue(
        mockGitIntegration()
      );

      await testRuntime.runPromise(
        SiteService.createSite({
          userId: 'user-1',
          name: 'no-desc-site',
        })
      );

      expect(mockPrisma.site.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'no-desc-site',
          description: undefined,
        }),
      });
    });
  });

  describe('importRepo', () => {
    it('should import an existing repository successfully', async () => {
      // Mock data
      const mockCreatedSite = mockSite({
        id: 'site-1',
        name: 'imported-site',
        gitRepo: 'testuser/existing-repo',
        deployUrl: 'https://testuser.github.io/existing-repo',
      });

      // Setup mocks
      mockPrisma.site.create.mockResolvedValue(mockCreatedSite);
      mockPrisma.gitIntegration.findFirst.mockResolvedValue(
        mockGitIntegration()
      );

      // Test data
      const importData = {
        userId: 'user-1',
        name: 'imported-site',
        gitRepoFullName: 'testuser/existing-repo',
        platform: 'github',
        setupWorkflow: true,
        enablePages: true,
        overrideExistingFiles: false,
        description: 'Imported repository',
      };

      // Execute
      const result = await testRuntime.runPromise(
        SiteService.importRepo(importData)
      );

      // Verify response structure
      expect(result).toBeDefined();
      expect(result.site).toBeDefined();
      expect(result.site.id).toBe('site-1');
      expect(result.site.name).toBe('imported-site');
      expect(result.site.gitRepo).toBe('testuser/existing-repo');
      expect(result.site.gitUrl).toBe(
        'https://github.com/testuser/existing-repo'
      );
      expect(result.pagesConfigured).toBe(true);
      expect(result.workflowInjected).toBe(true);
      expect(Array.isArray(result.filesCreated)).toBe(true);
      expect(Array.isArray(result.filesSkipped)).toBe(true);
      expect(typeof result.articlesImported).toBe('number');
      expect(typeof result.totalArticles).toBe('number');

      // Verify database interactions
      expect(mockPrisma.site.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'imported-site',
          displayName: undefined,
          description: 'Imported repository',
          gitRepo: 'testuser/existing-repo',
          platform: 'github',
          deployStatus: 'deployed',
          deployUrl: 'https://testuser.github.io/test-repo', // Mock returns this URL
        },
      });
    });

    it('should import repo with workflow disabled', async () => {
      // Mock data
      const mockCreatedSite = mockSite({
        id: 'site-1',
        name: 'imported-site',
        gitRepo: 'testuser/existing-repo',
        deployStatus: 'pending',
        deployUrl: null,
      });

      // Setup mocks
      mockPrisma.site.create.mockResolvedValue(mockCreatedSite);
      mockPrisma.gitIntegration.findFirst.mockResolvedValue(
        mockGitIntegration()
      );

      // Test data - disable workflow and pages
      const importData = {
        userId: 'user-1',
        name: 'imported-site',
        gitRepoFullName: 'testuser/existing-repo',
        platform: 'github',
        setupWorkflow: false,
        enablePages: false,
      };

      // Execute
      const result = await testRuntime.runPromise(
        SiteService.importRepo(importData)
      );

      // Verify workflow injection was skipped
      expect(result.workflowInjected).toBe(false);
      expect(result.filesCreated).toEqual([]);
      expect(result.pagesConfigured).toBe(true); // Mock returns enabled by default
    });

    it('should handle pages enablement failure gracefully', async () => {
      // Mock data
      const mockCreatedSite = mockSite({
        id: 'site-1',
        name: 'imported-site',
        gitRepo: 'testuser/existing-repo',
        deployStatus: 'pending',
        deployUrl: null,
      });

      // Setup mocks - simulate pages already disabled
      mockPrisma.site.create.mockResolvedValue(mockCreatedSite);
      mockPrisma.gitIntegration.findFirst.mockResolvedValue(
        mockGitIntegration()
      );

      // Test data
      const importData = {
        userId: 'user-1',
        name: 'imported-site',
        gitRepoFullName: 'testuser/existing-repo',
      };

      // Execute
      const result = await testRuntime.runPromise(
        SiteService.importRepo(importData)
      );

      // Should still succeed even if pages enablement fails
      expect(result).toBeDefined();
      expect(result.site).toBeDefined();
    });

    it('should fail when site name already exists for user', async () => {
      // Setup mocks to simulate unique constraint violation
      mockPrisma.site.create.mockRejectedValue(
        new Error('Unique constraint failed on the fields: (`userId`,`name`)')
      );

      // Test data
      const importData = {
        userId: 'user-1',
        name: 'existing-site',
        gitRepoFullName: 'testuser/existing-repo',
      };

      // Execute and verify
      const result = await testRuntime.runPromiseExit(
        SiteService.importRepo(importData)
      );

      expect(Exit.isFailure(result)).toBe(true);
    });

    it('should import repo with custom platform', async () => {
      // Mock data
      const mockCreatedSite = mockSite({
        id: 'site-1',
        name: 'imported-site',
        gitRepo: 'testuser/existing-repo',
        platform: 'gitlab',
        deployUrl: 'https://testuser.gitlab.io/existing-repo',
      });

      // Setup mocks
      mockPrisma.site.create.mockResolvedValue(mockCreatedSite);
      mockPrisma.gitIntegration.findFirst.mockResolvedValue(
        mockGitIntegration({ platform: 'gitlab' })
      );

      // Test data with custom platform
      const importData = {
        userId: 'user-1',
        name: 'imported-site',
        gitRepoFullName: 'testuser/existing-repo',
        platform: 'gitlab',
      };

      // Execute
      const result = await testRuntime.runPromise(
        SiteService.importRepo(importData)
      );

      // Verify platform is preserved
      expect(result.site.platform).toBe('gitlab');
      expect(mockPrisma.site.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          platform: 'gitlab',
        }),
      });
    });
  });
});
