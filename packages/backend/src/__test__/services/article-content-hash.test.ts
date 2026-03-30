import { describe, it, expect } from 'vitest';

import { computeContentHash } from '../../services/article/article-content-hash';

describe('computeContentHash', () => {
  const baseFields = {
    title: 'Hello',
    slug: 'hello',
    content: 'World',
    excerpt: null,
    tags: null,
  };

  it('should return a non-empty string', () => {
    const hash = computeContentHash(baseFields);
    expect(hash).toBeTruthy();
    expect(typeof hash).toBe('string');
  });

  it('should be deterministic', () => {
    const a = computeContentHash(baseFields);
    const b = computeContentHash(baseFields);
    expect(a).toBe(b);
  });

  it('should change when title changes', () => {
    const a = computeContentHash(baseFields);
    const b = computeContentHash({ ...baseFields, title: 'Different' });
    expect(a).not.toBe(b);
  });

  it('should change when slug changes', () => {
    const a = computeContentHash(baseFields);
    const b = computeContentHash({ ...baseFields, slug: 'different' });
    expect(a).not.toBe(b);
  });

  it('should change when content changes', () => {
    const a = computeContentHash(baseFields);
    const b = computeContentHash({ ...baseFields, content: 'Different' });
    expect(a).not.toBe(b);
  });

  it('should change when excerpt changes', () => {
    const a = computeContentHash(baseFields);
    const b = computeContentHash({ ...baseFields, excerpt: 'summary' });
    expect(a).not.toBe(b);
  });

  it('should change when tags change', () => {
    const a = computeContentHash(baseFields);
    const b = computeContentHash({ ...baseFields, tags: 'a, b' });
    expect(a).not.toBe(b);
  });

  it('should treat null and empty string differently for excerpt', () => {
    const withNull = computeContentHash({ ...baseFields, excerpt: null });
    const withEmpty = computeContentHash({
      ...baseFields,
      excerpt: 'x',
    });
    expect(withNull).not.toBe(withEmpty);
  });
});
