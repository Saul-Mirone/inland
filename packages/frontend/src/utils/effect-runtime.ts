import type { Effect } from 'effect';

import { Layer, ManagedRuntime } from 'effect';
import { toast } from 'sonner';

import { ArticlesModelLive } from '@/model/articles-model';
import { AuthModelLive } from '@/model/auth-model';
import { EditorModelLive } from '@/model/editor-model';
import { SitesModelLive } from '@/model/sites-model';
import { ApiClientLive } from '@/services/api';
import { ArticleServiceLive } from '@/services/article';
import { AuthServiceLive } from '@/services/auth';
import { DialogServiceLive } from '@/services/dialog';
import { EditorServiceLive } from '@/services/editor';
import { NavigationServiceLive } from '@/services/navigation';
import { SiteServiceLive } from '@/services/site';

const ModelLayer = Layer.mergeAll(
  ApiClientLive,
  NavigationServiceLive,
  DialogServiceLive,
  SitesModelLive,
  ArticlesModelLive,
  AuthModelLive,
  EditorModelLive
);

const BaseServiceLayer = Layer.mergeAll(
  ArticleServiceLive,
  AuthServiceLive
).pipe(Layer.provideMerge(ModelLayer));

const ServiceLayer = SiteServiceLive.pipe(Layer.provideMerge(BaseServiceLayer));

const MainLayer = EditorServiceLive.pipe(Layer.provideMerge(ServiceLayer));

export const runtime = ManagedRuntime.make(MainLayer);

export const runEffect = <A, E>(
  effect: Effect.Effect<A, E, Layer.Layer.Success<typeof MainLayer>>
): Promise<A> =>
  runtime.runPromise(effect).catch((error) => {
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    toast.error(message);
    throw error;
  });
