import { useEffect, useState } from 'react'

import { getAuthToken } from '../../utils/auth'

interface Site {
  id: string
  name: string
}

interface Article {
  id: string
  title: string
  slug: string
  content: string
  status: 'draft' | 'published'
  siteId: string
}

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
  const [sites, setSites] = useState<Site[]>([])
  const [formData, setFormData] = useState({
    siteId: '',
    title: '',
    slug: '',
    content: '',
    status: 'draft' as 'draft' | 'published',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Load editing article data when editingArticle changes
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

  useEffect(() => {
    const fetchSites = async () => {
      const token = getAuthToken()
      if (!token) {
        setError('No authentication token found')
        setLoading(false)
        return
      }

      try {
        const response = await fetch('http://localhost:3001/sites', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch sites')
        }

        const data = await response.json()
        setSites(data.sites)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchSites().catch(console.error)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.siteId || !formData.title || !formData.content) {
      setError('Site, title, and content are required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const token = getAuthToken()
    if (!token) {
      setError('No authentication token found')
      setIsSubmitting(false)
      return
    }

    try {
      const isEditing = !!editingArticle
      const url = isEditing
        ? `http://localhost:3001/articles/${editingArticle.id}`
        : 'http://localhost:3001/articles'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.error ||
            `Failed to ${isEditing ? 'update' : 'create'} article`
        )
      }

      // Reset form only if creating new article
      if (!isEditing) {
        setFormData({
          siteId: '',
          title: '',
          slug: '',
          content: '',
          status: 'draft',
        })
      }

      onArticleCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
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

  if (loading) return <div>Loading sites...</div>

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
          style={{ marginLeft: '0.5rem', padding: '0.25rem', width: '300px' }}
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
          style={{ marginLeft: '0.5rem', padding: '0.25rem', width: '300px' }}
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
          style={{ padding: '0.5rem 1rem', marginRight: '0.5rem' }}
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
