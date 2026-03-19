import { Effect } from 'effect'
import { useEffect, useState } from 'react'

import type { Article } from '@/model/articles-model'

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

export const ArticleForm = ({
  onArticleCreated,
  editingArticle,
  onCancelEdit,
}: ArticleFormProps) => {
  const sites = useObservable(sitesModel.sites$)
  const sitesLoading = useObservable(sitesModel.loading$)
  const [formData, setFormData] = useState({
    siteId: '',
    title: '',
    slug: '',
    content: '',
    status: 'draft' as 'draft' | 'published',
  })
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
      setFormData({
        siteId: '',
        title: '',
        slug: '',
        content: '',
        status: 'draft',
      })
    }
  }, [editingArticle])

  const handleSubmit = async (e: React.FormEvent) => {
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
        setFormData({
          siteId: '',
          title: '',
          slug: '',
          content: '',
          status: 'draft',
        })
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

  if (sitesLoading) return <div>Loading sites...</div>

  return (
    <form onSubmit={handleSubmit}>
      <h3>{editingArticle ? 'Edit Article' : 'Create New Article'}</h3>

      {error && (
        <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="siteId">Site:</label>
        <select
          id="siteId"
          name="siteId"
          value={formData.siteId}
          onChange={handleInputChange}
          required
          style={{ marginLeft: '0.5rem', padding: '0.25rem' }}
        >
          <option value="">Select a site</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="title">Title:</label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          required
          style={{
            marginLeft: '0.5rem',
            padding: '0.25rem',
            width: '300px',
          }}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="slug">Slug (optional):</label>
        <input
          type="text"
          id="slug"
          name="slug"
          value={formData.slug}
          onChange={handleInputChange}
          placeholder="Leave empty to auto-generate"
          style={{
            marginLeft: '0.5rem',
            padding: '0.25rem',
            width: '300px',
          }}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="status">Status:</label>
        <select
          id="status"
          name="status"
          value={formData.status}
          onChange={handleInputChange}
          style={{ marginLeft: '0.5rem', padding: '0.25rem' }}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="content">Content:</label>
        <textarea
          id="content"
          name="content"
          value={formData.content}
          onChange={handleInputChange}
          required
          rows={10}
          style={{
            marginLeft: '0.5rem',
            padding: '0.5rem',
            width: '500px',
            display: 'block',
            marginTop: '0.5rem',
          }}
        />
      </div>

      <div>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: '0.5rem 1rem',
            marginRight: '0.5rem',
          }}
        >
          {isSubmitting
            ? editingArticle
              ? 'Updating...'
              : 'Creating...'
            : editingArticle
              ? 'Update Article'
              : 'Create Article'}
        </button>
        {editingArticle && onCancelEdit && (
          <button
            type="button"
            onClick={onCancelEdit}
            style={{ padding: '0.5rem 1rem' }}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
