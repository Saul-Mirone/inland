import { ManagedRuntime, Exit } from 'effect'
import { describe, it, expect, beforeEach } from 'vitest'

import * as ArticleService from '../../services/article'
import { mockPrisma, resetMockPrisma } from '../helpers/mock-database'
import { mockArticle, mockSite } from '../helpers/mock-factories'
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
      const mockArticleWithSite = {
        ...mockArticle({
          id: 'article-1',
          siteId: 'site-1',
          title: 'Test Article',
          slug: 'test-article',
          content: 'This is a test article',
          status: 'draft',
        }),
        site: {
          id: 'site-1',
          name: 'Test Site',
          userId: 'user-1',
          gitRepo: 'user/repo',
        },
      }

      // Setup mocks
      mockPrisma.site.findUnique.mockResolvedValue(mockSite())
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
      // Setup mocks
      mockPrisma.site.findUnique.mockResolvedValue(
        mockSite({ userId: 'other-user' })
      )

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
        ...mockArticle({
          id: 'article-1',
          siteId: 'site-1',
          title: 'Test Article',
          slug: 'test-article',
          content: 'This is a test article',
          status: 'published',
        }),
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
        ArticleService.findArticleById('article-1', 'user-1')
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
        ArticleService.findArticleById('nonexistent-article', 'user-1')
      )

      expect(Exit.isFailure(result)).toBe(true)
    })
  })

  describe('API Contract Tests', () => {
    describe('findSiteArticles', () => {
      it('should return paginated result with items array', async () => {
        // Mock data
        const mockArticles = [
          mockArticle({
            id: 'article-1',
            title: 'Test Article 1',
            slug: 'test-article-1',
            status: 'published',
          }),
          mockArticle({
            id: 'article-2',
            title: 'Test Article 2',
            slug: 'test-article-2',
            status: 'draft',
          }),
        ]

        // Setup mocks
        mockPrisma.site.findUnique.mockResolvedValue(mockSite())
        mockPrisma.$transaction.mockResolvedValue([mockArticles, 2])

        // Execute
        const result = await testRuntime.runPromise(
          ArticleService.findSiteArticles('site-1', 'user-1')
        )

        // Verify paginated result structure
        expect(result).toHaveProperty('items')
        expect(result).toHaveProperty('total')
        expect(result).toHaveProperty('page')
        expect(result).toHaveProperty('limit')
        expect(result).toHaveProperty('totalPages')
        expect(Array.isArray(result.items)).toBe(true)
        expect(result.items).toEqual(mockArticles)
        expect(result.items.length).toBe(2)
        expect(result.total).toBe(2)

        // Verify items can be used like an array
        const titles = result.items.map((article) => article.title)
        expect(titles).toEqual(['Test Article 1', 'Test Article 2'])
      })
    })

    describe('findUserArticles', () => {
      it('should return paginated result with items array', async () => {
        // Mock data
        const mockArticles = [
          {
            ...mockArticle({
              id: 'article-1',
              siteId: 'site-1',
              title: 'User Article 1',
              slug: 'user-article-1',
              content: 'Content 1',
              status: 'published',
            }),
            site: {
              id: 'site-1',
              name: 'Test Site',
              userId: 'user-1',
              gitRepo: 'user/repo',
            },
          },
        ]

        // Setup mocks
        mockPrisma.$transaction.mockResolvedValue([mockArticles, 1])

        // Execute
        const result = await testRuntime.runPromise(
          ArticleService.findUserArticles('user-1')
        )

        // Verify paginated result structure
        expect(result).toHaveProperty('items')
        expect(result).toHaveProperty('total')
        expect(result).toHaveProperty('page')
        expect(result).toHaveProperty('limit')
        expect(result).toHaveProperty('totalPages')
        expect(Array.isArray(result.items)).toBe(true)
        expect(result.items).toEqual(mockArticles)
        expect(result.items.length).toBe(1)

        // Verify items can be used like an array
        const articleIds = result.items.map((article) => article.id)
        expect(articleIds).toEqual(['article-1'])
      })
    })
  })
})
