import { Effect } from 'effect';
import { useEffect } from 'react';

import type { Article } from '@/model/articles-model';

import { Button } from '@/components/ui/button';
import { articlesModel } from '@/model/articles-model';
import { ArticleService } from '@/services/article';
import { runEffect } from '@/utils/effect-runtime';
import { useObservable } from '@/utils/use-observable';

interface ArticleListProps {
  siteId?: string;
  onEditArticle?: (article: Article) => void;
}

export const ArticleList = ({ siteId, onEditArticle }: ArticleListProps) => {
  const articles = useObservable(articlesModel.articles$);
  const loading = useObservable(articlesModel.loading$);
  const error = useObservable(articlesModel.error$);
  const deletingId = useObservable(articlesModel.deletingId$);
  const publishingId = useObservable(articlesModel.publishingId$);

  useEffect(() => {
    void runEffect(
      Effect.flatMap(ArticleService, (svc) => svc.fetchArticles(siteId))
    );
  }, [siteId]);

  const handleDelete = (articleId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this article? This action cannot be undone.'
      )
    ) {
      return;
    }
    void runEffect(
      Effect.flatMap(ArticleService, (svc) => svc.deleteArticle(articleId))
    );
  };

  const handlePublish = (articleId: string) => {
    void runEffect(
      Effect.flatMap(ArticleService, (svc) => svc.publishArticle(articleId))
    );
  };

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">Loading articles...</div>
    );
  }

  if (error) {
    return <div className="text-sm text-destructive">Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">
        {siteId ? 'Site Articles' : 'All Articles'}
      </h2>
      {articles.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No articles yet. Create your first article!
        </p>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => (
            <div
              key={article.id}
              className="rounded-lg border border-border bg-background p-4"
            >
              <h3 className="text-base font-semibold">{article.title}</h3>
              <p className="text-sm text-muted-foreground">
                Slug: {article.slug}
              </p>
              <p className="text-sm text-muted-foreground">
                Status: {article.status}
              </p>
              {!siteId && (
                <p className="text-sm text-muted-foreground">
                  Site: {article.site.name}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Created: {new Date(article.createdAt).toLocaleDateString()}
              </p>
              <p className="text-sm text-muted-foreground">
                Updated: {new Date(article.updatedAt).toLocaleDateString()}
              </p>
              <div className="mt-2 flex gap-2">
                {onEditArticle && (
                  <Button
                    variant="outline"
                    onClick={() => onEditArticle(article)}
                  >
                    Edit
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => handlePublish(article.id)}
                  disabled={publishingId === article.id}
                >
                  {publishingId === article.id
                    ? 'Publishing...'
                    : article.status === 'published'
                      ? 'Re-publish'
                      : 'Publish'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(article.id)}
                  disabled={deletingId === article.id}
                >
                  {deletingId === article.id ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
