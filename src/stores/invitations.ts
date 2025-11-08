import { defineStore } from 'pinia'
import { ref } from 'vue'
import http from '../utils/http'
import { getAuthHeaders } from '../utils/auth'

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
      await http.post(`/api/projects/invitations/${id}/accept`, {}, { headers: getAuthHeaders() })
      // remove from local list
      invites.value = invites.value.filter(i => i.id !== id)
      return true
    } catch (e: any) {
      error.value = e?.response?.data?.error || e.message || 'Failed to accept invitation'
      return false
    }
  }

  return { invites, loading, error, fetchPending, acceptInvite }
})
