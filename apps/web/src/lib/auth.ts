export function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

export function getClinicId() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('clinicId')
}

export function setAuth(token: string, clinicId: string) {
  localStorage.setItem('token', token)
  localStorage.setItem('clinicId', clinicId)
}

export function clearAuth() {
  localStorage.removeItem('token')
  localStorage.removeItem('clinicId')
}

export function isAuthenticated() {
  return !!getToken()
}