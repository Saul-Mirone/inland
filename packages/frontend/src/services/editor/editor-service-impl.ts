import type { Node } from '@milkdown/kit/prose/model';

import { Crepe, CrepeFeature } from '@milkdown/crepe';
import { upload, uploadConfig } from '@milkdown/kit/plugin/upload';
import { replaceAll } from '@milkdown/kit/utils';
import { Effect } from 'effect';
import {
  type Subscription,
  debounceTime,
  distinctUntilChanged,
  filter,
  skip,
} from 'rxjs';

import type { ArticlesModelService } from '@/model/articles-model';
import type { EditorModelService } from '@/model/editor-model';

import { logger } from '@/utils/logger';

import type { EditorServiceInterface } from './editor-service';

export type SaveFn = () => Promise<void>;
export type UploadImageFn = (file: File) => Promise<string>;

export class EditorServiceImpl implements EditorServiceInterface {
  private autoSaveSubscription: Subscription | null = null;
  private editorSettled = true;
  private settleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly model: EditorModelService,
    private readonly articles: ArticlesModelService,
    private readonly save: SaveFn,
    private readonly uploadImage: UploadImageFn
  ) {}

  initialize = (root: HTMLElement): Effect.Effect<void> =>
    Effect.gen(this, function* () {
      yield* this.destroy();

      this.editorSettled = false;
      const editing = this.articles.editing$.getValue();
      const uploadFn = this.uploadImage;
      const crepe = new Crepe({
        root,
        defaultValue: editing.content,
        featureConfigs: {
          [CrepeFeature.ImageBlock]: {
            onUpload: uploadFn,
          },
        },
      });

      crepe.editor
        .config((ctx) => {
          ctx.update(uploadConfig.key, (prev) => ({
            ...prev,
            uploader: async (files, schema) => {
              const nodes: Node[] = [];
              for (let i = 0; i < files.length; i++) {
                const file = files.item(i);
                if (!file || !file.type.startsWith('image/')) continue;
                const url = await uploadFn(file);
                const imageNode = schema.nodes['image-block'].createAndFill({
                  src: url,
                });
                if (imageNode) nodes.push(imageNode);
              }
              return nodes;
            },
          }));
        })
        .use(upload);

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

      // Let editor settle before enabling auto-save to prevent
      // Milkdown's markdown normalization from triggering a save
      this.settleTimer = setTimeout(() => {
        this.editorSettled = true;
        this.settleTimer = null;
      }, 500);
    }).pipe(
      Effect.catchAll((error) =>
        Effect.logError('Editor initialization failed', { error })
      )
    );

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
    }).pipe(
      Effect.catchAll((error) =>
        Effect.logError('Editor destruction failed', { error })
      )
    );

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
            prev.status === curr.status &&
            prev.publishedAt === curr.publishedAt
        ),
        skip(1),
        filter(() => this.editorSettled),
        debounceTime(1000)
      )
      .subscribe(() => {
        this.save().catch((e) => logger.error(e));
      });
  }

  private stopAutoSave(): void {
    this.autoSaveSubscription?.unsubscribe();
    this.autoSaveSubscription = null;
    if (this.settleTimer) {
      clearTimeout(this.settleTimer);
      this.settleTimer = null;
    }
    this.editorSettled = true;
  }
}
