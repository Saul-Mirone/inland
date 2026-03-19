import { Effect } from 'effect'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { SiteService } from '@/services/site'
import { runEffect } from '@/utils/effect-runtime'

const initialFormState = {
  name: '',
  gitRepoFullName: '',
  description: '',
  setupWorkflow: true,
  enablePages: true,
  overrideExistingFiles: false,
}

export const ImportSite = () => {
  const [form, setForm] = useState(initialFormState)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const updateTextField =
    (field: 'name' | 'gitRepoFullName' | 'description') =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const updateCheckbox =
    (field: 'setupWorkflow' | 'enablePages' | 'overrideExistingFiles') =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({
        ...prev,
        [field]: e.target.checked,
      }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name.trim()) {
      setError('Please enter a site name')
      return
    }

    if (!form.gitRepoFullName.trim()) {
      setError('Please enter the repository full name (owner/repo)')
      return
    }

    if (
      !/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(form.gitRepoFullName.trim())
    ) {
      setError('Invalid repository format. Use: owner/repo-name')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await runEffect(
        Effect.flatMap(SiteService, (svc) =>
          svc.importSite({
            name: form.name.trim(),
            gitRepoFullName: form.gitRepoFullName.trim(),
            description: form.description.trim() || undefined,
            setupWorkflow: form.setupWorkflow,
            enablePages: form.enablePages,
            overrideExistingFiles: form.overrideExistingFiles,
          })
        )
      )

      const articlesMsg =
        result?.articlesImported !== undefined
          ? ` (${result.articlesImported} articles imported)`
          : ''
      setSuccess(`Import completed successfully!${articlesMsg}`)

      setForm(initialFormState)
    } catch {
      setError('Failed to import repository')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Import Existing Repository</h3>
      <p className="text-sm text-muted-foreground">
        Import an existing Git repository as a site. This will connect your
        repository to Inland CMS and optionally set up deployment workflows.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Site Name:
            <input
              type="text"
              value={form.name}
              onChange={updateTextField('name')}
              placeholder="my-blog"
              disabled={loading}
              className="w-52 rounded-md border border-border bg-background px-2 py-1 text-sm disabled:opacity-50"
            />
          </label>
        </div>

        <div className="space-y-1.5">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Repository Full Name (owner/repo):
            <input
              type="text"
              value={form.gitRepoFullName}
              onChange={updateTextField('gitRepoFullName')}
              placeholder="username/my-existing-repo"
              disabled={loading}
              className="w-80 rounded-md border border-border bg-background px-2 py-1 text-sm disabled:opacity-50"
            />
          </label>
        </div>

        <div className="space-y-1.5">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Description (optional):
            <input
              type="text"
              value={form.description}
              onChange={updateTextField('description')}
              placeholder="My awesome blog"
              disabled={loading}
              className="w-80 rounded-md border border-border bg-background px-2 py-1 text-sm disabled:opacity-50"
            />
          </label>
        </div>

        <fieldset className="space-y-2 rounded-md border border-border p-4">
          <legend className="px-1 text-sm font-medium">Import Options</legend>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.setupWorkflow}
              onChange={updateCheckbox('setupWorkflow')}
              disabled={loading}
              className="rounded border-border"
            />
            Setup Inland CMS workflow (deploy.yml and build files)
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.enablePages}
              onChange={updateCheckbox('enablePages')}
              disabled={loading}
              className="rounded border-border"
            />
            Enable GitHub Pages (if not already enabled)
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

          <p className="mt-2 text-xs text-muted-foreground">
            By default, the workflow will be set up and Pages will be enabled.
            Existing files will be skipped unless you check the override option.
          </p>
        </fieldset>

        {error && (
          <div className="text-sm text-destructive">Error: {error}</div>
        )}

        {success && <div className="text-sm text-emerald-600">{success}</div>}

        <Button type="submit" disabled={loading}>
          {loading ? 'Importing Repository...' : 'Import Repository'}
        </Button>
      </form>
    </div>
  )
}
