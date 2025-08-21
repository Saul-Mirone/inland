import { useState } from 'react'

import { CreateSite } from './create-site'
import { SiteList } from './site-list'

export const SiteManager = () => {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleSiteCreated = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div>
      <h1>Site Management</h1>
      <CreateSite onSiteCreated={handleSiteCreated} />
      <SiteList key={refreshKey} />
    </div>
  )
}
