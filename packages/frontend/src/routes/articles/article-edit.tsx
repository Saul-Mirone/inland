import type React from 'react';

import { Effect } from 'effect';
import { CircleDot, Link, Upload } from 'lucide-react';

import { confirm } from '@/components/confirm-dialog';
import { MarkdownEditor } from '@/components/editor/markdown-editor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { articlesModel } from '@/model/articles-model';
import { ArticleService } from '@/services/article';
import { runEffect } from '@/utils/effect-runtime';
import { useObservable } from '@/utils/use-observable';

type PropertyRowProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
} & (
  | { as?: 'div' }
  | ({ as: 'button' } & React.ButtonHTMLAttributes<HTMLButtonElement>)
);

function PropertyRow(props: PropertyRowProps) {
  const { icon: Icon, label, children } = props;
  const className =
    'flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left hover:bg-muted/50';
  const inner = (
    <>
      <span className="flex w-20 shrink-0 items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </span>
      {children}
    </>
  );

  if (props.as === 'button') {
    const { as: _, icon: __, label: ___, children: ____, ...rest } = props;
    return (
      <button className={className} {...rest}>
        {inner}
      </button>
    );
  }

  return <div className={className}>{inner}</div>;
}

export function ArticleEditPage() {
  const currentArticle = useObservable(articlesModel.currentArticle$);
  const editing = useObservable(articlesModel.editing$);
  const loading = useObservable(articlesModel.articleLoading$);

  const updateField = <K extends keyof typeof editing>(
    field: K,
    value: (typeof editing)[K]
  ) => {
    void runEffect(
      Effect.flatMap(ArticleService, (svc) => svc.updateEditField(field, value))
    );
  };

  const handlePublish = async () => {
    const confirmed = await confirm({
      title:
        editing.status === 'published'
          ? 'Re-publish article'
          : 'Publish article',
      description: (
        <>
          This will push "{editing.title || 'Untitled'}" to GitHub as{' '}
          <code className="rounded bg-muted px-1 py-0.5">
            content/{editing.slug || 'untitled'}.md
          </code>
          . Continue?
        </>
      ),
      confirmText: editing.status === 'published' ? 'Re-publish' : 'Publish',
    });
    if (!confirmed) return;
    void runEffect(
      Effect.flatMap(ArticleService, (svc) => svc.publishCurrentArticle())
    );
  };

  if (loading || !currentArticle) {
    return (
      <div className="text-sm text-muted-foreground">Loading article...</div>
    );
  }

  return (
    <div>
      <div className="space-y-4 px-6">
        <input
          id="title"
          value={editing.title}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="Untitled"
          className="w-full text-4xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
        />

        <div className="space-y-0.5 text-sm">
          <PropertyRow icon={Link} label="Slug">
            <input
              id="slug"
              value={editing.slug}
              onChange={(e) => updateField('slug', e.target.value)}
              placeholder="article-slug"
              className="flex-1 bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
            />
          </PropertyRow>
          <PropertyRow icon={CircleDot} label="Status">
            <Select
              value={editing.status}
              onValueChange={(v) => {
                if (v === 'draft' || v === 'published') {
                  updateField('status', v);
                }
              }}
            >
              <SelectTrigger className="h-auto w-auto gap-1 border-none bg-transparent p-0 text-sm shadow-none focus:ring-0 dark:bg-transparent dark:hover:bg-transparent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </PropertyRow>
          <PropertyRow
            icon={Upload}
            label="Publish"
            as="button"
            type="button"
            onClick={handlePublish}
          >
            <span className="text-muted-foreground/70">
              {editing.status === 'published'
                ? 'Re-publish to GitHub'
                : 'Publish to GitHub'}
            </span>
          </PropertyRow>
        </div>

        <Separator />
      </div>

      <MarkdownEditor />
    </div>
  );
}
