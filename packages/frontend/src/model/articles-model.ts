import { Context, Layer } from 'effect';
import { BehaviorSubject } from 'rxjs';

export interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: 'draft' | 'published';
  siteId: string;
  createdAt: string;
  updatedAt: string;
  site: {
    id: string;
    name: string;
  };
}

export interface EditingState {
  title: string;
  slug: string;
  content: string;
  status: 'draft' | 'published';
  saving: boolean;
}

const INITIAL_EDITING: EditingState = {
  title: '',
  slug: '',
  content: '',
  status: 'draft',
  saving: false,
};

export interface ArticlesModelService {
  readonly articles$: BehaviorSubject<Article[]>;
  readonly currentArticle$: BehaviorSubject<Article | null>;
  readonly editing$: BehaviorSubject<EditingState>;
  readonly loading$: BehaviorSubject<boolean>;
  readonly articleLoading$: BehaviorSubject<boolean>;
  readonly error$: BehaviorSubject<string | null>;
  readonly deletingId$: BehaviorSubject<string | null>;
  readonly publishingId$: BehaviorSubject<string | null>;
}

const instance: ArticlesModelService = {
  articles$: new BehaviorSubject<Article[]>([]),
  currentArticle$: new BehaviorSubject<Article | null>(null),
  editing$: new BehaviorSubject<EditingState>(INITIAL_EDITING),
  loading$: new BehaviorSubject(false),
  articleLoading$: new BehaviorSubject(false),
  error$: new BehaviorSubject<string | null>(null),
  deletingId$: new BehaviorSubject<string | null>(null),
  publishingId$: new BehaviorSubject<string | null>(null),
};

export class ArticlesModel extends Context.Tag('ArticlesModel')<
  ArticlesModel,
  ArticlesModelService
>() {}

export const ArticlesModelLive = Layer.succeed(ArticlesModel, instance);

export const articlesModel = instance;
