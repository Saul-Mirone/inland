import { Effect } from 'effect';

import {
  ArticleRepository,
  type ArticleCreateData,
} from '../../../repositories/article-repository';
import { GitProviderRepository } from '../../../repositories/git-provider-repository';
import { SiteRepository } from '../../../repositories/site-repository';
import { AuthService } from '../../auth';
import { SiteAccessDeniedError } from '../../site/site-types';
import { GitRepositoryError } from '../article-types';

export const importArticlesFromGit = (siteId: string, userId: string) =>
  Effect.gen(function* () {
    const siteRepo = yield* SiteRepository;
    const articleRepo = yield* ArticleRepository;
    const gitProvider = yield* GitProviderRepository;

    const site = yield* siteRepo.findByIdWithDetails(siteId);

    if (!site) {
      return yield* new SiteAccessDeniedError({ siteId, userId });
    }

    if (site.userId !== userId) {
      return yield* new SiteAccessDeniedError({ siteId, userId });
    }

    if (!site.gitRepo) {
      return yield* new GitRepositoryError({
        siteId,
        message: 'Site does not have a linked Git repository',
      });
    }

    const authService = yield* AuthService;
    const accessToken = yield* authService.getUserAuthToken(userId);

    const repoInfo = yield* gitProvider.getRepositoryInfo(
      accessToken,
      site.gitRepo
    );
    const defaultBranch = repoInfo.defaultBranch;

    const articles = yield* gitProvider.getMarkdownFilesFromRepo(
      accessToken,
      site.gitRepo,
      defaultBranch
    );

    yield* Effect.logInfo(
      `Importing ${articles.length} articles from ${site.gitRepo}`
    );

    const importedArticles = [];
    for (const articleData of articles) {
      const result = yield* Effect.gen(function* () {
        const existingArticle = yield* articleRepo.findBySiteIdAndSlug(
          site.id,
          articleData.slug
        );

        if (existingArticle) {
          yield* Effect.logInfo(
            `Skipping existing article: ${articleData.slug}`
          );
          return null;
        }

        const repoData: ArticleCreateData = {
          siteId: site.id,
          title: articleData.title,
          slug: articleData.slug,
          content: articleData.content,
          excerpt: articleData.excerpt,
          tags: articleData.tags,
          status: articleData.status,
          ...(articleData.date && {
            publishedAt: new Date(articleData.date),
          }),
          gitSha: articleData.gitSha,
          gitSyncedAt: new Date(),
        };
        const article = yield* articleRepo.create(repoData);

        yield* Effect.logInfo(`Imported article: ${articleData.title}`);
        return article;
      }).pipe(
        Effect.catchAll(() =>
          Effect.gen(function* () {
            yield* Effect.logError(
              `Failed to import article ${articleData.title}`
            );
            return null;
          })
        )
      );

      if (result) {
        importedArticles.push(result);
      }
    }

    return {
      imported: importedArticles.length,
      total: articles.length,
      articles: importedArticles,
    };
  });
