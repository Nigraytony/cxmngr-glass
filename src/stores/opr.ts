import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import axios from 'axios'
import { getApiBase } from '../utils/api'
import { getAuthHeaders } from '../utils/auth'

const API_BASE = `${getApiBase()}/api/projects`

export type OprCategory = {
  id: string
  name: string
  sortOrder: number
}

export type OprQuestion = {
  id: string
  categoryId: string
  prompt: string
  answerWindowMinutes?: number | null
  status: 'draft' | 'open' | 'closed' | 'voting' | 'finalized'
  openedAt?: string | null
  closesAt?: string | null
  closedAt?: string | null
  votingOpenedAt?: string | null
  votingClosesAt?: string | null
  votingClosedAt?: string | null
  finalizedAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export type OprAnswer = {
  id: string
  text: string
  authorUserId: string | null
  seq?: number | null
  mergedIntoAnswerId?: string | null
  mergedFromAnswerIds?: string[]
  createdAt: string
  updatedAt: string
}

export type OprResult = {
  answerId: string
  text: string
  authorUserId: string | null
  score: number
  rank: number
  rankCounts: Record<string, number>
  voteCount: number
}

export type OprItem = {
  id: string
  categoryId: string | null
  questionId: string | null
  sourceAnswerId: string | null
  text: string
  score: number
  rank: number
  status: 'active' | 'archived'
  createdAt?: string | null
  updatedAt?: string | null
}

export const useOprStore = defineStore('opr', () => {
  const categories = ref<OprCategory[]>([])
  const questions = ref<OprQuestion[]>([])
  const active = ref<OprQuestion | null>(null)
  const answers = ref<OprAnswer[]>([])
  const results = ref<OprResult[]>([])
  const items = ref<OprItem[]>([])
  const loading = ref(false)

  const activeId = computed(() => active.value?.id || null)

  async function fetchCategories(projectId: string) {
    if (!projectId) { categories.value = []; return }
    const { data } = await axios.get(`${API_BASE}/${projectId}/opr/categories`, { headers: getAuthHeaders() })
    categories.value = Array.isArray(data) ? data : []
  }

  async function fetchActive(projectId: string) {
    if (!projectId) { active.value = null; return }
    const { data } = await axios.get(`${API_BASE}/${projectId}/opr/active`, { headers: getAuthHeaders() })
    active.value = data?.active || null
  }

  async function fetchQuestions(projectId: string) {
    if (!projectId) { questions.value = []; return }
    const { data } = await axios.get(`${API_BASE}/${projectId}/opr/questions`, { headers: getAuthHeaders() })
    questions.value = Array.isArray(data) ? data : []
  }

  async function createQuestion(projectId: string, payload: { categoryId: string; prompt: string; answerWindowMinutes?: number }) {
    const { data } = await axios.post(`${API_BASE}/${projectId}/opr/questions`, payload, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    })
    return data as { id: string }
  }

  async function openQuestion(projectId: string, questionId: string, durationMinutes?: number) {
    const { data } = await axios.post(`${API_BASE}/${projectId}/opr/questions/${questionId}/open`, { durationMinutes }, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    })
    return data
  }

  async function closeQuestion(projectId: string, questionId: string) {
    const { data } = await axios.post(`${API_BASE}/${projectId}/opr/questions/${questionId}/close`, {}, { headers: getAuthHeaders() })
    return data
  }

  async function openVoting(projectId: string, questionId: string, durationMinutes?: number) {
    const { data } = await axios.post(`${API_BASE}/${projectId}/opr/questions/${questionId}/open-voting`, { durationMinutes }, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    })
    return data
  }

  async function closeVoting(projectId: string, questionId: string) {
    const { data } = await axios.post(`${API_BASE}/${projectId}/opr/questions/${questionId}/close-voting`, {}, { headers: getAuthHeaders() })
    return data
  }

  async function updateQuestion(projectId: string, questionId: string, payload: { prompt?: string; categoryId?: string; answerWindowMinutes?: number }) {
    const { data } = await axios.patch(`${API_BASE}/${projectId}/opr/questions/${questionId}`, payload, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    })
    return data as { ok: boolean; question?: OprQuestion }
  }

  async function deleteQuestion(projectId: string, questionId: string) {
    const { data } = await axios.delete(`${API_BASE}/${projectId}/opr/questions/${questionId}`, { headers: getAuthHeaders() })
    return data as { ok: boolean }
  }

  async function join(projectId: string, questionId: string) {
    const { data } = await axios.post(`${API_BASE}/${projectId}/opr/questions/${questionId}/join`, {}, { headers: getAuthHeaders() })
    return data
  }

  async function heartbeat(projectId: string, questionId: string) {
    const { data } = await axios.post(`${API_BASE}/${projectId}/opr/questions/${questionId}/heartbeat`, {}, { headers: getAuthHeaders() })
    return data
  }

  async function fetchAnswers(projectId: string, questionId: string, opts?: { includeMerged?: boolean }) {
    if (!projectId || !questionId) { answers.value = []; return }
    const includeMerged = Boolean(opts?.includeMerged)
    const { data } = await axios.get(`${API_BASE}/${projectId}/opr/questions/${questionId}/answers`, {
      headers: getAuthHeaders(),
      params: includeMerged ? { includeMerged: 1 } : undefined,
    })
    answers.value = Array.isArray(data) ? data : []
  }

  async function submitAnswer(projectId: string, questionId: string, text: string) {
    const { data } = await axios.post(`${API_BASE}/${projectId}/opr/questions/${questionId}/answers`, { text }, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    })
    return data as { id: string }
  }

  async function submitVote(projectId: string, questionId: string, rankings: Array<{ answerId: string; rank: number }>) {
    const { data } = await axios.post(`${API_BASE}/${projectId}/opr/questions/${questionId}/votes`, { rankings }, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    })
    return data
  }

  async function fetchResults(projectId: string, questionId: string) {
    if (!projectId || !questionId) { results.value = []; return }
    const { data } = await axios.get(`${API_BASE}/${projectId}/opr/questions/${questionId}/results`, { headers: getAuthHeaders() })
    results.value = Array.isArray(data?.results) ? data.results : []
  }

  async function fetchItems(projectId: string, opts?: { categoryId?: string; includeArchived?: boolean }) {
    if (!projectId) { items.value = []; return }
    const params: Record<string, any> = {}
    if (opts?.categoryId) params.categoryId = opts.categoryId
    if (opts?.includeArchived) params.includeArchived = 1
    const { data } = await axios.get(`${API_BASE}/${projectId}/opr/items`, { headers: getAuthHeaders(), params })
    items.value = Array.isArray(data) ? data : []
  }

  async function refreshSession(projectId: string) {
    loading.value = true
    try {
      await Promise.all([fetchCategories(projectId), fetchQuestions(projectId), fetchActive(projectId)])
    } finally {
      loading.value = false
    }
  }

  async function startOprCheckout(projectId: string) {
    const { data } = await axios.post(`${getApiBase()}/api/stripe/project/${projectId}/addons/opr/checkout`, {}, { headers: getAuthHeaders() })
    return data as { url: string }
  }

  async function reconcileOprPurchase(projectId: string) {
    const { data } = await axios.post(`${getApiBase()}/api/stripe/project/${projectId}/addons/opr/reconcile`, {}, { headers: getAuthHeaders() })
    return data as { ok: boolean; enabled: boolean }
  }

  async function mergeAnswers(projectId: string, questionId: string, payload: { answerIds: string[]; mergedText: string }) {
    const { data } = await axios.post(`${API_BASE}/${projectId}/opr/questions/${questionId}/answers/merge`, payload, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    })
    return data as { ok: boolean; canonicalId: string }
  }

  async function unmergeAnswer(projectId: string, questionId: string, answerId: string) {
    const { data } = await axios.post(`${API_BASE}/${projectId}/opr/questions/${questionId}/answers/${answerId}/unmerge`, {}, {
      headers: getAuthHeaders(),
    })
    return data as { ok: boolean }
  }

  return {
    categories,
    questions,
    active,
    answers,
    results,
    items,
    loading,
    activeId,
    fetchCategories,
    fetchQuestions,
    fetchActive,
    createQuestion,
    openQuestion,
    closeQuestion,
    openVoting,
    closeVoting,
    updateQuestion,
    deleteQuestion,
    join,
    heartbeat,
    fetchAnswers,
    submitAnswer,
    submitVote,
    fetchResults,
    fetchItems,
    refreshSession,
    startOprCheckout,
    reconcileOprPurchase,
    mergeAnswers,
    unmergeAnswer,
  }
})
