import { defineStore } from 'pinia'
import { ref } from 'vue'
import http from '../utils/http'
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
      const { data } = await http.get('/api/projects/my-invites')
      invites.value = Array.isArray(data) ? data : []
    } catch (e: any) {
      const status = e?.response?.status
      if (status !== 404) {
        // Log non-404 errors for visibility; 404 likely means endpoint not implemented in backend yet
        console.error('fetchPending invites error', e)
      }
      // Treat 404 as "no invites" without surfacing an error message
      error.value = status === 404 ? null : (e?.response?.data?.error || e.message || 'Failed to load invitations')
      invites.value = []
    } finally {
      loading.value = false
    }
  }

  async function acceptInvite(id: string) {
    if (!id) return false
    try {
      const { data } = await http.post(`/api/projects/invitations/${id}/accept`, {})
      // remove from local list
      invites.value = invites.value.filter(i => i.id !== id)

      // Refresh canonical user from server and update auth store so UI (projects) reflect the accepted invite
      try {
        const auth = useAuthStore()
        await auth.fetchMe()
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

  async function rejectInvite(id: string) {
    if (!id) return false
    try {
      await http.delete(`/api/projects/invitations/${id}`)
      invites.value = invites.value.filter(i => i.id !== id)
      return true
    } catch (e: any) {
      error.value = e?.response?.data?.error || e.message || 'Failed to decline invitation'
      return false
    }
  }

  return { invites, loading, error, fetchPending, acceptInvite, rejectInvite }
})
