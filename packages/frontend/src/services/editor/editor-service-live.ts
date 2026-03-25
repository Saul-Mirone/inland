import { Effect, Layer } from 'effect';
import { toast } from 'sonner';

import { ArticlesModel } from '@/model/articles-model';
import { EditorModel } from '@/model/editor-model';
import { ArticleService } from '@/services/article';
import { MediaService } from '@/services/media';

import { EditorService } from './editor-service';
import { EditorServiceImpl } from './editor-service-impl';

const runWithToast = <A>(effect: Effect.Effect<A, unknown>): Promise<A> =>
  Effect.runPromise(effect).catch((error) => {
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    toast.error(message);
    throw error;
  });

export const EditorServiceLive = Layer.effect(
  EditorService,
  Effect.gen(function* () {
    const model = yield* EditorModel;
    const articles = yield* ArticlesModel;
    const articleSvc = yield* ArticleService;
    const mediaSvc = yield* MediaService;
    return new EditorServiceImpl(
      model,
      articles,
      () => runWithToast(articleSvc.saveCurrentArticle()),
      (file: File) => {
        const article = articles.currentArticle$.getValue();
        if (!article) {
          return Promise.reject(new Error('No article selected'));
        }
        return runWithToast(mediaSvc.uploadImage(article.siteId, file)).then(
          (result) => result.url
        );
      }
    );
  })
);
