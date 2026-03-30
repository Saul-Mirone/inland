import type React from 'react';

import { Effect } from 'effect';
import {
  Calendar as CalendarIcon,
  AlignLeft,
  Link,
  RefreshCw,
  Tag,
  Upload,
} from 'lucide-react';

import { confirm } from '@/components/confirm-dialog';
import { MarkdownEditor } from '@/components/editor/markdown-editor';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { articlesModel } from '@/model/articles-model';
import { ArticleService } from '@/services/article';
import { runEffect } from '@/utils/effect-runtime';
import { toKebabCase } from '@/utils/to-kebab-case';
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
    'flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left hover:bg-muted/50';
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

  const isPublished = currentArticle?.status === 'published';

  const handlePublish = async () => {
    const confirmed = await confirm({
      title: isPublished ? 'Re-publish article' : 'Publish article',
      description: (
        <>
          This will push "{editing.title || 'Untitled'}" to GitHub as{' '}
          <code className="rounded bg-muted px-1 py-0.5">
            content/{editing.slug || 'untitled'}.md
          </code>
          . Continue?
        </>
      ),
      confirmText: isPublished ? 'Re-publish' : 'Publish',
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
          onChange={(e) => {
            const newTitle = e.target.value;
            updateField('title', newTitle);
            if (!editing.slug) {
              updateField('slug', toKebabCase(newTitle));
            }
          }}
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
            <button
              type="button"
              title="Regenerate from title"
              className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground"
              onClick={() => updateField('slug', toKebabCase(editing.title))}
            >
              <RefreshCw className="size-3" />
            </button>
          </PropertyRow>
          <PropertyRow icon={AlignLeft} label="Excerpt">
            <input
              id="excerpt"
              value={editing.excerpt}
              onChange={(e) => updateField('excerpt', e.target.value)}
              placeholder="Brief summary (auto-generated if empty)"
              className="flex-1 bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
            />
          </PropertyRow>
          <PropertyRow icon={Tag} label="Tags">
            <input
              id="tags"
              value={editing.tags}
              onChange={(e) => updateField('tags', e.target.value)}
              placeholder="tag1, tag2, tag3"
              className="flex-1 bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
            />
          </PropertyRow>
          <PropertyRow icon={CalendarIcon} label="Date">
            <Popover>
              <PopoverTrigger className="flex-1 text-left text-sm">
                {editing.publishedAt ? (
                  new Date(editing.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                ) : (
                  <span className="text-muted-foreground/50">Pick a date</span>
                )}
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={
                    editing.publishedAt
                      ? new Date(editing.publishedAt)
                      : undefined
                  }
                  onSelect={(date) =>
                    updateField('publishedAt', date ? date.toISOString() : '')
                  }
                  captionLayout="dropdown"
                />
              </PopoverContent>
            </Popover>
          </PropertyRow>
          <PropertyRow
            icon={Upload}
            label="Publish"
            as="button"
            type="button"
            onClick={handlePublish}
          >
            <span className="text-muted-foreground/70">
              {isPublished ? 'Re-publish to GitHub' : 'Publish to GitHub'}
            </span>
          </PropertyRow>
        </div>

        <Separator />
      </div>

      <MarkdownEditor />
    </div>
  );
}
