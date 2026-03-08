import { ManagedRuntime } from 'effect'
import { describe, it, expect, beforeEach } from 'vitest'

import * as ArticleService from '../../services/article'
import { mockPrisma, resetMockPrisma } from '../helpers/mock-database'
import { mockArticle, mockSite } from '../helpers/mock-factories'
import { TestRepositoryLayer } from '../helpers/test-layers'

/**
 * Articles API Contract Tests
 *
 * Tests the data contracts for /articles routes to ensure
 * frontend compatibility and prevent regression bugs.
 */

const testRuntime = ManagedRuntime.make(TestRepositoryLayer)

describe('Articles API Contracts', () => {
  beforeEach(() => {
    resetMockPrisma()
  })

  describe('GET /sites/{siteId}/articles', () => {
    it('should return paginated result with items array for frontend usage', async () => {
      const mockArticles = [
        mockArticle({
          id: 'article-1',
          title: 'Article 1',
          slug: 'article-1',
          status: 'published',
        }),
        mockArticle({
          id: 'article-2',
          title: 'Article 2',
          slug: 'article-2',
          status: 'draft',
        }),
      ]

      mockPrisma.site.findUnique.mockResolvedValue(mockSite())
      mockPrisma.$transaction.mockResolvedValue([mockArticles, 2])

      const result = await testRuntime.runPromise(
        ArticleService.findSiteArticles('site-1', 'user-1')
      )

      // Critical: Must return paginated result
      expect(result).toHaveProperty('items')
      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('page')
      expect(result).toHaveProperty('limit')
      expect(result).toHaveProperty('totalPages')
      expect(Array.isArray(result.items)).toBe(true)
      expect(result.items.length).toBe(2)

      // Should work with frontend array methods on items
      expect(() => result.items.map((a) => a.title)).not.toThrow()
      expect(() =>
        result.items.filter((a) => a.status === 'published')
      ).not.toThrow()
      expect(() => result.items.find((a) => a.id === 'article-1')).not.toThrow()

      // Verify response shape
      expect(result.items[0]).toHaveProperty('id')
      expect(result.items[0]).toHaveProperty('title')
      expect(result.items[0]).toHaveProperty('slug')
      expect(result.items[0]).toHaveProperty('status')
    })

    it('should return empty items when no articles exist', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(mockSite())
      mockPrisma.$transaction.mockResolvedValue([[], 0])

      const result = await testRuntime.runPromise(
        ArticleService.findSiteArticles('site-1', 'user-1')
      )

      expect(Array.isArray(result.items)).toBe(true)
      expect(result.items.length).toBe(0)
      expect(result.total).toBe(0)
      expect(() => result.items.map((a) => a.id)).not.toThrow()
    })
  })

  describe('GET /users/{userId}/articles', () => {
    it('should return paginated result with items array for frontend usage', async () => {
      const mockArticles = [
        mockArticle({
          id: 'article-1',
          title: 'User Article',
          slug: 'user-article',
          status: 'published',
        }),
      ]

      mockPrisma.$transaction.mockResolvedValue([mockArticles, 1])

      const result = await testRuntime.runPromise(
        ArticleService.findUserArticles('user-1')
      )

      // Critical: Must return paginated result
      expect(result).toHaveProperty('items')
      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('page')
      expect(Array.isArray(result.items)).toBe(true)
      expect(result.items.length).toBe(1)

      // Should work with frontend array methods on items
      expect(() => result.items.map((a) => a.title)).not.toThrow()

      // Verify response shape includes site data
      expect(result.items[0]).toHaveProperty('id')
      expect(result.items[0]).toHaveProperty('title')
    })
  })

  describe('GET /articles/{articleId}', () => {
    it('should return article object directly', async () => {
      const article = {
        ...mockArticle({
          id: 'article-1',
          title: 'Single Article',
          slug: 'single-article',
          content: 'Article content',
          status: 'published',
        }),
        site: {
          id: 'site-1',
          name: 'Test Site',
          userId: 'user-1',
          gitRepo: 'user/repo',
        },
      }

      mockPrisma.article.findUnique.mockResolvedValue(article)

      const result = await testRuntime.runPromise(
        ArticleService.findArticleById('article-1', 'user-1')
      )

      // Should return article object directly, not wrapped
      expect(Array.isArray(result)).toBe(false)
      expect(result).toEqual(article)
      expect(result.id).toBe('article-1')
      expect(result.title).toBe('Single Article')
    })
  })

  describe('POST /articles', () => {
    it('should return created article object directly', async () => {
      const createdArticle = mockArticle({
        id: 'article-1',
        title: 'New Article',
        slug: 'new-article',
        content: 'New content',
        status: 'draft',
      })

      mockPrisma.site.findUnique.mockResolvedValue(mockSite())
      mockPrisma.article.create.mockResolvedValue(createdArticle)

      const result = await testRuntime.runPromise(
        ArticleService.createArticle('user-1', {
          siteId: 'site-1',
          title: 'New Article',
          slug: 'new-article',
          content: 'New content',
          status: 'draft',
        })
      )

      // Should return article object directly
      expect(Array.isArray(result)).toBe(false)
      expect(result).toEqual(createdArticle)
      expect(result.id).toBeDefined()
      expect(result.title).toBe('New Article')
    })
  })

  describe('Regression Prevention', () => {
    it('returns paginated result with items array for list endpoints', async () => {
      const mockArticles = [mockArticle({ id: 'test' })]

      mockPrisma.site.findUnique.mockResolvedValue(mockSite())
      mockPrisma.$transaction.mockResolvedValue([mockArticles, 1])

      const result = await testRuntime.runPromise(
        ArticleService.findSiteArticles('site-1', 'user-1')
      )

      // Should be a paginated result with items
      expect(result).toHaveProperty('items')
      expect(result).toHaveProperty('total')
      expect(result.items[0]).toHaveProperty('id', 'test')
    })

    it('prevents accidental unwrapping of object responses', async () => {
      const article = {
        ...mockArticle({
          id: 'article-1',
          title: 'Test',
        }),
        site: {
          id: 'site-1',
          name: 'Test Site',
          userId: 'user-1',
          gitRepo: 'user/repo',
        },
      }

      mockPrisma.article.findUnique.mockResolvedValue(article)

      const result = await testRuntime.runPromise(
        ArticleService.findArticleById('article-1', 'user-1')
      )

      // Should be the object directly, not an array or wrapped
      expect(Array.isArray(result)).toBe(false)
      expect(result.id).toBe('article-1')
      expect(result.title).toBe('Test')
    })
  })
})
