export function AuthError() {
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-destructive">
      Authentication failed or the session could not be restored.
    </div>
  )
}
