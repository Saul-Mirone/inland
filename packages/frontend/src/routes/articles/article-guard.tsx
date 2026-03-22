import { Effect } from 'effect';
import { Outlet, useParams } from 'react-router';

import { articlesModel } from '@/model/articles-model';
import { ArticleService } from '@/services/article';
import { runEffect } from '@/utils/effect-runtime';
import { logger } from '@/utils/logger';
import { useObservable } from '@/utils/use-observable';

export function ArticleGuard() {
  const { id } = useParams<{ id: string }>();
  const currentArticle = useObservable(articlesModel.currentArticle$);
  const loading = useObservable(articlesModel.articleLoading$);

  const needsLoad = id && currentArticle?.id !== id && !loading;

  if (needsLoad) {
    runEffect(
      Effect.flatMap(ArticleService, (svc) => svc.openArticle(id))
    ).catch((error) => {
      logger.error(error);
    });

    return (
      <div className="text-sm text-muted-foreground">Loading article...</div>
    );
  }

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">Loading article...</div>
    );
  }

  return <Outlet />;
}
