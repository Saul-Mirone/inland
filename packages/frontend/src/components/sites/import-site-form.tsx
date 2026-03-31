import { Effect } from 'effect';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SiteService } from '@/services/site';
import { runEffect } from '@/utils/effect-runtime';

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_.]+/g, '-')
    .replace(/^-+|-+$/g, '');

const repoPattern = /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/;

const initialFormState = {
  gitRepoFullName: '',
  displayName: '',
  name: '',
  description: '',
  setupWorkflow: true,
  enablePages: true,
  overrideExistingFiles: false,
};

export function ImportSiteForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState(initialFormState);
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false);
  const [displayNameManuallyEdited, setDisplayNameManuallyEdited] =
    useState(false);
  const [descriptionManuallyEdited, setDescriptionManuallyEdited] =
    useState(false);
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfigForRepo = (repo: string) => {
    if (!repoPattern.test(repo.trim())) return;

    setConfigLoading(true);
    runEffect(
      Effect.flatMap(SiteService, (svc) => svc.fetchRepoConfig(repo.trim()))
    )
      .then(
        (config) => {
          if (!config) return;

          setForm((prev) => ({
            ...prev,
            ...(!displayNameManuallyEdited &&
              config.name && { displayName: config.name }),
            ...(!nameManuallyEdited &&
              config.name && {
                name: slugify(config.name),
              }),
            ...(!descriptionManuallyEdited &&
              config.description !== undefined && {
                description: config.description,
              }),
          }));
          return undefined;
        },
        () => undefined
      )
      .finally(() => setConfigLoading(false));
  };

  const updateRepo = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      gitRepoFullName: e.target.value,
    }));
  };

  const handleRepoBlur = () => {
    fetchConfigForRepo(form.gitRepoFullName);
  };

  const updateDisplayName = (e: React.ChangeEvent<HTMLInputElement>) => {
    const displayName = e.target.value;
    setDisplayNameManuallyEdited(true);
    setForm((prev) => ({
      ...prev,
      displayName,
      ...(!nameManuallyEdited && {
        name: slugify(displayName) || prev.name,
      }),
    }));
  };

  const updateName = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNameManuallyEdited(true);
    setForm((prev) => ({ ...prev, name: e.target.value }));
  };

  const updateDescription = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDescriptionManuallyEdited(true);
    setForm((prev) => ({
      ...prev,
      description: e.target.value,
    }));
  };

  const updateCheckbox =
    (field: 'setupWorkflow' | 'enablePages' | 'overrideExistingFiles') =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({
        ...prev,
        [field]: e.target.checked,
      }));

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.gitRepoFullName.trim()) {
      setError('Please enter the repository full name (owner/repo)');
      return;
    }

    if (!repoPattern.test(form.gitRepoFullName.trim())) {
      setError('Invalid repository format. Use: owner/repo-name');
      return;
    }

    if (!form.displayName.trim()) {
      setError('Please enter a site name');
      return;
    }

    setLoading(true);
    setError(null);

    runEffect(
      Effect.flatMap(SiteService, (svc) =>
        svc.importSite({
          name: form.name.trim() || slugify(form.displayName),
          displayName: form.displayName.trim() || undefined,
          gitRepoFullName: form.gitRepoFullName.trim(),
          description: form.description.trim() || undefined,
          setupWorkflow: form.setupWorkflow,
          enablePages: form.enablePages,
          overrideExistingFiles: form.overrideExistingFiles,
        })
      )
    )
      .then(
        () => {
          setForm(initialFormState);
          setNameManuallyEdited(false);
          setDisplayNameManuallyEdited(false);
          setDescriptionManuallyEdited(false);
          onSuccess();
          return undefined;
        },
        () => {
          setError('Failed to import repository');
          return undefined;
        }
      )
      .finally(() => setLoading(false));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Repository (owner/repo)
          <Input
            type="text"
            value={form.gitRepoFullName}
            onChange={updateRepo}
            onBlur={handleRepoBlur}
            placeholder="username/my-existing-repo"
            disabled={loading}
          />
          {configLoading && (
            <span className="text-xs text-muted-foreground">
              Detecting config...
            </span>
          )}
        </label>
      </div>

      <div className="space-y-1.5">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Site Name
          <Input
            type="text"
            value={form.displayName}
            onChange={updateDisplayName}
            placeholder="My Awesome Blog"
            disabled={loading}
          />
        </label>
      </div>

      <div className="space-y-1.5">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Site ID
          <Input
            type="text"
            value={form.name}
            onChange={updateName}
            placeholder="my-awesome-blog"
            disabled={loading}
          />
          <span className="text-xs text-muted-foreground">
            Auto-generated from site name. Used as an identifier.
          </span>
        </label>
      </div>

      <div className="space-y-1.5">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Description
          <Input
            type="text"
            value={form.description}
            onChange={updateDescription}
            placeholder="My awesome blog"
            disabled={loading}
          />
        </label>
      </div>

      <details className="group rounded-md border border-border">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
          Import Options
        </summary>
        <div className="space-y-2 border-t border-border px-3 py-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.setupWorkflow}
              onChange={updateCheckbox('setupWorkflow')}
              disabled={loading}
              className="rounded border-border"
            />
            Setup deployment workflow
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.enablePages}
              onChange={updateCheckbox('enablePages')}
              disabled={loading}
              className="rounded border-border"
            />
            Enable GitHub Pages
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.overrideExistingFiles}
              onChange={updateCheckbox('overrideExistingFiles')}
              disabled={loading}
              className="rounded border-border"
            />
            Override existing workflow files
          </label>
        </div>
      </details>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Importing...' : 'Import Repository'}
      </Button>
    </form>
  );
}
