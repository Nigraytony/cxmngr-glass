import { defineStore } from 'pinia'
import http from '../utils/http'

// Actions = sub-records of work under an Activity (see backend models/action.js).
export const useActionsStore = defineStore('actions', () => {
  async function list(activityId: string, projectId?: string) {
    const params: any = { activityId }
    if (projectId) params.projectId = projectId
    const { data } = await http.get('/api/actions', { params })
    return Array.isArray(data) ? data : []
  }

  async function create(payload: Record<string, any>) {
    const { data } = await http.post('/api/actions', payload)
    return data
  }

  async function update(id: string, payload: Record<string, any>) {
    const { data } = await http.patch(`/api/actions/${id}`, payload)
    return data
  }

  async function remove(id: string) {
    await http.delete(`/api/actions/${id}`)
  }

  return { list, create, update, remove }
})
