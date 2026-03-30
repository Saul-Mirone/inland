/**
 * Computes a lightweight DJB2 hash of the article fields that
 * get published to Git.  Used to detect unpublished changes by
 * comparing `contentHash` (current state) with `gitSyncedHash`
 * (snapshot at last publish).
 *
 * Accepts any article-like object — nullable/optional excerpt
 * and tags are coerced to empty strings internally.
 */
export function computeContentHash(article: {
  title: string;
  slug: string;
  content: string;
  excerpt?: string | null;
  tags?: string | null;
}): string {
  const input = [
    article.title,
    article.slug,
    article.content,
    article.excerpt ?? '',
    article.tags ?? '',
  ].join('\0');
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}
