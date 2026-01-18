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
  status: 'draft' | 'open' | 'closed' | 'voting' | 'finalized'
  openedAt?: string | null
  closesAt?: string | null
  closedAt?: string | null
  votingOpenedAt?: string | null
  votingClosesAt?: string | null
  votingClosedAt?: string | null
  finalizedAt?: string | null
}

export type OprAnswer = {
  id: string
  text: string
  authorUserId: string | null
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

export const useOprStore = defineStore('opr', () => {
  const categories = ref<OprCategory[]>([])
  const active = ref<OprQuestion | null>(null)
  const answers = ref<OprAnswer[]>([])
  const results = ref<OprResult[]>([])
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

  async function createQuestion(projectId: string, payload: { categoryId: string; prompt: string }) {
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

  async function join(projectId: string, questionId: string) {
    const { data } = await axios.post(`${API_BASE}/${projectId}/opr/questions/${questionId}/join`, {}, { headers: getAuthHeaders() })
    return data
  }

  async function heartbeat(projectId: string, questionId: string) {
    const { data } = await axios.post(`${API_BASE}/${projectId}/opr/questions/${questionId}/heartbeat`, {}, { headers: getAuthHeaders() })
    return data
  }

  async function fetchAnswers(projectId: string, questionId: string) {
    if (!projectId || !questionId) { answers.value = []; return }
    const { data } = await axios.get(`${API_BASE}/${projectId}/opr/questions/${questionId}/answers`, { headers: getAuthHeaders() })
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

  async function refreshSession(projectId: string) {
    loading.value = true
    try {
      await Promise.all([fetchCategories(projectId), fetchActive(projectId)])
    } finally {
      loading.value = false
    }
  }

  async function startOprCheckout(projectId: string) {
    const { data } = await axios.post(`${getApiBase()}/api/stripe/project/${projectId}/addons/opr/checkout`, {}, { headers: getAuthHeaders() })
    return data as { url: string }
  }

  return {
    categories,
    active,
    answers,
    results,
    loading,
    activeId,
    fetchCategories,
    fetchActive,
    createQuestion,
    openQuestion,
    closeQuestion,
    openVoting,
    closeVoting,
    join,
    heartbeat,
    fetchAnswers,
    submitAnswer,
    submitVote,
    fetchResults,
    refreshSession,
    startOprCheckout,
  }
})

