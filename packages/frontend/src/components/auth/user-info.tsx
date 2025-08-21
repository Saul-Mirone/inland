import { useEffect, useState } from 'react'

import { getAuthToken } from '../../utils/auth'

interface User {
  id: string
  username: string
  email: string | null
  avatarUrl: string | null
  createdAt: string
  gitIntegrations: Array<{
    platform: string
    platformUsername: string
  }>
}

export const UserInfo = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserInfo = async () => {
      const token = getAuthToken()
      if (!token) {
        setError('No token found')
        setLoading(false)
        return
      }

      try {
        const response = await fetch('http://localhost:3001/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch user info')
        }

        const data = await response.json()
        setUser(data.user)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchUserInfo().catch(console.error)
  }, [])

  if (loading) return <div>Loading user info...</div>
  if (error) return <div>Error: {error}</div>
  if (!user) return <div>No user data</div>

  return (
    <div>
      <h3>User Information (Debug)</h3>
      <p>
        <strong>ID:</strong> {user.id}
      </p>
      <p>
        <strong>Username:</strong> {user.username}
      </p>
      <p>
        <strong>Email:</strong> {user.email || 'Not available'}
      </p>
      <p>
        <strong>Avatar:</strong>{' '}
        {user.avatarUrl ? 'Available' : 'Not available'}
      </p>
      <p>
        <strong>Created:</strong>{' '}
        {new Date(user.createdAt).toLocaleDateString()}
      </p>
      <p>
        <strong>Git Integrations:</strong>
      </p>
      <ul>
        {user.gitIntegrations.map((integration, index) => (
          <li key={index}>
            {integration.platform}: {integration.platformUsername}
          </li>
        ))}
      </ul>
    </div>
  )
}
