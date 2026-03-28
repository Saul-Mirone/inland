import { Context, Layer } from 'effect';
import { BehaviorSubject } from 'rxjs';

export interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  tags: string | null;
  status: 'draft' | 'published';
  publishedAt: string | null;
  gitSyncedAt: string | null;
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
  excerpt: string;
  tags: string;
  status: 'draft' | 'published';
  publishedAt: string;
  saving: boolean;
}

export const INITIAL_EDITING: EditingState = {
  title: '',
  slug: '',
  content: '',
  excerpt: '',
  tags: '',
  status: 'draft',
  publishedAt: '',
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
  readonly selectedTag$: BehaviorSubject<string | null>;
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
  selectedTag$: new BehaviorSubject<string | null>(null),
};

export class ArticlesModel extends Context.Tag('ArticlesModel')<
  ArticlesModel,
  ArticlesModelService
>() {}

export const ArticlesModelLive = Layer.succeed(ArticlesModel, instance);

export const articlesModel = instance;

export function hasUnpublishedChanges(article: Article): boolean {
  if (article.status !== 'published') return false;
  if (!article.gitSyncedAt) return true;
  // Use 1s tolerance because gitSyncedAt (app-layer Date) and
  // updatedAt (Prisma @updatedAt) are set in the same operation
  // but can differ by tens of milliseconds.
  const diff =
    new Date(article.updatedAt).getTime() -
    new Date(article.gitSyncedAt).getTime();
  return diff > 1000;
}

export function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  return tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}
