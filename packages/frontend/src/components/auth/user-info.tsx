import { authModel } from '@/model/auth-model'
import { useObservable } from '@/utils/use-observable'

export const UserInfo = () => {
  const authState = useObservable(authModel.authState$)
  const user = authState.user

  if (authState.status === 'loading')
    return (
      <div className="text-sm text-muted-foreground">Loading user info...</div>
    )
  if (authState.error)
    return (
      <div className="text-sm text-destructive">Error: {authState.error}</div>
    )
  if (!user)
    return <div className="text-sm text-muted-foreground">No user data</div>

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground">
        User Information
      </h3>
      <div className="space-y-1 text-sm text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">ID:</span> {user.id}
        </p>
        <p>
          <span className="font-medium text-foreground">Username:</span>{' '}
          {user.username}
        </p>
        <p>
          <span className="font-medium text-foreground">Email:</span>{' '}
          {user.email || 'Not available'}
        </p>
        <p>
          <span className="font-medium text-foreground">Avatar:</span>{' '}
          {user.avatarUrl ? 'Available' : 'Not available'}
        </p>
        <p>
          <span className="font-medium text-foreground">Created:</span>{' '}
          {new Date(user.createdAt).toLocaleDateString()}
        </p>
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">Git Integrations</p>
        <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
          {user.gitIntegrations.map((integration) => (
            <li key={integration.platform}>
              {integration.platform}: {integration.platformUsername}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
