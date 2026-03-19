import { useState } from 'react'

import type { Article } from '@/model/articles-model'

import { ArticleForm } from './article-form'
import { ArticleList } from './article-list'

export const ArticleManager = () => {
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)

  const handleArticleCreated = () => {
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
        <ArticleList onEditArticle={handleEditArticle} />
      </div>
    </div>
  )
}
