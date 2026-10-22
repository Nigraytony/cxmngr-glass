import { defineStore } from 'pinia'
import http from '../utils/http'

// ActionItems = work OWED out of an Activity (A-1, A-2 … with owner/due/status),
// as opposed to Actions = work performed. See backend models/actionItem.js.
// Network-only for now; offline outbox support rides along when actions get
// their optimistic-locking migration.
const API_BASE = '/api/action-items'

export const useActionItemsStore = defineStore('actionItems', () => {
  async function list(activityId: string, projectId?: string): Promise<any[]> {
    const params: any = { activityId }
    if (projectId) params.projectId = projectId
    const res = await http.get(API_BASE, { params })
    return Array.isArray(res.data) ? res.data : []
  }

  async function create(payload: Record<string, any>): Promise<any> {
    return (await http.post(API_BASE, payload)).data
  }

  async function update(id: string, payload: Record<string, any>): Promise<any> {
    return (await http.patch(`${API_BASE}/${id}`, payload)).data
  }

  async function remove(id: string): Promise<void> {
    await http.delete(`${API_BASE}/${id}`)
  }

  return { list, create, update, remove }
})
