const handleLogin = () => {
  window.location.href = 'http://localhost:3001/auth/github'
}

export const LoginButton = () => {
  return <button onClick={handleLogin}>Login with GitHub</button>
}
