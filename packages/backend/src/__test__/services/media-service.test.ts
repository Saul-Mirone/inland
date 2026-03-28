import { Effect, Layer, ManagedRuntime, Exit } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';

import type { Media } from '../../../generated/prisma/client';

import {
  GitProviderRepository,
  type GitProviderRepositoryService,
} from '../../repositories/git-provider-repository';
import { deleteMedia } from '../../services/media/delete-media';
import { importMediaFromGit } from '../../services/media/import-media-from-git';
import { listMedia } from '../../services/media/list-media';
import { uploadMedia } from '../../services/media/upload-media';
import { mockPrisma, resetMockPrisma } from '../helpers/mock-database';
import { mockGitIntegration, mockSite } from '../helpers/mock-factories';
import { makeMockGitProvider } from '../helpers/mock-git-provider';
import { TestRepositoryLayer } from '../helpers/test-layers';

const testRuntime = ManagedRuntime.make(TestRepositoryLayer);

const now = new Date();

const mockMedia = (overrides: Partial<Media> = {}): Media => ({
  id: 'media-1',
  siteId: 'site-1',
  filename: 'image-abc123.png',
  originalName: 'image.png',
  filePath: 'assets/images/image-abc123.png',
  fileSize: BigInt(1024),
  mimeType: 'image/png',
  storageType: 'github',
  contentHash: 'sha256hash',
  externalUrl: null,
  alt: null,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

const setupSiteGitAccess = () => {
  mockPrisma.site.findUnique.mockResolvedValue({
    id: 'site-1',
    userId: 'user-1',
    gitRepo: 'testuser/test-repo',
  } as never);
  mockPrisma.gitIntegration.findFirst.mockResolvedValue(mockGitIntegration());
};

describe('MediaService', () => {
  beforeEach(() => {
    resetMockPrisma();
  });

  describe('listMedia', () => {
    it('should return paginated media for a site', async () => {
      const media = [mockMedia(), mockMedia({ id: 'media-2' })];

      mockPrisma.site.findUnique.mockResolvedValue(mockSite());
      mockPrisma.$transaction.mockResolvedValue([media, 2]);

      const result = await testRuntime.runPromise(
        listMedia('site-1', 'user-1')
      );

      expect(result.items).toEqual(media);
      expect(result.total).toBe(2);
    });

    it('should fail when user does not own the site', async () => {
      mockPrisma.site.findUnique.mockResolvedValue(
        mockSite({ userId: 'other-user' })
      );

      const result = await testRuntime.runPromiseExit(
        listMedia('site-1', 'user-1')
      );

      expect(Exit.isFailure(result)).toBe(true);
    });
  });

  describe('deleteMedia', () => {
    it('should delete media from git and database', async () => {
      const media = {
        ...mockMedia(),
        site: { id: 'site-1', userId: 'user-1', gitRepo: 'testuser/test-repo' },
      };

      mockPrisma.media.findUnique.mockResolvedValue(media);
      mockPrisma.media.delete.mockResolvedValue(mockMedia());
      mockPrisma.gitIntegration.findFirst.mockResolvedValue(
        mockGitIntegration()
      );

      const result = await testRuntime.runPromise(
        deleteMedia('media-1', 'user-1')
      );

      expect(result).toEqual({ deleted: true });
      expect(mockPrisma.media.delete).toHaveBeenCalledWith({
        where: { id: 'media-1' },
      });
    });

    it('should fail when media is not found', async () => {
      mockPrisma.media.findUnique.mockResolvedValue(null);

      const result = await testRuntime.runPromiseExit(
        deleteMedia('nonexistent', 'user-1')
      );

      expect(Exit.isFailure(result)).toBe(true);
    });

    it('should fail when user does not own the media', async () => {
      const media = {
        ...mockMedia(),
        site: { id: 'site-1', userId: 'other-user', gitRepo: null },
      };
      mockPrisma.media.findUnique.mockResolvedValue(media);

      const result = await testRuntime.runPromiseExit(
        deleteMedia('media-1', 'user-1')
      );

      expect(Exit.isFailure(result)).toBe(true);
    });
  });

  describe('uploadMedia', () => {
    it('should upload file to git and save to database', async () => {
      setupSiteGitAccess();
      mockPrisma.media.findFirst.mockResolvedValue(null); // no duplicate
      mockPrisma.media.create.mockResolvedValue(mockMedia());

      const result = await testRuntime.runPromise(
        uploadMedia({
          siteId: 'site-1',
          userId: 'user-1',
          filename: 'photo.png',
          buffer: Buffer.from('fake image data'),
          mimeType: 'image/png',
        })
      );

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('url');
      expect(mockPrisma.media.create).toHaveBeenCalled();
    });

    it('should return existing media when content hash matches', async () => {
      setupSiteGitAccess();
      mockPrisma.media.findFirst.mockResolvedValue(mockMedia());

      const result = await testRuntime.runPromise(
        uploadMedia({
          siteId: 'site-1',
          userId: 'user-1',
          filename: 'photo.png',
          buffer: Buffer.from('fake image data'),
          mimeType: 'image/png',
        })
      );

      expect(result.id).toBe('media-1');
      expect(mockPrisma.media.create).not.toHaveBeenCalled();
    });

    it('should fail for unsupported mime type', async () => {
      const result = await testRuntime.runPromiseExit(
        uploadMedia({
          siteId: 'site-1',
          userId: 'user-1',
          filename: 'doc.pdf',
          buffer: Buffer.from('pdf content'),
          mimeType: 'application/pdf',
        })
      );

      expect(Exit.isFailure(result)).toBe(true);
    });

    it('should fail for oversized file', async () => {
      const result = await testRuntime.runPromiseExit(
        uploadMedia({
          siteId: 'site-1',
          userId: 'user-1',
          filename: 'huge.png',
          buffer: Buffer.alloc(11 * 1024 * 1024), // 11 MB
          mimeType: 'image/png',
        })
      );

      expect(Exit.isFailure(result)).toBe(true);
    });
  });

  describe('importMediaFromGit', () => {
    const mediaGitProvider: GitProviderRepositoryService = {
      ...makeMockGitProvider(),
      getMediaFilesFromRepo: () =>
        Effect.succeed([
          {
            filePath: 'assets/images/photo.png',
            filename: 'photo.png',
            sha: 'sha123',
            size: 2048,
          },
        ]),
    };
    const mediaImportLayer = Layer.merge(
      TestRepositoryLayer,
      Layer.succeed(GitProviderRepository, mediaGitProvider)
    );
    const mediaRuntime = ManagedRuntime.make(mediaImportLayer);

    it('should import new media files from repository', async () => {
      setupSiteGitAccess();
      mockPrisma.media.findUnique.mockResolvedValue(null);
      mockPrisma.media.create.mockResolvedValue(mockMedia());

      const result = await mediaRuntime.runPromise(
        importMediaFromGit('site-1', 'user-1')
      );

      expect(result.imported).toBe(1);
      expect(result.total).toBe(1);
      expect(mockPrisma.media.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            siteId: 'site-1',
            filename: 'photo.png',
            filePath: 'assets/images/photo.png',
            mimeType: 'image/png',
          }),
        })
      );
    });

    it('should skip already imported media', async () => {
      setupSiteGitAccess();
      mockPrisma.media.findUnique.mockResolvedValue(mockMedia());

      const result = await mediaRuntime.runPromise(
        importMediaFromGit('site-1', 'user-1')
      );

      expect(result.imported).toBe(0);
      expect(result.total).toBe(1);
      expect(mockPrisma.media.create).not.toHaveBeenCalled();
    });
  });
});
