import type { Article } from '@/model/articles-model';
import type { AuthUser } from '@/model/auth-model';
import type { SiteWithCounts } from '@/model/sites-model';

export const mockArticle = (overrides?: Partial<Article>): Article => ({
  id: 'article-1',
  title: 'Test Article',
  slug: 'test-article',
  content: 'Test content',
  status: 'draft',
  siteId: 'site-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  site: { id: 'site-1', name: 'Test Site' },
  ...overrides,
});

export const mockSite = (
  overrides?: Partial<SiteWithCounts>
): SiteWithCounts => ({
  id: 'site-1',
  name: 'Test Site',
  gitRepo: 'user/repo',
  platform: 'github',
  deployStatus: 'active',
  createdAt: '2026-01-01T00:00:00Z',
  _count: { articles: 0, media: 0 },
  ...overrides,
});

export const mockUser = (overrides?: Partial<AuthUser>): AuthUser => ({
  id: 'user-1',
  username: 'testuser',
  displayName: 'Test User',
  email: 'test@example.com',
  avatarUrl: null,
  createdAt: '2026-01-01T00:00:00Z',
  gitIntegrations: [{ platform: 'github', platformUsername: 'testuser' }],
  ...overrides,
});
