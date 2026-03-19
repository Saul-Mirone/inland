import { Effect } from 'effect'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { SiteService } from '@/services/site'
import { runEffect } from '@/utils/effect-runtime'

const initialFormState = {
  name: '',
  description: '',
  author: '',
  templateOwner: 'Saul-Mirone',
  templateRepo: 'inland-template-basic',
}

export const CreateSite = () => {
  const [form, setForm] = useState(initialFormState)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateField =
    (field: keyof typeof initialFormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!form.name.trim()) {
      setError('Please enter a site name')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await runEffect(
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

      setForm(initialFormState)
    } catch {
      setError('Failed to create site')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Create New Site</h3>
      <p className="text-sm text-muted-foreground">
        This will automatically create a GitHub repository and enable GitHub
        Pages for your site using the Inland blog template.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Site Name (will be used as repository name):
            <input
              type="text"
              value={form.name}
              onChange={updateField('name')}
              placeholder="my-blog"
              disabled={loading}
              className="w-52 rounded-md border border-border bg-background px-2 py-1 text-sm disabled:opacity-50"
            />
          </label>
        </div>
        <div className="space-y-1.5">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Description (optional):
            <input
              type="text"
              value={form.description}
              onChange={updateField('description')}
              placeholder="My awesome blog"
              disabled={loading}
              className="w-80 rounded-md border border-border bg-background px-2 py-1 text-sm disabled:opacity-50"
            />
          </label>
        </div>
        <div className="space-y-1.5">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Author (optional, defaults to your GitHub username):
            <input
              type="text"
              value={form.author}
              onChange={updateField('author')}
              placeholder="Your Name"
              disabled={loading}
              className="w-52 rounded-md border border-border bg-background px-2 py-1 text-sm disabled:opacity-50"
            />
          </label>
        </div>

        <fieldset className="space-y-2 rounded-md border border-border p-4">
          <legend className="px-1 text-sm font-medium">
            Template Configuration
          </legend>
          <div>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Template Owner:
              <input
                type="text"
                value={form.templateOwner}
                onChange={updateField('templateOwner')}
                placeholder="Saul-Mirone"
                disabled={loading}
                className="w-52 rounded-md border border-border bg-background px-2 py-1 text-sm disabled:opacity-50"
              />
            </label>
          </div>
          <div>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Template Repository:
              <input
                type="text"
                value={form.templateRepo}
                onChange={updateField('templateRepo')}
                placeholder="inland-template-basic"
                disabled={loading}
                className="w-52 rounded-md border border-border bg-background px-2 py-1 text-sm disabled:opacity-50"
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Default: Saul-Mirone/inland-template-basic (official Inland blog
            template)
            <br />
            You can use any public GitHub template repository.
          </p>
        </fieldset>
        {error && (
          <div className="text-sm text-destructive">Error: {error}</div>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating Repository & Site...' : 'Create Site'}
        </Button>
      </form>
    </div>
  )
}
