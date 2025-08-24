import { ManagedRuntime, Exit } from 'effect'
import { describe, it, expect, beforeEach } from 'vitest'

import * as ArticleService from '../../services/article'
import { mockPrisma, resetMockPrisma } from '../helpers/mock-database'
import { TestRepositoryLayer } from '../helpers/test-layers'

// Create test runtime
const testRuntime = ManagedRuntime.make(TestRepositoryLayer)

describe('ArticleService', () => {
  beforeEach(() => {
    resetMockPrisma()
  })

  describe('createArticle', () => {
    it('should create an article successfully', async () => {
      // Mock data
      const mockSite = {
        userId: 'user-1',
      }

      const mockArticleWithSite = {
        id: 'article-1',
        siteId: 'site-1',
        title: 'Test Article',
        slug: 'test-article',
        content: 'This is a test article',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        site: {
          id: 'site-1',
          name: 'Test Site',
          userId: 'user-1',
          gitRepo: 'user/repo',
        },
      }

      // Setup mocks
      mockPrisma.site.findUnique.mockResolvedValue(mockSite)
      mockPrisma.article.create.mockResolvedValue(mockArticleWithSite)

      // Test data
      const articleData = {
        siteId: 'site-1',
        title: 'Test Article',
        slug: 'test-article',
        content: 'This is a test article',
        status: 'draft' as const,
      }
      const userId = 'user-1'

      // Execute
      const result = await testRuntime.runPromise(
        ArticleService.createArticle(userId, articleData)
      )

      // Verify
      expect(result).toEqual(mockArticleWithSite)
      expect(mockPrisma.site.findUnique).toHaveBeenCalledWith({
        where: { id: 'site-1' },
        select: { userId: true },
      })
      expect(mockPrisma.article.create).toHaveBeenCalledWith({
        data: {
          siteId: 'site-1',
          title: 'Test Article',
          slug: 'test-article',
          content: 'This is a test article',
          status: 'draft',
        },
        include: {
          site: {
            select: {
              id: true,
              name: true,
              userId: true,
              gitRepo: true,
            },
          },
        },
      })
    })

    it('should fail when site is not found', async () => {
      // Setup mocks
      mockPrisma.site.findUnique.mockResolvedValue(null)

      // Test data
      const articleData = {
        siteId: 'nonexistent-site',
        title: 'Test Article',
        slug: 'test-article',
        content: 'This is a test article',
        status: 'draft' as const,
      }
      const userId = 'user-1'

      // Execute and verify
      const result = await testRuntime.runPromiseExit(
        ArticleService.createArticle(userId, articleData)
      )

      expect(Exit.isFailure(result)).toBe(true)
    })

    it('should fail when user does not have access to site', async () => {
      // Mock data
      const mockSite = {
        userId: 'other-user',
      }

      // Setup mocks
      mockPrisma.site.findUnique.mockResolvedValue(mockSite)

      // Test data
      const articleData = {
        siteId: 'site-1',
        title: 'Test Article',
        slug: 'test-article',
        content: 'This is a test article',
        status: 'draft' as const,
      }
      const userId = 'user-1'

      // Execute and verify
      const result = await testRuntime.runPromiseExit(
        ArticleService.createArticle(userId, articleData)
      )

      expect(Exit.isFailure(result)).toBe(true)
    })
  })

  describe('findArticleById', () => {
    it('should find an article by id', async () => {
      // Mock data
      const mockArticleWithSite = {
        id: 'article-1',
        siteId: 'site-1',
        title: 'Test Article',
        slug: 'test-article',
        content: 'This is a test article',
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date(),
        site: {
          id: 'site-1',
          name: 'Test Site',
          userId: 'user-1',
          gitRepo: 'user/repo',
        },
      }

      // Setup mocks
      mockPrisma.article.findUnique.mockResolvedValue(mockArticleWithSite)

      // Execute
      const result = await testRuntime.runPromise(
        ArticleService.findArticleById('article-1')
      )

      // Verify
      expect(result).toEqual(mockArticleWithSite)
      expect(mockPrisma.article.findUnique).toHaveBeenCalledWith({
        where: { id: 'article-1' },
        include: {
          site: {
            select: {
              id: true,
              name: true,
              userId: true,
              gitRepo: true,
            },
          },
        },
      })
    })

    it('should return null when article is not found', async () => {
      // Setup mocks
      mockPrisma.article.findUnique.mockResolvedValue(null)

      // Execute and verify
      const result = await testRuntime.runPromiseExit(
        ArticleService.findArticleById('nonexistent-article')
      )

      expect(Exit.isFailure(result)).toBe(true)
    })
  })

  describe('API Contract Tests', () => {
    describe('findSiteArticles', () => {
      it('should return articles array directly (not wrapped in object)', async () => {
        // Mock data
        const mockArticles = [
          {
            id: 'article-1',
            title: 'Test Article 1',
            slug: 'test-article-1',
            status: 'published',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'article-2',
            title: 'Test Article 2',
            slug: 'test-article-2',
            status: 'draft',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]

        const mockSite = { userId: 'user-1' }

        // Setup mocks
        mockPrisma.site.findUnique.mockResolvedValue(mockSite)
        mockPrisma.article.findMany.mockResolvedValue(mockArticles)

        // Execute
        const result = await testRuntime.runPromise(
          ArticleService.findSiteArticles('site-1', 'user-1')
        )

        // Verify API contract: should return array directly, not wrapped
        expect(Array.isArray(result)).toBe(true)
        expect(result).toEqual(mockArticles)
        expect(result.map).toBeDefined() // Should be able to call .map()
        expect(result.length).toBe(2)

        // Verify it can be used like an array (preventing regression)
        const titles = result.map((article) => article.title)
        expect(titles).toEqual(['Test Article 1', 'Test Article 2'])
      })
    })

    describe('findUserArticles', () => {
      it('should return articles array directly (not wrapped in object)', async () => {
        // Mock data
        const mockArticles = [
          {
            id: 'article-1',
            siteId: 'site-1',
            title: 'User Article 1',
            slug: 'user-article-1',
            content: 'Content 1',
            status: 'published',
            createdAt: new Date(),
            updatedAt: new Date(),
            site: {
              id: 'site-1',
              name: 'Test Site',
              userId: 'user-1',
              gitRepo: 'user/repo',
            },
          },
        ]

        // Setup mocks
        mockPrisma.article.findMany.mockResolvedValue(mockArticles)

        // Execute
        const result = await testRuntime.runPromise(
          ArticleService.findUserArticles('user-1')
        )

        // Verify API contract: should return array directly, not wrapped
        expect(Array.isArray(result)).toBe(true)
        expect(result).toEqual(mockArticles)
        expect(result.map).toBeDefined() // Should be able to call .map()
        expect(result.length).toBe(1)

        // Verify it can be used like an array (preventing regression)
        const articleIds = result.map((article) => article.id)
        expect(articleIds).toEqual(['article-1'])
      })
    })
  })
})
