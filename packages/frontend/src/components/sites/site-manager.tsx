import { useState } from 'react'

import { CreateSite } from './create-site'
import { ImportSite } from './import-site'
import { SiteList } from './site-list'

export const SiteManager = () => {
  const [refreshKey, setRefreshKey] = useState(0)
  const [showImport, setShowImport] = useState(false)

  const handleSiteCreated = () => {
    setRefreshKey((prev) => prev + 1)
  }

  const handleSiteImported = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div>
      <h1>Site Management</h1>

      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => setShowImport(false)}
          style={{
            padding: '0.5rem 1rem',
            marginRight: '1rem',
            backgroundColor: !showImport ? '#007bff' : '#fff',
            color: !showImport ? '#fff' : '#000',
            border: '1px solid #007bff',
            cursor: 'pointer',
          }}
        >
          Create New Site
        </button>
        <button
          onClick={() => setShowImport(true)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: showImport ? '#007bff' : '#fff',
            color: showImport ? '#fff' : '#000',
            border: '1px solid #007bff',
            cursor: 'pointer',
          }}
        >
          Import Existing Repository
        </button>
      </div>

      {showImport ? (
        <ImportSite onSiteImported={handleSiteImported} />
      ) : (
        <CreateSite onSiteCreated={handleSiteCreated} />
      )}

      <hr style={{ margin: '2rem 0' }} />

      <SiteList key={refreshKey} />
    </div>
  )
}
