import { defineStore } from 'pinia'
import { ref } from 'vue'
import http from '../utils/http'
import { getAuthHeaders } from '../utils/auth'
import { useAuthStore } from './auth'

export interface PendingInvite {
  id: string
  token?: string
  email: string
  createdAt?: string
  project?: { _id?: string; id?: string; name?: string; logo?: string }
}

export const useInvitationsStore = defineStore('invitations', () => {
  const invites = ref<PendingInvite[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchPending() {
    loading.value = true
    error.value = null
    try {
      const { data } = await http.get('/api/projects/my-invites', { headers: getAuthHeaders() })
      invites.value = Array.isArray(data) ? data : []
    } catch (e: any) {
      console.error('fetchPending invites error', e)
      error.value = e?.response?.data?.error || e.message || 'Failed to load invitations'
      invites.value = []
    } finally {
      loading.value = false
    }
  }

  async function acceptInvite(id: string) {
    if (!id) return false
    try {
      const { data } = await http.post(`/api/projects/invitations/${id}/accept`, {}, { headers: getAuthHeaders() })
      // remove from local list
      invites.value = invites.value.filter(i => i.id !== id)

      // Refresh canonical user from server and update auth store so UI (projects) reflect the accepted invite
      try {
        const auth = useAuthStore()
        const me = await http.get('/api/users/me', { headers: getAuthHeaders() })
        const serverUser = me && me.data && me.data.user ? me.data.user : null
        if (serverUser) {
          const preservedToken = auth.token || (auth.user && (auth.user as any).token) || null
          auth.user = Object.assign({}, auth.user || {}, serverUser)
          if (preservedToken && auth.user) auth.user.token = preservedToken
          try { localStorage.setItem('user', JSON.stringify(auth.user)) } catch (e) { /* ignore */ }
        }
      } catch (e) {
        // ignore refresh failures
      }

      // Return the accepted projectId if provided so caller can update project list optimistically
      return (data && (data.projectId || data.projectID)) || true
    } catch (e: any) {
      error.value = e?.response?.data?.error || e.message || 'Failed to accept invitation'
      return false
    }
  }

  return { invites, loading, error, fetchPending, acceptInvite }
})
