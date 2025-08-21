import { useEffect } from 'react'

export const AuthCallback = () => {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')

    if (token) {
      localStorage.setItem('authToken', token)
      window.location.href = '/'
    } else {
      console.error('No token received')
    }
  }, [])

  return <div>Processing authentication...</div>
}
