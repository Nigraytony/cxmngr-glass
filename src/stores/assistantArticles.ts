import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import { getApiBase } from '../utils/api'
import { getAuthHeaders } from '../utils/auth'
import { useProjectStore } from './project'

export interface AssistantArticleListItem {
  slug: string
  category: string
  title: string
  author: string
  summary: string
  updatedAt: string
}

export interface AssistantArticle {
  slug: string
  category: string
  title: string
  author: string
  summary: string
  body: string
  tags: string[]
  updatedAt: string
}

const API_BASE = `${getApiBase()}/api/assistant`

export const useAssistantArticlesStore = defineStore('assistantArticles', () => {
  const loadingList = ref(false)
  const loadingArticle = ref(false)
  const error = ref<string | null>(null)
  const articles = ref<AssistantArticleListItem[]>([])
  const article = ref<AssistantArticle | null>(null)

  async function fetchArticles(opts?: { projectId?: string, q?: string, category?: string }) {
    const projectStore = useProjectStore()
    const pid = String(opts?.projectId || projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || '').trim()
    if (!pid) {
      articles.value = []
      return
    }
    loadingList.value = true
    error.value = null
    try {
      const { data } = await axios.get(`${API_BASE}/articles`, {
        params: {
          projectId: pid,
          ...(opts?.q ? { q: String(opts.q) } : {}),
          ...(opts?.category ? { category: String(opts.category) } : {}),
        },
        headers: getAuthHeaders(),
      })
      articles.value = Array.isArray(data?.articles) ? data.articles : []
    } catch (e: any) {
      articles.value = []
      error.value = e?.response?.data?.error || e?.message || 'Failed to load assistant articles'
    } finally {
      loadingList.value = false
    }
  }

  async function fetchArticle(slug: string, opts?: { projectId?: string }) {
    const projectStore = useProjectStore()
    const pid = String(opts?.projectId || projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || '').trim()
    const s = String(slug || '').trim()
    if (!pid || !s) {
      article.value = null
      return
    }
    loadingArticle.value = true
    error.value = null
    try {
      const { data } = await axios.get(`${API_BASE}/articles/${encodeURIComponent(s)}`, {
        params: { projectId: pid },
        headers: getAuthHeaders(),
      })
      article.value = data || null
    } catch (e: any) {
      article.value = null
      error.value = e?.response?.data?.error || e?.message || 'Failed to load assistant article'
    } finally {
      loadingArticle.value = false
    }
  }

  function clearArticle() {
    article.value = null
  }

  return {
    loadingList,
    loadingArticle,
    error,
    articles,
    article,
    fetchArticles,
    fetchArticle,
    clearArticle,
  }
})
