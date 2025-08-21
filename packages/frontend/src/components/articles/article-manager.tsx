import { useState } from 'react'

import { ArticleForm } from './article-form'
import { ArticleList } from './article-list'

export const ArticleManager = () => {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleArticleCreated = () => {
    // Force refresh of the article list
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div>
      <h1>Article Management</h1>

      <div style={{ marginBottom: '2rem' }}>
        <ArticleForm onArticleCreated={handleArticleCreated} />
      </div>

      <div>
        <ArticleList key={refreshKey} />
      </div>
    </div>
  )
}
