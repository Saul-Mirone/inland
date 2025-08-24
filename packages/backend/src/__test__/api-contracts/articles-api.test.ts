import { ManagedRuntime } from 'effect'
import { describe, it, expect, beforeEach } from 'vitest'

import * as ArticleService from '../../services/article'
import { mockPrisma, resetMockPrisma } from '../helpers/mock-database'
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
    it('should return articles array directly for frontend .map() usage', async () => {
      const mockSite = { userId: 'user-1' }
      const mockArticles = [
        {
          id: 'article-1',
          title: 'Article 1',
          slug: 'article-1',
          status: 'published',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'article-2',
          title: 'Article 2',
          slug: 'article-2',
          status: 'draft',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockPrisma.site.findUnique.mockResolvedValue(mockSite)
      mockPrisma.article.findMany.mockResolvedValue(mockArticles)

      const result = await testRuntime.runPromise(
        ArticleService.findSiteArticles('site-1', 'user-1')
      )

      // Critical: Must be an array for frontend usage
      expect(Array.isArray(result)).toBe(true)
      expect(result.map).toBeDefined()
      expect(result.length).toBe(2)

      // Should work with frontend array methods
      expect(() => result.map((a) => a.title)).not.toThrow()
      expect(() => result.filter((a) => a.status === 'published')).not.toThrow()
      expect(() => result.find((a) => a.id === 'article-1')).not.toThrow()

      // Verify response shape
      expect(result[0]).toHaveProperty('id')
      expect(result[0]).toHaveProperty('title')
      expect(result[0]).toHaveProperty('slug')
      expect(result[0]).toHaveProperty('status')
    })

    it('should return empty array when no articles exist', async () => {
      const mockSite = { userId: 'user-1' }
      mockPrisma.site.findUnique.mockResolvedValue(mockSite)
      mockPrisma.article.findMany.mockResolvedValue([])

      const result = await testRuntime.runPromise(
        ArticleService.findSiteArticles('site-1', 'user-1')
      )

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(0)
      expect(() => result.map((a) => a.id)).not.toThrow()
    })
  })

  describe('GET /users/{userId}/articles', () => {
    it('should return articles array directly for frontend .map() usage', async () => {
      const mockArticles = [
        {
          id: 'article-1',
          title: 'User Article',
          slug: 'user-article',
          status: 'published',
          createdAt: new Date(),
          updatedAt: new Date(),
          site: {
            id: 'site-1',
            name: 'Site',
            userId: 'user-1',
            gitRepo: 'repo',
          },
        },
      ]

      mockPrisma.article.findMany.mockResolvedValue(mockArticles)

      const result = await testRuntime.runPromise(
        ArticleService.findUserArticles('user-1')
      )

      // Critical: Must be an array for frontend usage
      expect(Array.isArray(result)).toBe(true)
      expect(result.map).toBeDefined()
      expect(result.length).toBe(1)

      // Should work with frontend array methods
      expect(() => result.map((a) => a.title)).not.toThrow()

      // Verify response shape includes site data
      expect(result[0]).toHaveProperty('site')
      expect(result[0].site).toHaveProperty('id')
      expect(result[0].site).toHaveProperty('name')
    })
  })

  describe('GET /articles/{articleId}', () => {
    it('should return article object directly', async () => {
      const mockArticle = {
        id: 'article-1',
        title: 'Single Article',
        slug: 'single-article',
        content: 'Article content',
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date(),
        site: { id: 'site-1', name: 'Site', userId: 'user-1', gitRepo: 'repo' },
      }

      mockPrisma.article.findUnique.mockResolvedValue(mockArticle)

      const result = await testRuntime.runPromise(
        ArticleService.findArticleById('article-1')
      )

      // Should return article object directly, not wrapped
      expect(Array.isArray(result)).toBe(false)
      expect(result).toEqual(mockArticle)
      expect(result.id).toBe('article-1')
      expect(result.title).toBe('Single Article')
      expect(result.site).toBeDefined()
    })
  })

  describe('POST /articles', () => {
    it('should return created article object directly', async () => {
      const mockSite = { userId: 'user-1' }
      const mockCreatedArticle = {
        id: 'article-1',
        title: 'New Article',
        slug: 'new-article',
        content: 'New content',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        site: { id: 'site-1', name: 'Site', userId: 'user-1', gitRepo: 'repo' },
      }

      mockPrisma.site.findUnique.mockResolvedValue(mockSite)
      mockPrisma.article.create.mockResolvedValue(mockCreatedArticle)

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
      expect(result).toEqual(mockCreatedArticle)
      expect(result.id).toBeDefined()
      expect(result.title).toBe('New Article')
    })
  })

  describe('Regression Prevention', () => {
    it('prevents accidental wrapping of array responses', async () => {
      // This test specifically prevents the regression we just fixed
      const mockSite = { userId: 'user-1' }
      const mockArticles = [{ id: 'test' }]

      mockPrisma.site.findUnique.mockResolvedValue(mockSite)
      mockPrisma.article.findMany.mockResolvedValue(mockArticles)

      const result = await testRuntime.runPromise(
        ArticleService.findSiteArticles('site-1', 'user-1')
      )

      // Should NOT be wrapped like { articles: [...] }
      expect(result).not.toHaveProperty('articles')
      expect(result[0]).toHaveProperty('id', 'test')
    })

    it('prevents accidental unwrapping of object responses', async () => {
      const mockArticle = {
        id: 'article-1',
        title: 'Test',
        site: { id: 'site-1' },
      }

      mockPrisma.article.findUnique.mockResolvedValue(mockArticle)

      const result = await testRuntime.runPromise(
        ArticleService.findArticleById('article-1')
      )

      // Should be the object directly, not an array or wrapped
      expect(Array.isArray(result)).toBe(false)
      expect(result.id).toBe('article-1')
      expect(result.title).toBe('Test')
    })
  })
})
