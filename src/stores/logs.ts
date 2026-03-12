import { defineStore } from 'pinia'
import { ref } from 'vue'
import http from '../utils/http'

const API_BASE = `/api`

export type LogEvent = { ts?: string | Date; by?: string | null; type: string; message?: string; [k: string]: any }

export const useLogsStore = defineStore('logs', () => {
  const logsCache = ref<Record<string, LogEvent[]>>({})

  function keyFor(resource: string, id: string) {
    return `${resource}:${id}`
  }

  async function appendLog(resource: string, id: string, event: LogEvent) {
    if (!resource || !id) return
    try {
      const payload: any = { ...event }
      // ensure timestamp
      payload.ts = payload.ts ? new Date(payload.ts).toISOString() : new Date().toISOString()
      // Try to infer `by` from auth store lazily to avoid circular deps in some callers
      if (!('by' in payload) || payload.by == null || payload.by === '') {
        try {
          const { useAuthStore } = await import('./auth')
          const auth = useAuthStore()
          const u: any = auth?.user || null
          if (u) {
            const name = [u.firstName, u.lastName].filter(Boolean).join(' ')
            payload.by = name || u.email || null
          }
        } catch (e) {
          // ignore
        }
      }

      // POST to /api/{resource}/{id}/logs
      await http.post(`${API_BASE}/${resource}/${id}/logs`, payload)

      // optimistic cache update
      const k = keyFor(resource, id)
      const arr = logsCache.value[k] || []
      logsCache.value[k] = [{ ...payload }, ...arr].slice(0, 200)
    } catch (err) {
      // swallow errors; logging should not block flows
    }
  }

  async function fetchLogs(resource: string, id: string, opts?: { limit?: number; type?: string }) {
    if (!resource || !id) return []
    try {
      const params: any = {}
      if (opts?.limit) params.limit = opts.limit
      if (opts?.type) params.type = opts.type
      const res = await http.get(`${API_BASE}/${resource}/${id}/logs`, { params })
      const list = Array.isArray(res.data) ? res.data : []
      const k = keyFor(resource, id)
      logsCache.value[k] = list
      return list
    } catch (err) {
      return []
    }
  }

  function getCached(resource: string, id: string) {
    return logsCache.value[keyFor(resource, id)] || []
  }

  return { logsCache, appendLog, fetchLogs, getCached }
})
