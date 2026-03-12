import { authState$ } from '@/utils/auth'
import { useObservable } from '@/utils/use-observable'

export const UserInfo = () => {
  const authState = useObservable(authState$)
  const user = authState.user

  if (authState.status === 'loading') return <div>Loading user info...</div>
  if (authState.error) return <div>Error: {authState.error}</div>
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
