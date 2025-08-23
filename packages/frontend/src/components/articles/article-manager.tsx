import { useState } from 'react'

import { ArticleForm } from './article-form'
import { ArticleList } from './article-list'

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

export const ArticleManager = () => {
  const [refreshKey, setRefreshKey] = useState(0)
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)

  const handleArticleCreated = () => {
    // Force refresh of the article list
    setRefreshKey((prev) => prev + 1)
    // Clear editing state
    setEditingArticle(null)
  }

  const handleEditArticle = (article: Article) => {
    setEditingArticle(article)
  }

  const handleCancelEdit = () => {
    setEditingArticle(null)
  }

  return (
    <div>
      <h1>Article Management</h1>

      <div style={{ marginBottom: '2rem' }}>
        <ArticleForm
          onArticleCreated={handleArticleCreated}
          editingArticle={editingArticle}
          onCancelEdit={handleCancelEdit}
        />
      </div>

      <div>
        <ArticleList key={refreshKey} onEditArticle={handleEditArticle} />
      </div>
    </div>
  )
}
