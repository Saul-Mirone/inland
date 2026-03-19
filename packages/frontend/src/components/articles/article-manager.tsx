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
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Article Management</h1>

      <div>
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
