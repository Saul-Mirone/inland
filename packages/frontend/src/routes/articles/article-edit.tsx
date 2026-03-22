import { Effect } from 'effect';
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { articlesModel } from '@/model/articles-model';
import { ArticleService } from '@/services/article';
import { runEffect } from '@/utils/effect-runtime';
import { useObservable } from '@/utils/use-observable';

export function ArticleEditPage() {
  const navigate = useNavigate();
  const currentArticle = useObservable(articlesModel.currentArticle$);
  const editing = useObservable(articlesModel.editing$);
  const loading = useObservable(articlesModel.loading$);

  const updateField = <K extends keyof typeof editing>(
    field: K,
    value: (typeof editing)[K]
  ) => {
    void runEffect(
      Effect.flatMap(ArticleService, (svc) => svc.updateEditField(field, value))
    );
  };

  const handleSave = () => {
    void runEffect(
      Effect.flatMap(ArticleService, (svc) => svc.saveCurrentArticle())
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
    ).then(() => navigate('/articles'));
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
            onValueChange={(v) =>
              updateField('status', v as 'draft' | 'published')
            }
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
          <label htmlFor="content" className="text-sm font-medium">
            Content
          </label>
          <Textarea
            id="content"
            value={editing.content}
            onChange={(e) => updateField('content', e.target.value)}
            rows={16}
            placeholder="Write your article content..."
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={editing.saving}>
            {editing.saving ? 'Saving...' : 'Save'}
          </Button>
          <Button variant="outline" onClick={() => navigate('/articles')}>
            Back to list
          </Button>
        </div>
      </div>
    </div>
  );
}
