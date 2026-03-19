import { Effect } from 'effect'
import { useEffect } from 'react'

import type { Article } from '@/model/articles-model'

import { articlesModel } from '@/model/articles-model'
import { ArticleService } from '@/services/article'
import { runEffect } from '@/utils/effect-runtime'
import { useObservable } from '@/utils/use-observable'

interface ArticleListProps {
  siteId?: string
  onEditArticle?: (article: Article) => void
}

export const ArticleList = ({ siteId, onEditArticle }: ArticleListProps) => {
  const articles = useObservable(articlesModel.articles$)
  const loading = useObservable(articlesModel.loading$)
  const error = useObservable(articlesModel.error$)
  const deletingId = useObservable(articlesModel.deletingId$)
  const publishingId = useObservable(articlesModel.publishingId$)

  useEffect(() => {
    runEffect(
      Effect.flatMap(ArticleService, (svc) => svc.fetchArticles(siteId))
    )
  }, [siteId])

  const handleDelete = (articleId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this article? This action cannot be undone.'
      )
    ) {
      return
    }
    runEffect(
      Effect.flatMap(ArticleService, (svc) => svc.deleteArticle(articleId))
    )
  }

  const handlePublish = (articleId: string) => {
    runEffect(
      Effect.flatMap(ArticleService, (svc) => svc.publishArticle(articleId))
    )
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
                  onClick={() => handlePublish(article.id)}
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
                  onClick={() => handleDelete(article.id)}
                  disabled={deletingId === article.id}
                  style={{
                    backgroundColor: '#dc3545',
                    color: 'white',
                  }}
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
