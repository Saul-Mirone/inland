import { ManagedRuntime, Effect } from 'effect';
import { describe, it, expect } from 'vitest';

import { GitProviderRepository } from '../../repositories/git-provider-repository';
import { MockGitProviderLive } from '../helpers/mock-git-provider';

// Create test runtime with GitProvider
const testRuntime = ManagedRuntime.make(MockGitProviderLive);

describe('GitProviderRepository', () => {
  describe('enablePages', () => {
    it('should enable pages for a repository successfully', async () => {
      const effect = Effect.gen(function* () {
        const gitProvider = yield* GitProviderRepository;
        return yield* gitProvider.enablePages(
          'test-token',
          'testuser/test-repo'
        );
      });

      const result = await testRuntime.runPromise(effect);

      expect(result).toBe('https://testuser.github.io/test-repo');
    });

    it('should handle different repository names correctly', async () => {
      const effect = Effect.gen(function* () {
        const gitProvider = yield* GitProviderRepository;
        return yield* gitProvider.enablePages(
          'test-token',
          'myorg/my-awesome-project'
        );
      });

      const result = await testRuntime.runPromise(effect);

      expect(result).toBe('https://testuser.github.io/my-awesome-project');
    });

    it('should work with repository names containing hyphens', async () => {
      const effect = Effect.gen(function* () {
        const gitProvider = yield* GitProviderRepository;
        return yield* gitProvider.enablePages(
          'test-token',
          'user/my-project-name'
        );
      });

      const result = await testRuntime.runPromise(effect);

      expect(result).toBe('https://testuser.github.io/my-project-name');
    });
  });

  describe('getRepositoryInfo', () => {
    it('should get repository information successfully', async () => {
      const effect = Effect.gen(function* () {
        const gitProvider = yield* GitProviderRepository;
        return yield* gitProvider.getRepositoryInfo(
          'test-token',
          'testuser/test-repo'
        );
      });

      const result = await testRuntime.runPromise(effect);

      expect(result).toBeDefined();
      expect(result.defaultBranch).toBe('main');
      expect(result.id).toBe(12345);
      expect(result.name).toBe('test-repo');
      expect(result.full_name).toBe('testuser/test-repo');
    });
  });

  describe('checkPagesStatus', () => {
    it('should check pages status successfully', async () => {
      const effect = Effect.gen(function* () {
        const gitProvider = yield* GitProviderRepository;
        return yield* gitProvider.checkPagesStatus(
          'test-token',
          'testuser/test-repo'
        );
      });

      const result = await testRuntime.runPromise(effect);

      expect(result).toBeDefined();
      expect(result.enabled).toBe(true);
      expect(result.url).toBe('https://testuser.github.io/test-repo');
      expect(result.source).toBe('workflow');
    });
  });

  describe('injectInlandWorkflow', () => {
    it('should inject workflow files successfully', async () => {
      const templateData = {
        siteName: 'Test Site',
        siteDescription: 'Test Description',
        siteNameSlug: 'test-site',
        siteAuthor: 'Test Author',
        platformUsername: 'testuser',
      };

      const effect = Effect.gen(function* () {
        const gitProvider = yield* GitProviderRepository;
        return yield* gitProvider.injectInlandWorkflow(
          'test-token',
          'testuser/test-repo',
          templateData
        );
      });

      const result = await testRuntime.runPromise(effect);

      expect(result).toBeDefined();
      expect(Array.isArray(result.filesCreated)).toBe(true);
      expect(result.filesCreated.length).toBeGreaterThan(0);
      expect(result.filesCreated).toContain('.github/workflows/deploy.yml');
      expect(result.filesCreated).toContain('build/index.js');
      expect(Array.isArray(result.filesSkipped)).toBe(true);
      expect(result.workflowUrl).toBe(
        'https://github.com/testuser/test-repo/actions'
      );
    });

    it('should handle workflow injection with override option', async () => {
      const templateData = {
        siteName: 'Test Site',
        siteDescription: 'Test Description',
        siteNameSlug: 'test-site',
        siteAuthor: 'Test Author',
        platformUsername: 'testuser',
      };

      const effect = Effect.gen(function* () {
        const gitProvider = yield* GitProviderRepository;
        return yield* gitProvider.injectInlandWorkflow(
          'test-token',
          'testuser/test-repo',
          templateData,
          { overrideExistingFiles: true }
        );
      });

      const result = await testRuntime.runPromise(effect);

      expect(result).toBeDefined();
      expect(result.filesCreated.length).toBeGreaterThan(0);
    });
  });

  describe('getMarkdownFilesFromRepo', () => {
    it('should get markdown files from repository', async () => {
      const effect = Effect.gen(function* () {
        const gitProvider = yield* GitProviderRepository;
        return yield* gitProvider.getMarkdownFilesFromRepo(
          'test-token',
          'testuser/test-repo',
          'main'
        );
      });

      const result = await testRuntime.runPromise(effect);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('slug');
      expect(result[0]).toHaveProperty('content');
      expect(result[0]).toHaveProperty('status');
      expect(result[0].title).toBe('Test Article');
      expect(result[0].slug).toBe('test-article');
      expect(result[0].status).toBe('published');
    });
  });

  describe('publishArticleToRepo', () => {
    it('should publish article to repository successfully', async () => {
      const effect = Effect.gen(function* () {
        const gitProvider = yield* GitProviderRepository;
        return yield* gitProvider.publishArticleToRepo(
          'test-token',
          'testuser/test-repo',
          'my-article',
          '# My Article\n\nThis is my article content.'
        );
      });

      const result = await testRuntime.runPromise(effect);

      expect(result).toBeDefined();
      expect(result.published).toBe(true);
      expect(result.filePath).toBe('content/my-article.md');
      expect(result.commitSha).toBe('abc123def456');
      expect(result.wasUpdate).toBe(false);
    });
  });

  describe('deleteArticleFromRepo', () => {
    it('should delete article from repository successfully', async () => {
      const effect = Effect.gen(function* () {
        const gitProvider = yield* GitProviderRepository;
        return yield* gitProvider.deleteArticleFromRepo(
          'test-token',
          'testuser/test-repo',
          'my-article'
        );
      });

      const result = await testRuntime.runPromise(effect);

      expect(result).toBeDefined();
      expect(result.deleted).toBe(true);
      expect(result.filePath).toBe('content/my-article.md');
    });
  });
});
