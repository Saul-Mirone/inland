import { Effect, Layer } from 'effect'

import {
  GitProviderRepository,
  type GitProviderRepositoryService,
  type GitRepo,
  type CreateRepoData,
  type TemplateData,
  type ImportedArticle,
  type GitHubUser,
} from '../../repositories/git-provider-repository'

// Mock implementation for testing
export const makeMockGitProvider = (): GitProviderRepositoryService => ({
  createRepositoryWithPages: (
    _accessToken: string,
    data: CreateRepoData,
    _templateData?: TemplateData
  ) =>
    Effect.succeed({
      id: 12345,
      name: data.name,
      fullName: `testuser/${data.name}`,
      htmlUrl: `https://github.com/testuser/${data.name}`,
      cloneUrl: `https://github.com/testuser/${data.name}.git`,
      defaultBranch: 'main',
      pagesUrl: `https://testuser.github.io/${data.name}`,
    } as GitRepo),

  deleteArticleFromRepo: (
    _accessToken: string,
    _repoFullName: string,
    articleSlug: string
  ) =>
    Effect.succeed({
      deleted: true,
      filePath: `content/${articleSlug}.md`,
    }),

  getMarkdownFilesFromRepo: (
    _accessToken: string,
    _repoFullName: string,
    _defaultBranch: string
  ) =>
    Effect.succeed([
      {
        title: 'Test Article',
        slug: 'test-article',
        content: 'This is a test article content.',
        status: 'published' as const,
      },
    ] as ImportedArticle[]),

  publishArticleToRepo: (
    _accessToken: string,
    _repoFullName: string,
    articleSlug: string,
    _markdownContent: string
  ) =>
    Effect.succeed({
      published: true,
      filePath: `content/${articleSlug}.md`,
      commitSha: 'abc123def456',
      wasUpdate: false,
    }),

  getRepositoryInfo: (_accessToken: string, repoFullName: string) =>
    Effect.succeed({
      defaultBranch: 'main',
      id: 12345,
      name: repoFullName.split('/')[1],
      full_name: repoFullName,
    }),

  fetchGitHubUser: (_accessToken: string) =>
    Effect.succeed({
      id: 12345,
      login: 'testuser',
      email: 'test@example.com',
      avatar_url: 'https://github.com/images/test-avatar.jpg',
    } as GitHubUser),

  fetchGitHubUserEmail: (_accessToken: string) =>
    Effect.succeed('test@example.com'),

  validateGitHubToken: (_accessToken: string) =>
    Effect.succeed({
      isValid: true,
    }),
})

// Mock layer for testing
export const MockGitProviderLive = Layer.succeed(
  GitProviderRepository,
  makeMockGitProvider()
)
