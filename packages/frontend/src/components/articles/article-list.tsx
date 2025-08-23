import { useEffect, useState } from 'react'

import { getAuthToken } from '../../utils/auth'

interface Article {
  id: string
  title: string
  slug: string
  content: string
  status: 'draft' | 'published'
  siteId: string
  createdAt: string
  updatedAt: string
  site: {
    id: string
    name: string
  }
}

interface ArticleListProps {
  siteId?: string
  onEditArticle?: (article: Article) => void
}

export const ArticleList = ({ siteId, onEditArticle }: ArticleListProps) => {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [publishingId, setPublishingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchArticles = async () => {
      const token = getAuthToken()
      if (!token) {
        setError('No token found')
        setLoading(false)
        return
      }

      try {
        const url = siteId
          ? `http://localhost:3001/sites/${siteId}/articles`
          : 'http://localhost:3001/articles'

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch articles')
        }

        const data = await response.json()
        setArticles(data.articles)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchArticles().catch(console.error)
  }, [siteId])

  const deleteArticle = async (articleId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this article? This action cannot be undone.'
      )
    ) {
      return
    }

    setDeletingId(articleId)
    const token = getAuthToken()

    if (!token) {
      setError('No authentication token found')
      setDeletingId(null)
      return
    }

    try {
      const response = await fetch(
        `http://localhost:3001/articles/${articleId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete article')
      }

      const result = await response.json()

      // Remove the article from the list
      setArticles((prevArticles) =>
        prevArticles.filter((article) => article.id !== articleId)
      )

      // Show detailed success message
      let message = 'Article deleted successfully from database'
      if (result.hasGitHubRepo) {
        if (result.gitHubDeleted) {
          message += ' and GitHub repository'
        } else if (result.gitHubError) {
          message += `, but failed to delete from GitHub: ${result.gitHubError}`
        } else {
          message += ', file was not found in GitHub repository'
        }
      }
      alert(message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setDeletingId(null)
    }
  }

  const publishArticle = async (articleId: string) => {
    setPublishingId(articleId)
    const token = getAuthToken()

    if (!token) {
      setError('No authentication token found')
      setPublishingId(null)
      return
    }

    try {
      const response = await fetch(
        `http://localhost:3001/articles/${articleId}/publish`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to publish article')
      }

      const result = await response.json()

      // Update the article status in the list
      setArticles((prevArticles) =>
        prevArticles.map((article) =>
          article.id === articleId
            ? { ...article, status: 'published' as const }
            : article
        )
      )

      const action = result.wasUpdate ? 'updated' : 'published'
      alert(`Article ${action} successfully! File: ${result.filePath}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setPublishingId(null)
    }
  }

  if (loading) return <div>Loading articles...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      <h2>{siteId ? 'Site Articles' : 'All Articles'}</h2>
      {articles.length === 0 ? (
        <p>No articles yet. Create your first article!</p>
      ) : (
        <div>
          {articles.map((article) => (
            <div key={article.id}>
              <h3>{article.title}</h3>
              <p>Slug: {article.slug}</p>
              <p>Status: {article.status}</p>
              {!siteId && <p>Site: {article.site.name}</p>}
              <p>Created: {new Date(article.createdAt).toLocaleDateString()}</p>
              <p>Updated: {new Date(article.updatedAt).toLocaleDateString()}</p>
              <div style={{ marginTop: '0.5rem' }}>
                {onEditArticle && (
                  <button
                    onClick={() => onEditArticle(article)}
                    style={{ marginRight: '0.5rem' }}
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => publishArticle(article.id)}
                  disabled={publishingId === article.id}
                  style={{
                    marginRight: '0.5rem',
                    backgroundColor:
                      article.status === 'published' ? '#007bff' : '#28a745',
                    color: 'white',
                  }}
                >
                  {publishingId === article.id
                    ? 'Publishing...'
                    : article.status === 'published'
                      ? 'Re-publish'
                      : 'Publish'}
                </button>
                <button
                  onClick={() => deleteArticle(article.id)}
                  disabled={deletingId === article.id}
                  style={{ backgroundColor: '#dc3545', color: 'white' }}
                >
                  {deletingId === article.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
