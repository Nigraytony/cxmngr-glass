import { useAuthStore } from '../stores/auth'

export function getToken() {
  try {
    const auth = useAuthStore()
    return auth?.token || localStorage.getItem('token') || null
  } catch (e) {
    return localStorage.getItem('token') || null
  }
}

export function getAuthHeaders() {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}
