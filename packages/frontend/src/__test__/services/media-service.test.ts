import { Effect, ManagedRuntime } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';

import type { MediaItem } from '@/model/media-model';

import { MediaService } from '@/services/media';

import {
  mockApi,
  resetMockApi,
  apiSuccess,
  apiError,
} from '../helpers/mock-api-client';
import { mockMediaModel, resetMockMediaModel } from '../helpers/mock-models';
import { MediaTestLayer } from '../helpers/test-layers';

const testRuntime = ManagedRuntime.make(MediaTestLayer);

const mockMediaItem = (overrides?: Partial<MediaItem>): MediaItem => ({
  id: 'media-1',
  filename: 'photo.png',
  originalName: 'photo.png',
  filePath: 'assets/images/photo.png',
  fileSize: '1024',
  mimeType: 'image/png',
  alt: null,
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('MediaService', () => {
  beforeEach(() => {
    resetMockApi();
    resetMockMediaModel();
  });

  describe('fetchMedia', () => {
    it('should fetch media and update model', async () => {
      const media = [mockMediaItem(), mockMediaItem({ id: 'media-2' })];
      mockApi.get.mockReturnValue(
        apiSuccess({
          media,
          total: 2,
          page: 1,
          limit: 100,
          totalPages: 1,
        })
      );

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* MediaService;
          yield* service.fetchMedia('site-1');
        })
      );

      expect(mockApi.get).toHaveBeenCalledWith('/sites/site-1/media?limit=100');
      expect(mockMediaModel.media$.getValue()).toEqual(media);
      expect(mockMediaModel.total$.getValue()).toBe(2);
      expect(mockMediaModel.loading$.getValue()).toBe(false);
    });

    it('should handle errors', async () => {
      mockApi.get.mockReturnValue(apiError(500, 'Failed'));

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* MediaService;
          yield* service.fetchMedia('site-1');
        })
      );

      expect(mockMediaModel.error$.getValue()).toBe('Failed');
      expect(mockMediaModel.loading$.getValue()).toBe(false);
    });
  });

  describe('deleteMedia', () => {
    it('should optimistically remove media and call API', async () => {
      mockMediaModel.media$.next([
        mockMediaItem({ id: 'm1' }),
        mockMediaItem({ id: 'm2' }),
      ]);
      mockApi.del.mockReturnValue(apiSuccess({}));

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* MediaService;
          yield* service.deleteMedia('m1');
        })
      );

      expect(mockApi.del).toHaveBeenCalledWith('/media/m1');
      expect(
        mockMediaModel.media$.getValue().find((m) => m.id === 'm1')
      ).toBeUndefined();
    });

    it('should set error on failure', async () => {
      mockMediaModel.media$.next([mockMediaItem({ id: 'm1' })]);
      mockApi.del.mockReturnValue(apiError(500, 'Delete failed'));

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* MediaService;
          yield* service.deleteMedia('m1');
        })
      );

      expect(mockMediaModel.error$.getValue()).toBe('Delete failed');
    });
  });

  describe('uploadImage', () => {
    it('should upload and refetch media', async () => {
      mockApi.postFormData.mockReturnValue(
        apiSuccess({
          id: 'new-media',
          filePath: 'assets/images/photo.png',
          url: 'https://raw.githubusercontent.com/user/repo/main/assets/images/photo.png',
        })
      );
      mockApi.get.mockReturnValue(
        apiSuccess({
          media: [mockMediaItem()],
          total: 1,
          page: 1,
          limit: 100,
          totalPages: 1,
        })
      );

      const file = new File(['fake'], 'photo.png', {
        type: 'image/png',
      });

      const result = await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* MediaService;
          return yield* service.uploadImage('site-1', file, 'Alt text');
        })
      );

      expect(result.id).toBe('new-media');
      expect(mockApi.postFormData).toHaveBeenCalledWith(
        '/sites/site-1/media',
        expect.any(FormData)
      );
      // Should refetch after upload
      expect(mockApi.get).toHaveBeenCalledWith('/sites/site-1/media?limit=100');
    });
  });
});
