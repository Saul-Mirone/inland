import { Effect } from 'effect';
import { useNavigate } from 'react-router';

import { MarkdownEditor } from '@/components/editor/markdown-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { articlesModel } from '@/model/articles-model';
import { ArticleService } from '@/services/article';
import { runEffect } from '@/utils/effect-runtime';
import { fireAndForget } from '@/utils/fire-and-forget';
import { useObservable } from '@/utils/use-observable';

export function ArticleEditPage() {
  const navigate = useNavigate();
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

  const handleDelete = () => {
    if (
      !confirm(
        'Are you sure you want to delete this article? This action cannot be undone.'
      )
    ) {
      return;
    }
    void runEffect(
      Effect.flatMap(ArticleService, (svc) => svc.deleteCurrentArticle())
    ).then(() => fireAndForget(navigate('/')));
  };

  const handlePublish = () => {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Article</h1>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handlePublish}>
            {editing.status === 'published' ? 'Re-publish' : 'Publish'}
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="title" className="text-sm font-medium">
            Title
          </label>
          <Input
            id="title"
            value={editing.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="Article title"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="slug" className="text-sm font-medium">
            Slug
          </label>
          <Input
            id="slug"
            value={editing.slug}
            onChange={(e) => updateField('slug', e.target.value)}
            placeholder="article-slug"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="status" className="text-sm font-medium">
            Status
          </label>
          <Select
            value={editing.status}
            onValueChange={(v) => {
              if (v === 'draft' || v === 'published') {
                updateField('status', v);
              }
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Content</label>
          <MarkdownEditor />
        </div>
      </div>
    </div>
  );
}
