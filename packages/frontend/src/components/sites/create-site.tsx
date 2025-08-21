import { useState } from 'react'

import { getAuthToken } from '../../utils/auth'

interface CreateSiteProps {
  onSiteCreated: () => void
}

export const CreateSite = ({ onSiteCreated }: CreateSiteProps) => {
  const [name, setName] = useState('')
  const [gitRepo, setGitRepo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !gitRepo.trim()) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    setError(null)

    const token = getAuthToken()
    if (!token) {
      setError('No authentication token found')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('http://localhost:3001/sites', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          gitRepo: gitRepo.trim(),
          platform: 'github',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create site')
      }

      setName('')
      setGitRepo('')
      onSiteCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h3>Create New Site</h3>
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            Site Name:
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-blog"
              disabled={loading}
            />
          </label>
        </div>
        <div>
          <label>
            Git Repository:
            <input
              type="text"
              value={gitRepo}
              onChange={(e) => setGitRepo(e.target.value)}
              placeholder="username/repository-name"
              disabled={loading}
            />
          </label>
        </div>
        {error && <div>Error: {error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Site'}
        </button>
      </form>
    </div>
  )
}
