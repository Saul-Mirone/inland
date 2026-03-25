import { Effect } from 'effect';

import {
  ArticleRepository,
  type ArticleUpdateData,
} from '../../../repositories/article-repository';
import { GitProviderRepository } from '../../../repositories/git-provider-repository';
import { AuthService } from '../../auth';
import {
  ArticleNotFoundError,
  ArticleAccessDeniedError,
  GitRepositoryError,
  GitConflictError,
} from '../article-types';

const generateExcerpt = (content: string): string => {
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

export const publishArticleToGit = (articleId: string, userId: string) =>
  Effect.gen(function* () {
    const articleRepo = yield* ArticleRepository;
    const gitProvider = yield* GitProviderRepository;

    const article = yield* articleRepo.findById(articleId);

    if (!article) {
      return yield* new ArticleNotFoundError({ articleId });
    }

    if (article.site.userId !== userId) {
      return yield* new ArticleAccessDeniedError({ articleId, userId });
    }

    if (!article.site.gitRepo) {
      return yield* new GitRepositoryError({
        siteId: article.site.id,
        message: 'Site does not have a linked Git repository',
      });
    }

    const authService = yield* AuthService;
    const accessToken = yield* authService.getUserAuthToken(userId);

    if (article.gitSha) {
      const remoteSha = yield* gitProvider.getArticleFileSha(
        accessToken,
        article.site.gitRepo,
        article.slug
      );
      if (remoteSha && remoteSha !== article.gitSha) {
        return yield* new GitConflictError({
          articleId,
          localSha: article.gitSha,
          remoteSha,
        });
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const excerpt = generateExcerpt(article.content);

    const frontMatter = `---
title: ${article.title}
date: ${today}
excerpt: ${excerpt}
---

`;
    const markdownContent = frontMatter + article.content;

    const result = yield* gitProvider.publishArticleToRepo(
      accessToken,
      article.site.gitRepo,
      article.slug,
      markdownContent
    );

    yield* Effect.logInfo(
      `Article published to Git repository: ${article.title} -> ${result.filePath}`
    );

    const repoData: ArticleUpdateData = {
      status: 'published',
      gitSha: result.blobSha,
      gitSyncedAt: new Date(),
    };
    const updatedArticle = yield* articleRepo.update(articleId, repoData);

    return {
      article: updatedArticle,
      published: result.published,
      filePath: result.filePath,
      commitSha: result.commitSha,
      wasUpdate: result.wasUpdate,
    };
  });
