import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useAuthStore } from './auth'
import { useProjectStore } from './project'

export interface AssistantContext {
  projectId: string | null
  routeName?: string | null
  routePath?: string | null
  entityType?: string | null
  entityId?: string | null
  activeTab?: string | null
}

function normalizeTierKey(raw: any) {
  const s = String(raw || '').toLowerCase().trim()
  if (!s) return ''
  if (s === 'basic' || s.startsWith('basic')) return 'basic'
  if (s === 'standard' || s.startsWith('standard')) return 'standard'
  if (s === 'premium' || s.startsWith('premium')) return 'premium'
  if (s.includes('standard')) return 'standard'
  if (s.includes('premium')) return 'premium'
  if (s.includes('basic')) return 'basic'
  return ''
}

export const useAssistantStore = defineStore('assistant', () => {
  const open = ref(false)
  const context = ref<AssistantContext>({ projectId: null })

  const auth = useAuthStore()
  const projectStore = useProjectStore()

  const currentProject = computed(() => projectStore.currentProject || null)
  const tierKey = computed(() => normalizeTierKey(currentProject.value?.subscriptionTier || currentProject.value?.subscription))
  const projectType = computed(() => String(currentProject.value?.project_type || currentProject.value?.type || '').trim())

  const canUseAi = computed(() => {
    const p: any = currentProject.value || {}
    const planAllowsAi = tierKey.value === 'premium' || p?.subscriptionFeatures?.ai === true
    if (!planAllowsAi) return false
    const enabled = p?.ai?.enabled
    return enabled !== false
  })

  const introDismissedKey = computed(() => {
    const uid = String(auth.user?._id || auth.user?.id || auth.user?.email || 'anon')
    return `assistant.intro.dismissed:${uid}`
  })
  const introDismissed = ref(false)
  watch(
    introDismissedKey,
    (key) => {
      try {
        introDismissed.value = localStorage.getItem(key) === '1'
      } catch {
        introDismissed.value = false
      }
    },
    { immediate: true },
  )

  function dismissIntro() {
    introDismissed.value = true
    try {
      localStorage.setItem(introDismissedKey.value, '1')
    } catch {
      /* ignore */
    }
  }

  function setOpen(val: boolean) {
    open.value = val
  }

  function setContext(next: Partial<AssistantContext>) {
    context.value = { ...context.value, ...next }
  }

  function openWithContext(next?: Partial<AssistantContext>) {
    const pid = String(projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || '').trim()
    setContext({ projectId: pid || null, ...(next || {}) })
    const fetchProject = (projectStore as any).fetchProject
    if (
      pid &&
      typeof fetchProject === 'function' &&
      (!projectStore.currentProject || String((projectStore.currentProject as any).id || (projectStore.currentProject as any)._id || '') !== pid)
    ) {
      fetchProject(pid).catch(() => { /* ignore */ })
    }
    open.value = true
  }

  function close() {
    open.value = false
  }

  return {
    open,
    context,
    currentProject,
    tierKey,
    projectType,
    canUseAi,
    introDismissed,
    dismissIntro,
    setOpen,
    setContext,
    openWithContext,
    close,
  }
})
