import type {
  Article,
  GitIntegration,
  Site,
  User,
} from '../../../generated/prisma/client';

const now = new Date();

export const mockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  avatarUrl: 'https://example.com/avatar.png',
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

export const mockSite = (overrides: Partial<Site> = {}): Site => ({
  id: 'site-1',
  userId: 'user-1',
  name: 'Test Site',
  gitRepo: 'testuser/test-repo',
  platform: 'github',
  deployStatus: 'deployed',
  deployUrl: 'https://testuser.github.io/test-repo',
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

export const mockArticle = (overrides: Partial<Article> = {}): Article => ({
  id: 'article-1',
  siteId: 'site-1',
  title: 'Test Article',
  slug: 'test-article',
  content: 'This is a test article',
  status: 'draft',
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

export const mockGitIntegration = (
  overrides: Partial<GitIntegration> = {}
): GitIntegration => ({
  id: 'git-integration-1',
  userId: 'user-1',
  platform: 'github',
  platformUsername: 'testuser',
  accessToken: 'mock-access-token',
  installationId: null,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});
