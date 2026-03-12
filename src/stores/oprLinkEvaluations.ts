import { defineStore } from 'pinia'
import http from '../utils/http'

const API_BASE = `/api/projects`

export type OprLinkEvaluationStatus = 'unverified' | 'pass' | 'fail' | 'na'

export type OprLinkEvaluation = {
  id: string
  oprItemId: string
  contextType: string
  contextId: string | null
  contextLabel: string
  targetType: string
  targetId: string | null
  targetKey: string
  targetLabel: string
  status: OprLinkEvaluationStatus
  notes: string
  evidenceUrl: string
  evaluatedBy: string | null
  evaluatedAt: string | null
  updatedAt: string | null
  createdAt: string | null
}

export type OprCoverageRow = {
  counts: { unverified: number; pass: number; fail: number; na: number }
  total: number
  lastEvaluatedAt: string | null
}

export const useOprLinkEvaluationsStore = defineStore('oprLinkEvaluations', () => {
  async function fetchEvaluations(projectId: string, params: Record<string, any>) {
    const { data } = await http.get(`${API_BASE}/${projectId}/opr/link/evaluations`, { params })
    return (Array.isArray(data) ? data : []) as OprLinkEvaluation[]
  }

  async function upsertEvaluation(projectId: string, payload: {
    oprItemId: string
    contextType: string
    contextId: string
    contextLabel?: string
    targetType: string
    targetId?: string
    targetKey?: string
    targetLabel?: string
    status: OprLinkEvaluationStatus
    notes?: string
    evidenceUrl?: string
  }) {
    const { data } = await http.put(`${API_BASE}/${projectId}/opr/link/evaluations`, payload, {
      headers: { 'Content-Type': 'application/json' },
    })
    return data as { ok: boolean; evaluation?: { id: string } | null }
  }

  async function fetchCoverage(projectId: string, ids?: string[]) {
    const params: Record<string, any> = {}
    if (Array.isArray(ids) && ids.length) params.ids = ids.join(',')
    const { data } = await http.get(`${API_BASE}/${projectId}/opr/link/coverage`, { params })
    const coverage = (data && typeof data.coverage === 'object') ? data.coverage : {}
    return coverage as Record<string, OprCoverageRow>
  }

  return { fetchEvaluations, upsertEvaluation, fetchCoverage }
})
