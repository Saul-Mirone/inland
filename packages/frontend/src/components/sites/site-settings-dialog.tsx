import { Effect } from 'effect';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { sitesModel } from '@/model/sites-model';
import { SiteService } from '@/services/site';
import { runEffect } from '@/utils/effect-runtime';
import { useObservable } from '@/utils/use-observable';

export function SiteSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const sites = useObservable(sitesModel.sites$);
  const selectedSiteId = useObservable(sitesModel.selectedSiteId$);

  const site = useMemo(
    () => sites.find((s) => s.id === selectedSiteId),
    [sites, selectedSiteId]
  );

  if (!site) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Site Settings</DialogTitle>
          <DialogDescription>
            Update settings for{' '}
            <span className="font-medium">{site.displayName ?? site.name}</span>
          </DialogDescription>
        </DialogHeader>
        <SiteSettingsForm
          key={site.id}
          site={site}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function SiteSettingsForm({
  site,
  onSuccess,
}: {
  site: {
    id: string;
    name: string;
    displayName?: string | null;
    description?: string | null;
    gitRepo: string;
  };
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    displayName: site.displayName ?? '',
    description: site.description ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty =
    form.displayName !== (site.displayName ?? '') ||
    form.description !== (site.description ?? '');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    runEffect(
      Effect.flatMap(SiteService, (svc) =>
        svc.updateSite(site.id, {
          displayName: form.displayName.trim() || undefined,
          description: form.description.trim() || undefined,
        })
      )
    )
      .then(
        () => {
          onSuccess();
          return undefined;
        },
        () => {
          setError('Failed to update site settings');
          return undefined;
        }
      )
      .finally(() => setLoading(false));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Repository Name
          <Input type="text" value={site.name} disabled />
          <span className="text-xs text-muted-foreground">{site.gitRepo}</span>
        </label>
      </div>

      <div className="space-y-1.5">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Display Name
          <Input
            type="text"
            value={form.displayName}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                displayName: e.target.value,
              }))
            }
            placeholder={site.name}
            disabled={loading}
          />
          <span className="text-xs text-muted-foreground">
            Shown as the site title on your published site.
          </span>
        </label>
      </div>

      <div className="space-y-1.5">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Description
          <Textarea
            value={form.description}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
            placeholder="A short description of your site"
            disabled={loading}
            rows={3}
          />
        </label>
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <Button type="submit" disabled={loading || !isDirty} className="w-full">
        {loading ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  );
}
