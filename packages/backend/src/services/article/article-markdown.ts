import { normalizeTags } from './article-validation';

export const generateExcerpt = (content: string): string => {
  let text = content
    .replace(':', '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^>\s+/gm, '')
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= 150) {
    return text;
  }

  const truncated = text.substring(0, 150);
  const lastSpaceIndex = truncated.lastIndexOf(' ');

  if (lastSpaceIndex > 100) {
    return truncated.substring(0, lastSpaceIndex) + '...';
  }

  return truncated + '...';
};

export const buildArticleMarkdown = (article: {
  title: string;
  content: string;
  excerpt: string | null;
  tags: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
}): string => {
  const publishDate = (article.publishedAt ?? new Date())
    .toISOString()
    .split('T')[0];
  const updatedAt = article.updatedAt.toISOString().split('T')[0];
  const excerpt = article.excerpt || generateExcerpt(article.content);
  const tagsLine = article.tags
    ? `\ntags: [${normalizeTags(article.tags)}]`
    : '';

  const frontMatter = `---
title: ${article.title}
date: ${publishDate}
updatedAt: ${updatedAt}
excerpt: ${excerpt}${tagsLine}
---

`;
  return frontMatter + article.content;
};
