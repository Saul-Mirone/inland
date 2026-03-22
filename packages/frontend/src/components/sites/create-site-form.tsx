import { Effect } from 'effect';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SiteService } from '@/services/site';
import { runEffect } from '@/utils/effect-runtime';

const initialFormState = {
  name: '',
  description: '',
  author: '',
  templateOwner: 'Saul-Mirone',
  templateRepo: 'inland-template-basic',
};

export function CreateSiteForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField =
    (field: keyof typeof initialFormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setError('Please enter a site name');
      return;
    }

    setLoading(true);
    setError(null);

    runEffect(
      Effect.flatMap(SiteService, (svc) =>
        svc.createSite({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          author: form.author.trim() || undefined,
          templateOwner: form.templateOwner,
          templateRepo: form.templateRepo,
        })
      )
    )
      .then(
        () => {
          setForm(initialFormState);
          onSuccess();
          return undefined;
        },
        () => {
          setError('Failed to create site');
          return undefined;
        }
      )
      .finally(() => setLoading(false));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Site Name
          <Input
            type="text"
            value={form.name}
            onChange={updateField('name')}
            placeholder="my-blog"
            disabled={loading}
          />
        </label>
      </div>
      <div className="space-y-1.5">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Description
          <Input
            type="text"
            value={form.description}
            onChange={updateField('description')}
            placeholder="My awesome blog"
            disabled={loading}
          />
        </label>
      </div>
      <div className="space-y-1.5">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Author
          <Input
            type="text"
            value={form.author}
            onChange={updateField('author')}
            placeholder="Your Name"
            disabled={loading}
          />
          <span className="text-xs text-muted-foreground">
            Defaults to your GitHub username
          </span>
        </label>
      </div>

      <details className="group rounded-md border border-border">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
          Template Configuration
        </summary>
        <div className="space-y-3 border-t border-border px-3 py-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Template Owner
            <input
              type="text"
              value={form.templateOwner}
              onChange={updateField('templateOwner')}
              disabled={loading}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Template Repository
            <input
              type="text"
              value={form.templateRepo}
              onChange={updateField('templateRepo')}
              disabled={loading}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Default: Saul-Mirone/inland-template-basic
          </p>
        </div>
      </details>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Creating...' : 'Create Site'}
      </Button>
    </form>
  );
}
