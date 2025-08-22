import { useState } from 'react'

import { getAuthToken } from '../../utils/auth'

interface CreateSiteProps {
  onSiteCreated: () => void
}

export const CreateSite = ({ onSiteCreated }: CreateSiteProps) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [author, setAuthor] = useState('')
  const [templateOwner, setTemplateOwner] = useState('Saul-Mirone')
  const [templateRepo, setTemplateRepo] = useState('inland-template-basic')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError('Please enter a site name')
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
          description: description.trim() || undefined,
          author: author.trim() || undefined,
          templateOwner,
          templateRepo,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()

        // Handle GitHub token expiration
        if (
          response.status === 401 &&
          errorData.error.includes('GitHub connection has expired')
        ) {
          setError(errorData.error + ' You will be redirected to reconnect.')
          // Redirect to GitHub auth after a short delay
          setTimeout(() => {
            window.location.href = 'http://localhost:3001/auth/github'
          }, 3000)
          return
        }

        throw new Error(errorData.error || 'Failed to create site')
      }

      setName('')
      setDescription('')
      setAuthor('')
      // Reset to default template
      setTemplateOwner('Saul-Mirone')
      setTemplateRepo('inland-template-basic')
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
      <p>
        This will automatically create a GitHub repository and enable GitHub
        Pages for your site using the Inland blog template.
      </p>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label>
            Site Name (will be used as repository name):
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-blog"
              disabled={loading}
              style={{
                marginLeft: '0.5rem',
                padding: '0.25rem',
                width: '200px',
              }}
            />
          </label>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label>
            Description (optional):
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="My awesome blog"
              disabled={loading}
              style={{
                marginLeft: '0.5rem',
                padding: '0.25rem',
                width: '300px',
              }}
            />
          </label>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label>
            Author (optional, defaults to your GitHub username):
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Your Name"
              disabled={loading}
              style={{
                marginLeft: '0.5rem',
                padding: '0.25rem',
                width: '200px',
              }}
            />
          </label>
        </div>

        <fieldset
          style={{
            marginBottom: '1rem',
            padding: '1rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
        >
          <legend>Template Configuration</legend>
          <div style={{ marginBottom: '0.5rem' }}>
            <label>
              Template Owner:
              <input
                type="text"
                value={templateOwner}
                onChange={(e) => setTemplateOwner(e.target.value)}
                placeholder="Saul-Mirone"
                disabled={loading}
                style={{
                  marginLeft: '0.5rem',
                  padding: '0.25rem',
                  width: '200px',
                }}
              />
            </label>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label>
              Template Repository:
              <input
                type="text"
                value={templateRepo}
                onChange={(e) => setTemplateRepo(e.target.value)}
                placeholder="inland-template-basic"
                disabled={loading}
                style={{
                  marginLeft: '0.5rem',
                  padding: '0.25rem',
                  width: '200px',
                }}
              />
            </label>
          </div>
          <div
            style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}
          >
            Default: Saul-Mirone/inland-template-basic (official Inland blog
            template)
            <br />
            You can use any public GitHub template repository.
          </div>
        </fieldset>
        {error && (
          <div style={{ color: 'red', marginBottom: '1rem' }}>
            Error: {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '0.5rem 1rem' }}
        >
          {loading ? 'Creating Repository & Site...' : 'Create Site'}
        </button>
      </form>
    </div>
  )
}
