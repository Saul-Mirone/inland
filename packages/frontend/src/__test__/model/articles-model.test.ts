import { describe, it, expect } from 'vitest';

import { hasUnpublishedChanges } from '@/model/articles-model';

import { mockArticle } from '../helpers/mock-factories';

describe('hasUnpublishedChanges', () => {
  it('should return false for draft articles', () => {
    const article = mockArticle({ status: 'draft' });
    expect(hasUnpublishedChanges(article)).toBe(false);
  });

  it('should return false when hashes match', () => {
    const article = mockArticle({
      status: 'published',
      contentHash: 'abc123',
      gitSyncedHash: 'abc123',
    });
    expect(hasUnpublishedChanges(article)).toBe(false);
  });

  it('should return true when hashes differ', () => {
    const article = mockArticle({
      status: 'published',
      contentHash: 'abc123',
      gitSyncedHash: 'def456',
    });
    expect(hasUnpublishedChanges(article)).toBe(true);
  });

  describe('timestamp fallback (no hashes)', () => {
    it('should return true when gitSyncedAt is null', () => {
      const article = mockArticle({
        status: 'published',
        contentHash: null,
        gitSyncedHash: null,
        gitSyncedAt: null,
      });
      expect(hasUnpublishedChanges(article)).toBe(true);
    });

    it('should return false when updatedAt is within 1s of gitSyncedAt', () => {
      const article = mockArticle({
        status: 'published',
        contentHash: null,
        gitSyncedHash: null,
        gitSyncedAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.500Z',
      });
      expect(hasUnpublishedChanges(article)).toBe(false);
    });

    it('should return true when updatedAt is more than 1s after gitSyncedAt', () => {
      const article = mockArticle({
        status: 'published',
        contentHash: null,
        gitSyncedHash: null,
        gitSyncedAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:02.000Z',
      });
      expect(hasUnpublishedChanges(article)).toBe(true);
    });
  });

  it('should use hash comparison even when timestamps differ', () => {
    const article = mockArticle({
      status: 'published',
      contentHash: 'same',
      gitSyncedHash: 'same',
      gitSyncedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    expect(hasUnpublishedChanges(article)).toBe(false);
  });

  it('should fallback when only one hash is present', () => {
    const article = mockArticle({
      status: 'published',
      contentHash: 'abc',
      gitSyncedHash: null,
      gitSyncedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(hasUnpublishedChanges(article)).toBe(false);
  });
});
