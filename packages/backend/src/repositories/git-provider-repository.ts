import { Context, Data, type Effect } from 'effect';

// Common Git provider types (platform-agnostic)
export interface GitRepo {
  readonly id: string | number;
  readonly name: string;
  readonly fullName: string;
  readonly htmlUrl: string;
  readonly cloneUrl: string;
  readonly pagesUrl?: string;
  readonly defaultBranch: string;
}

export interface CreateRepoData {
  readonly name: string;
  readonly description?: string;
  readonly templateOwner?: string;
  readonly templateRepo?: string;
}

export interface TemplateData {
  readonly siteName: string;
  readonly siteDescription: string;
  readonly siteNameSlug: string;
  readonly siteAuthor: string;
  readonly platformUsername: string;
}

export interface SiteConfig {
  readonly name: string;
  readonly description: string;
  readonly url: string;
  readonly author: string;
  readonly avatarUrl: string;
  readonly authorUrl: string;
}

export interface GitFile {
  readonly path: string;
  readonly sha: string;
  readonly content?: string;
}

export interface ImportedArticle {
  readonly title: string;
  readonly slug: string;
  readonly content: string;
  readonly excerpt?: string;
  readonly tags?: string;
  readonly status: 'draft' | 'published';
  readonly date?: string;
  readonly gitSha?: string;
}

export interface ImportedMedia {
  readonly filePath: string;
  readonly filename: string;
  readonly sha: string;
  readonly size: number;
}

// Git provider errors
export class GitProviderError extends Data.TaggedError('GitProviderError')<{
  readonly message: string;
  readonly status?: number;
}> {}

export class RepositoryCreationError extends Data.TaggedError(
  'RepositoryCreationError'
)<{
  readonly repoName: string;
  readonly reason: string;
}> {}

export class PagesDeploymentError extends Data.TaggedError(
  'PagesDeploymentError'
)<{
  readonly repoName: string;
  readonly reason: string;
}> {}

// Main Git provider interface (platform-agnostic)
export interface GitProviderRepositoryService {
  /**
   * Create a repository with Pages enabled from a template
   */
  readonly createRepositoryWithPages: (
    accessToken: string,
    data: CreateRepoData,
    templateData?: TemplateData
  ) => Effect.Effect<GitRepo, RepositoryCreationError | GitProviderError>;

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
  >;

  /**
   * Get markdown files from repository for import
   */
  readonly getMarkdownFilesFromRepo: (
    accessToken: string,
    repoFullName: string,
    defaultBranch: string
  ) => Effect.Effect<ImportedArticle[], GitProviderError>;

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
      published: boolean;
      filePath: string;
      commitSha: string;
      blobSha: string;
      wasUpdate: boolean;
    },
    GitProviderError
  >;

  /**
   * Get the blob SHA of an article file in the repository
   */
  readonly getArticleFileSha: (
    accessToken: string,
    repoFullName: string,
    articleSlug: string
  ) => Effect.Effect<string | null, GitProviderError>;

  /**
   * Get repository information
   */
  readonly getRepositoryInfo: (
    accessToken: string,
    repoFullName: string
  ) => Effect.Effect<
    { defaultBranch: string; [key: string]: unknown },
    GitProviderError
  >;

  /**
   * Check if Pages is enabled for the repository
   */
  readonly checkPagesStatus: (
    accessToken: string,
    repoFullName: string
  ) => Effect.Effect<
    { enabled: boolean; url?: string; source?: string },
    GitProviderError
  >;

  /**
   * Inject Inland CMS workflow files into the repository
   */
  readonly injectInlandWorkflow: (
    accessToken: string,
    repoFullName: string,
    templateData: TemplateData,
    options?: { overrideExistingFiles?: boolean }
  ) => Effect.Effect<
    { filesCreated: string[]; filesSkipped: string[]; workflowUrl: string },
    GitProviderError
  >;

  /**
   * Enable Pages for the repository
   */
  readonly enablePages: (
    accessToken: string,
    repoFullName: string
  ) => Effect.Effect<string, GitProviderError>;

  /**
   * Upload a file (binary or text) to the repository
   */
  readonly uploadFileToRepo: (
    accessToken: string,
    repoFullName: string,
    opts: {
      filePath: string;
      base64Content: string;
      commitMessage: string;
    }
  ) => Effect.Effect<
    { filePath: string; blobSha: string; commitSha: string },
    GitProviderError
  >;

  /**
   * Get image files from repository for import
   */
  readonly getMediaFilesFromRepo: (
    accessToken: string,
    repoFullName: string,
    defaultBranch: string
  ) => Effect.Effect<ImportedMedia[], GitProviderError>;

  /**
   * Push inland.config.json to the repository
   */
  readonly pushSiteConfig: (
    accessToken: string,
    repoFullName: string,
    config: SiteConfig
  ) => Effect.Effect<{ filePath: string; commitSha: string }, GitProviderError>;

  /**
   * Delete a file from the repository
   */
  readonly deleteFileFromRepo: (
    accessToken: string,
    repoFullName: string,
    opts: {
      filePath: string;
      commitMessage: string;
    }
  ) => Effect.Effect<{ deleted: boolean; reason?: string }, GitProviderError>;
}

// Effect Context for dependency injection
export class GitProviderRepository extends Context.Tag('GitProviderRepository')<
  GitProviderRepository,
  GitProviderRepositoryService
>() {}
