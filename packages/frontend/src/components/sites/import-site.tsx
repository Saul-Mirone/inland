import { useState } from 'react'

import { getAuthToken } from '../../utils/auth'

interface ImportSiteProps {
  onSiteImported: () => void
}

export const ImportSite = ({ onSiteImported }: ImportSiteProps) => {
  const [name, setName] = useState('')
  const [gitRepoFullName, setGitRepoFullName] = useState('')
  const [description, setDescription] = useState('')
  const [setupWorkflow, setSetupWorkflow] = useState(true)
  const [enablePages, setEnablePages] = useState(true)
  const [overrideExistingFiles, setOverrideExistingFiles] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError('Please enter a site name')
      return
    }

    if (!gitRepoFullName.trim()) {
      setError('Please enter the repository full name (owner/repo)')
      return
    }

    // Validate repository format
    if (!/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(gitRepoFullName.trim())) {
      setError('Invalid repository format. Use: owner/repo-name')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    const token = getAuthToken()
    if (!token) {
      setError('No authentication token found')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('http://localhost:3001/sites/import', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          gitRepoFullName: gitRepoFullName.trim(),
          description: description.trim() || undefined,
          setupWorkflow,
          enablePages,
          overrideExistingFiles,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()

        // Handle auth token expiration
        if (
          response.status === 401 &&
          errorData.error.includes('connection has expired')
        ) {
          setError(errorData.error + ' You will be redirected to reconnect.')
          setTimeout(() => {
            window.location.href = 'http://localhost:3001/auth/github'
          }, 3000)
          return
        }

        throw new Error(errorData.error || 'Failed to import repository')
      }

      const result = await response.json()

      // Display success message with details
      const successMsg = `Successfully imported repository! ${result.articlesImported || 0} articles imported.`
      setSuccess(successMsg)

      // Clear form
      setName('')
      setGitRepoFullName('')
      setDescription('')
      setSetupWorkflow(true)
      setEnablePages(true)
      setOverrideExistingFiles(false)

      // Notify parent component
      onSiteImported()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h3>Import Existing Repository</h3>
      <p>
        Import an existing Git repository as a site. This will connect your
        repository to Inland CMS and optionally set up deployment workflows.
      </p>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label>
            Site Name:
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
            Repository Full Name (owner/repo):
            <input
              type="text"
              value={gitRepoFullName}
              onChange={(e) => setGitRepoFullName(e.target.value)}
              placeholder="username/my-existing-repo"
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

        <fieldset
          style={{
            marginBottom: '1rem',
            padding: '1rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
        >
          <legend>Import Options</legend>

          <div style={{ marginBottom: '0.5rem' }}>
            <label>
              <input
                type="checkbox"
                checked={setupWorkflow}
                onChange={(e) => setSetupWorkflow(e.target.checked)}
                disabled={loading}
              />
              <span style={{ marginLeft: '0.5rem' }}>
                Setup Inland CMS workflow (deploy.yml and build files)
              </span>
            </label>
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            <label>
              <input
                type="checkbox"
                checked={enablePages}
                onChange={(e) => setEnablePages(e.target.checked)}
                disabled={loading}
              />
              <span style={{ marginLeft: '0.5rem' }}>
                Enable GitHub Pages (if not already enabled)
              </span>
            </label>
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            <label>
              <input
                type="checkbox"
                checked={overrideExistingFiles}
                onChange={(e) => setOverrideExistingFiles(e.target.checked)}
                disabled={loading}
              />
              <span style={{ marginLeft: '0.5rem' }}>
                Override existing workflow files
              </span>
            </label>
          </div>

          <div
            style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}
          >
            By default, the workflow will be set up and Pages will be enabled.
            Existing files will be skipped unless you check the override option.
          </div>
        </fieldset>

        {error && (
          <div style={{ color: 'red', marginBottom: '1rem' }}>
            Error: {error}
          </div>
        )}

        {success && (
          <div style={{ color: 'green', marginBottom: '1rem' }}>{success}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{ padding: '0.5rem 1rem' }}
        >
          {loading ? 'Importing Repository...' : 'Import Repository'}
        </button>
      </form>
    </div>
  )
}
