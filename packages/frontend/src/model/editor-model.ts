import type { Crepe } from '@milkdown/crepe';

import { Context, Layer } from 'effect';
import { BehaviorSubject } from 'rxjs';

export interface EditorModelService {
  readonly crepe$: BehaviorSubject<Crepe | null>;
  readonly ready$: BehaviorSubject<boolean>;
}

const instance: EditorModelService = {
  crepe$: new BehaviorSubject<Crepe | null>(null),
  ready$: new BehaviorSubject(false),
};

export class EditorModel extends Context.Tag('EditorModel')<
  EditorModel,
  EditorModelService
>() {}

export const EditorModelLive = Layer.succeed(EditorModel, instance);
