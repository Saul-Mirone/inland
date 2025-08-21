import { useEffect, useState } from 'react'

import { getAuthToken } from '../../utils/auth'

interface Site {
  id: string
  name: string
  gitRepo: string
  platform: string
  deployStatus: string
  createdAt: string
  _count: {
    articles: number
    media: number
  }
}

export const SiteList = () => {
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchSites = async () => {
      const token = getAuthToken()
      if (!token) {
        setError('No token found')
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

  const deleteSite = async (siteId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this site? This action cannot be undone.'
      )
    ) {
      return
    }

    setDeletingId(siteId)
    const token = getAuthToken()

    if (!token) {
      setError('No authentication token found')
      setDeletingId(null)
      return
    }

    try {
      const response = await fetch(`http://localhost:3001/sites/${siteId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete site')
      }

      // Remove the site from the list
      setSites((prevSites) => prevSites.filter((site) => site.id !== siteId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setDeletingId(null)
    }
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
              <button
                onClick={() => deleteSite(site.id)}
                disabled={deletingId === site.id}
              >
                {deletingId === site.id ? 'Deleting...' : 'Delete Site'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
