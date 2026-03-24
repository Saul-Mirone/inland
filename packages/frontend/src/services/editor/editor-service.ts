import type { Effect } from 'effect';

import { Context } from 'effect';

export interface EditorServiceInterface {
  readonly initialize: (root: HTMLElement) => Effect.Effect<void>;
  readonly destroy: () => Effect.Effect<void>;
  readonly replaceContent: (markdown: string) => Effect.Effect<void>;
}

export class EditorService extends Context.Tag('EditorService')<
  EditorService,
  EditorServiceInterface
>() {}
