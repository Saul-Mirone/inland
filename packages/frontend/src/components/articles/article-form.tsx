import { Effect } from 'effect'
import { useEffect, useState } from 'react'

import type { Article } from '@/model/articles-model'

import { Button } from '@/components/ui/button'
import { sitesModel } from '@/model/sites-model'
import { ArticleService } from '@/services/article'
import { SiteService } from '@/services/site'
import { runEffect } from '@/utils/effect-runtime'
import { useObservable } from '@/utils/use-observable'

interface ArticleFormProps {
  onArticleCreated: () => void
  editingArticle?: Article | null
  onCancelEdit?: () => void
}

const INITIAL_FORM_DATA: ArticleFormData = {
  siteId: '',
  title: '',
  slug: '',
  content: '',
  status: 'draft',
}

type ArticleFormData = {
  siteId: string
  title: string
  slug: string
  content: string
  status: 'draft' | 'published'
}

export const ArticleForm = ({
  onArticleCreated,
  editingArticle,
  onCancelEdit,
}: ArticleFormProps) => {
  const sites = useObservable(sitesModel.sites$)
  const sitesLoading = useObservable(sitesModel.loading$)
  const [formData, setFormData] = useState<ArticleFormData>(INITIAL_FORM_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    runEffect(Effect.flatMap(SiteService, (svc) => svc.fetchSites()))
  }, [])

  useEffect(() => {
    if (editingArticle) {
      setFormData({
        siteId: editingArticle.siteId,
        title: editingArticle.title,
        slug: editingArticle.slug,
        content: editingArticle.content,
        status: editingArticle.status,
      })
    } else {
      setFormData(INITIAL_FORM_DATA)
    }
  }, [editingArticle])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!formData.siteId || !formData.title || !formData.content) {
      setError('Site, title, and content are required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      if (editingArticle) {
        await runEffect(
          Effect.flatMap(ArticleService, (svc) =>
            svc.updateArticle(editingArticle.id, formData)
          )
        )
      } else {
        await runEffect(
          Effect.flatMap(ArticleService, (svc) => svc.createArticle(formData))
        )
        setFormData(INITIAL_FORM_DATA)
      }

      onArticleCreated()
    } catch {
      setError('Failed to save article')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  if (sitesLoading) {
    return <div className="text-sm text-muted-foreground">Loading sites...</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold">
        {editingArticle ? 'Edit Article' : 'Create New Article'}
      </h3>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <div className="space-y-1.5">
        <label htmlFor="siteId" className="text-sm font-medium">
          Site:
        </label>
        <select
          id="siteId"
          name="siteId"
          value={formData.siteId}
          onChange={handleInputChange}
          required
          className="ml-2 rounded-md border border-border bg-background px-2 py-1 text-sm"
        >
          <option value="">Select a site</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="title" className="text-sm font-medium">
          Title:
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          required
          className="ml-2 w-80 rounded-md border border-border bg-background px-2 py-1 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="slug" className="text-sm font-medium">
          Slug (optional):
        </label>
        <input
          type="text"
          id="slug"
          name="slug"
          value={formData.slug}
          onChange={handleInputChange}
          placeholder="Leave empty to auto-generate"
          className="ml-2 w-80 rounded-md border border-border bg-background px-2 py-1 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="status" className="text-sm font-medium">
          Status:
        </label>
        <select
          id="status"
          name="status"
          value={formData.status}
          onChange={handleInputChange}
          className="ml-2 rounded-md border border-border bg-background px-2 py-1 text-sm"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="content" className="text-sm font-medium">
          Content:
        </label>
        <textarea
          id="content"
          name="content"
          value={formData.content}
          onChange={handleInputChange}
          required
          rows={10}
          className="mt-1.5 block w-[500px] rounded-md border border-border bg-background p-2 text-sm"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? editingArticle
              ? 'Updating...'
              : 'Creating...'
            : editingArticle
              ? 'Update Article'
              : 'Create Article'}
        </Button>
        {editingArticle && onCancelEdit && (
          <Button type="button" variant="outline" onClick={onCancelEdit}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
