import { Crepe } from '@milkdown/crepe';
import { replaceAll } from '@milkdown/kit/utils';
import { Effect } from 'effect';
import {
  type Subscription,
  debounceTime,
  distinctUntilChanged,
  skip,
} from 'rxjs';

import type { ArticlesModelService } from '@/model/articles-model';
import type { EditorModelService } from '@/model/editor-model';

import { logger } from '@/utils/logger';

import type { EditorServiceInterface } from './editor-service';

export type SaveFn = () => Promise<void>;

export class EditorServiceImpl implements EditorServiceInterface {
  private autoSaveSubscription: Subscription | null = null;

  constructor(
    private readonly model: EditorModelService,
    private readonly articles: ArticlesModelService,
    private readonly save: SaveFn
  ) {}

  initialize = (root: HTMLElement): Effect.Effect<void> =>
    Effect.gen(this, function* () {
      yield* this.destroy();

      const editing = this.articles.editing$.getValue();
      const crepe = new Crepe({ root, defaultValue: editing.content });
      this.model.crepe$.next(crepe);

      crepe.on((listener) => {
        listener.markdownUpdated((_ctx, markdown) => {
          const current = this.articles.editing$.getValue();
          this.articles.editing$.next({ ...current, content: markdown });
        });
      });

      yield* Effect.tryPromise({
        try: () => crepe.create(),
        catch: (error) =>
          new Error(
            `Failed to create editor: ${error instanceof Error ? error.message : String(error)}`
          ),
      });

      this.model.ready$.next(true);
      this.startAutoSave();
    }).pipe(Effect.catchAll(() => Effect.void));

  destroy = (): Effect.Effect<void> =>
    Effect.gen(this, function* () {
      this.stopAutoSave();

      const crepe = this.model.crepe$.getValue();
      if (!crepe) return;

      yield* Effect.tryPromise({
        try: () => crepe.destroy(),
        catch: (error) =>
          new Error(
            `Failed to destroy editor: ${error instanceof Error ? error.message : String(error)}`
          ),
      });

      if (this.model.crepe$.getValue() === crepe) {
        this.model.crepe$.next(null);
        this.model.ready$.next(false);
      }
    }).pipe(Effect.catchAll(() => Effect.void));

  replaceContent = (markdown: string): Effect.Effect<void> =>
    Effect.sync(() => {
      const crepe = this.model.crepe$.getValue();
      if (!crepe) return;
      crepe.editor.action(replaceAll(markdown));
    });

  private startAutoSave(): void {
    this.autoSaveSubscription = this.articles.editing$
      .pipe(
        distinctUntilChanged(
          (prev, curr) =>
            prev.title === curr.title &&
            prev.slug === curr.slug &&
            prev.content === curr.content &&
            prev.status === curr.status
        ),
        skip(1),
        debounceTime(1000)
      )
      .subscribe(() => {
        this.save().catch((e) => logger.error(e));
      });
  }

  private stopAutoSave(): void {
    this.autoSaveSubscription?.unsubscribe();
    this.autoSaveSubscription = null;
  }
}
