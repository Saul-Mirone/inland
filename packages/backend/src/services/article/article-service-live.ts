import { Layer } from 'effect';

import { ArticleService } from './article-service';
import {
  validateTitle,
  validateSlug,
  generateSlugFromTitle,
} from './article-validation';
import { deleteArticleFromGit } from './git/delete-article-from-git';
import { importArticlesFromGit } from './git/import-articles-from-git';
import { publishArticleToGit } from './git/publish-article-to-git';
import { syncArticlesFromGit } from './git/sync-articles-from-git';
import { createArticle } from './operations/create-article';
import { deleteArticle } from './operations/delete-article';
import { findArticleById } from './operations/find-article-by-id';
import { findSiteArticles } from './operations/find-site-articles';
import { findUserArticles } from './operations/find-user-articles';
import { updateArticle } from './operations/update-article';

export const ArticleServiceLive = Layer.succeed(ArticleService, {
  createArticle,
  deleteArticle,
  findArticleById,
  findSiteArticles,
  findUserArticles,
  updateArticle,
  deleteArticleFromGit,
  importArticlesFromGit,
  publishArticleToGit,
  syncArticlesFromGit,
  validateTitle,
  validateSlug,
  generateSlugFromTitle,
});
