import { Context, type Effect } from 'effect'

// Common Git provider types
export interface GitRepo {
  readonly id: string | number
  readonly name: string
  readonly fullName: string
  readonly htmlUrl: string
  readonly cloneUrl: string
  readonly pagesUrl?: string
  readonly defaultBranch: string
}

export interface CreateRepoData {
  readonly name: string
  readonly description?: string
  readonly templateOwner?: string
  readonly templateRepo?: string
}

export interface TemplateData {
  readonly siteName: string
  readonly siteDescription: string
  readonly siteNameSlug: string
  readonly siteAuthor: string
  readonly githubUsername: string
}

export interface GitFile {
  readonly path: string
  readonly sha: string
  readonly content?: string
}

export interface ImportedArticle {
  readonly title: string
  readonly slug: string
  readonly content: string
  readonly status: 'draft' | 'published'
}

// Git provider errors
export interface GitProviderError {
  readonly message: string
  readonly status?: number
}

export interface RepositoryCreationError {
  readonly repoName: string
  readonly reason: string
}

export interface PagesDeploymentError {
  readonly repoName: string
  readonly reason: string
}

// GitHub user authentication types
export interface GitHubUser {
  readonly id: number
  readonly login: string
  readonly email: string | null
  readonly avatar_url: string
}

export interface GitHubEmail {
  readonly email: string
  readonly primary: boolean
  readonly verified: boolean
}

export interface GitHubTokenValidationResult {
  readonly isValid: boolean
  readonly reason?: string
}

// Main Git provider interface
export interface GitProviderRepositoryService {
  /**
   * Create a repository with Pages enabled from a template
   */
  readonly createRepositoryWithPages: (
    accessToken: string,
    data: CreateRepoData,
    templateData?: TemplateData
  ) => Effect.Effect<GitRepo, RepositoryCreationError | GitProviderError>

  /**
   * Delete an article file from the repository
   */
  readonly deleteArticleFromRepo: (
    accessToken: string,
    repoFullName: string,
    articleSlug: string
  ) => Effect.Effect<
    { deleted: boolean; reason?: string; filePath?: string },
    GitProviderError
  >

  /**
   * Get markdown files from repository for import
   */
  readonly getMarkdownFilesFromRepo: (
    accessToken: string,
    repoFullName: string,
    defaultBranch: string
  ) => Effect.Effect<ImportedArticle[], GitProviderError>

  /**
   * Publish article content to repository
   */
  readonly publishArticleToRepo: (
    accessToken: string,
    repoFullName: string,
    articleSlug: string,
    markdownContent: string
  ) => Effect.Effect<
    {
      published: boolean
      filePath: string
      commitSha: string
      wasUpdate: boolean
    },
    GitProviderError
  >

  /**
   * Get repository information
   */
  readonly getRepositoryInfo: (
    accessToken: string,
    repoFullName: string
  ) => Effect.Effect<
    { defaultBranch: string; [key: string]: unknown },
    GitProviderError
  >

  /**
   * Fetch GitHub user information
   */
  readonly fetchGitHubUser: (
    accessToken: string
  ) => Effect.Effect<GitHubUser, GitProviderError>

  /**
   * Fetch GitHub user email information
   */
  readonly fetchGitHubUserEmail: (
    accessToken: string
  ) => Effect.Effect<string | null, GitProviderError>

  /**
   * Validate GitHub access token
   */
  readonly validateGitHubToken: (
    accessToken: string
  ) => Effect.Effect<GitHubTokenValidationResult, GitProviderError>
}

// Effect Context for dependency injection
export const GitProviderRepository =
  Context.GenericTag<GitProviderRepositoryService>(
    '@services/GitProviderRepository'
  )
