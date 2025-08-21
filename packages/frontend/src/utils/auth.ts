export const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken')
}

export const isAuthenticated = (): boolean => {
  return !!getAuthToken()
}

export const logout = (): void => {
  localStorage.removeItem('authToken')
  window.location.href = '/'
}
