import { Effect, Layer } from 'effect';

import { ArticlesModel } from '@/model/articles-model';
import { EditorModel } from '@/model/editor-model';
import { ArticleService } from '@/services/article';

import { EditorService } from './editor-service';
import { EditorServiceImpl } from './editor-service-impl';

export const EditorServiceLive = Layer.effect(
  EditorService,
  Effect.gen(function* () {
    const model = yield* EditorModel;
    const articles = yield* ArticlesModel;
    const articleSvc = yield* ArticleService;
    return new EditorServiceImpl(model, articles, () =>
      Effect.runPromise(articleSvc.saveCurrentArticle())
    );
  })
);
