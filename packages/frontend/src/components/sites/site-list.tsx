import { Effect } from 'effect'
import { useEffect } from 'react'

import { sitesModel } from '@/model/sites-model'
import { SiteService } from '@/services/site'
import { runEffect } from '@/utils/effect-runtime'
import { useObservable } from '@/utils/use-observable'

export const SiteList = () => {
  const sites = useObservable(sitesModel.sites$)
  const loading = useObservable(sitesModel.loading$)
  const error = useObservable(sitesModel.error$)

  useEffect(() => {
    runEffect(Effect.flatMap(SiteService, (svc) => svc.fetchSites()))
  }, [])

  const handleDelete = (siteId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this site? This action cannot be undone.'
      )
    ) {
      return
    }
    runEffect(Effect.flatMap(SiteService, (svc) => svc.deleteSite(siteId)))
  }

  if (loading) return <div>Loading sites...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      <h2>Your Sites</h2>
      {sites.length === 0 ? (
        <p>No sites yet. Create your first site!</p>
      ) : (
        <div>
          {sites.map((site) => (
            <div key={site.id}>
              <h3>{site.name}</h3>
              <p>Repository: {site.gitRepo}</p>
              <p>Platform: {site.platform}</p>
              <p>Status: {site.deployStatus}</p>
              <p>Articles: {site._count.articles}</p>
              <p>Media files: {site._count.media}</p>
              <p>Created: {new Date(site.createdAt).toLocaleDateString()}</p>
              <button onClick={() => handleDelete(site.id)}>Delete Site</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
