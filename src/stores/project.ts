export interface Project {
  id: string;
  name: string;
  number?: string;
  po_number?: string;
  project_type: string;
  industry?: string;
  client: string;
  location: string;
  building_type: string;
  description?: string;
  status?: string; // e.g., 'active', 'completed', 'archived'
  settings?: string[]; // Additional settings for the project
  photos?: string[]; // Array of photo URLs or paths
  documents?: string[]; // Array of document URLs or paths
  team?: Array<{
    firstName: string;
    lastName: string;
    email: string;
    company: string;
    phone?: string; // Optional phone number
    role?: string;
    status?: string; // Optional status for team members
  }>;
  commissioning_agent?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    company?: string;
    role?: string;
    phone?: string;
    logo?: string; // Optional logo for the commissioning agent
  };
  logo?: string; // URL or path to a project logo
  meta?: string[]; // Additional metadata
  tags?: string[]; // Tags for categorization
  startDate?: string; // ISO date string
  endDate?: string; // ISO date strings
  createdAt: string;
  updatedAt: string;
  // Optional Stripe/Billing fields present on the project
  billingAdminUserId?: string | null;
  billingAdminSetBy?: string | null;
  billingAdminSetAt?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  stripeSubscriptionStatus?: string | null;
  stripeCurrentPeriodEnd?: string | null;
  stripeCancelAtPeriodEnd?: boolean;
  stripeCanceledAt?: string | null;
  stripeIsPastDue?: boolean;
  stripeLastPaymentStatus?: string | null;
  stripeLastInvoiceId?: string | null;
  stripeLastInvoiceStatus?: string | null;
  stripeDefaultPaymentMethod?: {
    id?: string;
    brand?: string;
    last4?: string;
    exp_month?: number;
    exp_year?: number;
    funding?: string;
    cardholder?: string | null;
  };
  trialStartedAt?: string | null;
  trialStarted?: boolean;
  trialStart?: string | null;
  trialEnd?: string | null;
  // Subscription/feature gating
  subscriptionTier?: 'basic' | 'standard' | 'premium';
  subscriptionFeatures?: any;
  // One-time paid add-ons
  addons?: {
    oprWorkshop?: {
      enabled?: boolean;
      purchasedAt?: string | null;
      stripeCheckoutSessionId?: string | null;
      stripePaymentIntentId?: string | null;
    };
  };
  // Optional per-project AI config (no secrets client-side)
  ai?: {
    enabled?: boolean;
    provider?: string;
    model?: string;
    hasKey?: boolean;
    lastVerifiedAt?: string | null;
    updatedAt?: string | null;
  };
  // Project-level search behavior applied across list pages
  searchMode?: 'substring' | 'exact' | 'fuzzy';
}

import { getApiBase } from '../utils/api'
const API_BASE = '/api/projects'

import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import axios from 'axios';
import { useAuthStore } from './auth';
import { getAuthHeaders, getToken } from '../utils/auth'
import http from '../utils/http'

// Billing API helpers
export async function fetchBillingSummary(projectId: string) {
  const res = await axios.get(`${getApiBase()}/api/stripe/project/${projectId}/summary`, { headers: getAuthHeaders() })
  return res.data
}

export async function previewPlanChange(projectId: string, priceId: string, prorationBehavior?: string) {
  const res = await axios.post(`${getApiBase()}/api/stripe/project/${projectId}/plan/preview`, { priceId, proration_behavior: prorationBehavior }, { headers: getAuthHeaders() })
  return res.data
}

export async function changePlan(projectId: string, priceId: string, prorationBehavior?: string) {
  const res = await axios.post(`${getApiBase()}/api/stripe/project/${projectId}/change-plan`, { priceId, proration_behavior: prorationBehavior }, { headers: getAuthHeaders() })
  return res.data
}

export async function cancelSubscription(projectId: string, atPeriodEnd = true) {
  const res = await axios.post(`${getApiBase()}/api/stripe/project/${projectId}/cancel`, { atPeriodEnd }, { headers: getAuthHeaders() })
  return res.data
}

export async function resumeSubscription(projectId: string) {
  const res = await axios.post(`${getApiBase()}/api/stripe/project/${projectId}/resume`, {}, { headers: getAuthHeaders() })
  return res.data
}

export async function changeBillingAdmin(projectId: string, payload: { userId?: string, email?: string } | string) {
  const body = typeof payload === 'string' ? { userId: payload, email: payload && payload.includes('@') ? payload : undefined } : payload
  const res = await axios.post(`${getApiBase()}/api/stripe/project/${projectId}/billing-admin`, body, { headers: getAuthHeaders() })
  return res.data
}

export async function createSetupIntent(projectId: string) {
  const res = await axios.post(`${getApiBase()}/api/stripe/project/${projectId}/setup-intent`, {}, { headers: getAuthHeaders() })
  return res.data
}

export async function updatePaymentMethod(projectId: string, paymentMethodId: string) {
  const res = await axios.post(`${getApiBase()}/api/stripe/project/${projectId}/payment-method`, { paymentMethodId }, { headers: getAuthHeaders() })
  return res.data
}

export async function listPaymentMethods(projectId: string) {
  const res = await axios.get(`${getApiBase()}/api/stripe/project/${projectId}/payment-methods`, { headers: getAuthHeaders() })
  return res.data
}

export async function detachPaymentMethod(projectId: string, pmId: string) {
  const res = await axios.delete(`${getApiBase()}/api/stripe/project/${projectId}/payment-methods/${pmId}`, { headers: getAuthHeaders() })
  return res.data
}

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([]);
  const currentProjectId = ref<string | null>(null);
  const currentProject = ref<Project | null>(null);
  const logsCache = ref<Record<string, any[]>>({});

  // Load selected project from localStorage on init
  if (typeof window !== 'undefined') {
    const storedId = localStorage.getItem('selectedProjectId');
    // guard against accidental string 'undefined' or empty values
    if (storedId && storedId !== 'undefined') {
      currentProjectId.value = storedId;
    } else {
      // if user has a default project in auth store, use it
      try {
        const auth = useAuthStore();
        const defaultProj = auth.user?.projects && auth.user.projects.find ? auth.user.projects.find((p: any) => p.default) : null;
        if (defaultProj) {
          if (typeof defaultProj === 'string') {
            currentProjectId.value = defaultProj;
          } else if (typeof defaultProj === 'object') {
            const dp: any = defaultProj
            currentProjectId.value = dp._id || dp.id || null;
          }
        }
      } catch (e) {
        // ignore if auth store isn't ready yet
      }
    }
  }

  

  function setCurrentProject(id: string) {
    currentProjectId.value = id;
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedProjectId', id);
    }
    // eagerly fetch and populate the currentProject object
    if (id) {
      fetchProject(id).catch(() => {
        // ignore errors here; caller can handle
      })
    } else {
      currentProject.value = null
    }
  }

  async function fetchProjects() {
    try {
      // Projects are always auth-scoped now; avoid noisy 401s when signed out.
      if (!getToken()) {
        projects.value = []
        return
      }

      // Prefer fetching the authenticated user's hydrated projects if available.
      const resp = await http.get(`/api/users/me`, { headers: getAuthHeaders() })
      const userProjects = resp?.data?.user?.projects || []
      projects.value = Array.isArray(userProjects)
        ? userProjects.map((p: any) => ({ ...p, id: p._id || p.id }))
        : []
    } catch (err) {
      // Optionally handle error
      projects.value = [];
    }
  }


  async function addProject(project: Partial<Project>) {
    if (!getToken()) throw new Error('Not signed in. Please log in.')
    const res = await http.post(API_BASE, project, { headers: getAuthHeaders() })
    const newProject = { ...res.data, id: res.data._id };
    projects.value.push(newProject);
    // Set as current so the sidebar/features reflect the new project's plan immediately.
    try {
      currentProjectId.value = String(newProject.id || (newProject as any)._id || '')
      if (currentProjectId.value) {
        if (typeof window !== 'undefined') localStorage.setItem('selectedProjectId', currentProjectId.value)
        currentProject.value = newProject as any
      }
    } catch (e) { /* ignore */ }
    try {
      await appendProjectLog(String(newProject.id || (newProject as any)._id), { type: 'create', message: `Project created: ${newProject.name || ''}`, details: newProject })
    } catch (e) { /* non-blocking */ }
    return newProject;
  }

  async function fetchProject(id: string) {
    if (!id) throw new Error('Missing project id')
    if (!getToken()) throw new Error('Not signed in. Please log in.')
    const res = await http.get(`${API_BASE}/${id}`, { headers: getAuthHeaders() })
    const p = { ...res.data, id: res.data._id }
    const idx = projects.value.findIndex(pr => pr.id === p.id)
    if (idx !== -1) projects.value.splice(idx, 1, p)
    else projects.value.push(p)
    // set the currentProject ref so consumers can react to it
    currentProject.value = p
    return p
  }

  async function updateProject(updated: Partial<Project> & { id?: string, _id?: string }) {
    const id = (updated.id || (updated as any)._id)
    if (!id) throw new Error('Missing project id')
    if (!getToken()) throw new Error('Not signed in. Please log in.')
    // avoid sending immutable _id or id in the update payload
    const payload: any = { ...updated };
    if (payload.id) delete payload.id;
    if (payload._id) delete payload._id;
    // Never send large read-only fields back to the API; they can exceed body limits (413)
    // and are managed by dedicated endpoints (e.g., /api/projects/:id/logs).
    if (payload.logs) delete payload.logs
    const res = await http.put(`${API_BASE}/${id}`, payload, { headers: getAuthHeaders() });
    const idx = projects.value.findIndex(p => p.id === id);
    if (idx !== -1) {
      projects.value[idx] = { ...res.data, id: res.data._id };
      // if we just updated the current project, refresh it
      if (currentProject.value && (currentProject.value.id === id || (currentProject.value as any)._id === id)) {
        currentProject.value = { ...res.data, id: res.data._id }
      }
    }
    try {
      await appendProjectLog(String(id), { type: 'update', message: `Project updated: ${(res.data && res.data.name) || id}`, details: payload })
    } catch (e) { /* non-blocking */ }
    return res.data;
  }

  async function deleteProject(id: string) {
    if (!id) throw new Error('Missing project id')
    if (!getToken()) throw new Error('Not signed in. Please log in.')
    await http.delete(`${API_BASE}/${id}`, { headers: getAuthHeaders() });
    projects.value = projects.value.filter(p => p.id !== id);
    try {
      await appendProjectLog(String(id), { type: 'delete', message: `Project deleted: ${id}` })
    } catch (e) { /* non-blocking */ }
  }

  async function archiveProject(id: string) {
    if (!id) throw new Error('Missing project id')
    if (!getToken()) throw new Error('Not signed in. Please log in.')
    await http.post(`${API_BASE}/${id}/archive`, {}, { headers: getAuthHeaders() });
    try {
      await appendProjectLog(String(id), { type: 'archive', message: `Project archived: ${id}` })
    } catch (e) { /* non-blocking */ }
  }

  async function restoreProject(id: string) {
    if (!id) throw new Error('Missing project id')
    if (!getToken()) throw new Error('Not signed in. Please log in.')
    const res = await http.post(`${API_BASE}/${id}/restore`, {}, { headers: getAuthHeaders() });
    try {
      await appendProjectLog(String(id), { type: 'restore', message: `Project restored: ${id}` })
    } catch (e) { /* non-blocking */ }
    return res.data
  }

  // Project logs API
  type LogEvent = { ts?: string | Date; by?: string | null; type: string; [k: string]: any }
  async function appendProjectLog(projectId: string, event: LogEvent): Promise<void> {
    if (!projectId) return
    try {
      const payload = { ...event }
      // Ensure actor is captured; fall back to auth user if not provided by caller
      if (!('by' in payload) || payload.by == null || payload.by === '') {
        try {
          const auth = useAuthStore()
          const u: any = auth?.user || null
          if (u) {
            const name = [u.firstName, u.lastName].filter(Boolean).join(' ')
            payload.by = name || u.email || null
          }
  } catch (e) { /* ignore */ }
      }
      if (!getToken()) return
      await http.post(`${API_BASE}/${projectId}/logs`, payload, { headers: getAuthHeaders() })
      // optimistic cache update
      const arr = logsCache.value[projectId] || []
      const ts = payload.ts ? new Date(payload.ts).toISOString() : new Date().toISOString()
      logsCache.value[projectId] = [{ ...payload, ts }, ...arr].slice(0, 200)
    } catch (err) {
      // swallow
    }
  }
  async function fetchProjectLogs(projectId: string, opts?: { page?: number; limit?: number; type?: string }): Promise<any> {
    if (!projectId) return { items: [], total: 0, page: 1, limit: 0, totalPages: 0 }
    try {
      const params: any = {}
      if (opts?.limit) params.limit = opts.limit
      if (opts?.page) params.page = opts.page
      if (opts?.type) params.type = opts.type
      if (!getToken()) return { items: [], total: 0, page: 1, limit: 0, totalPages: 0 }
      const res = await http.get(`${API_BASE}/${projectId}/logs`, { params, headers: getAuthHeaders() })
      const data = res.data || { items: [], total: 0, page: 1, limit: opts?.limit || 0, totalPages: 0 }
      // cache the last fetched page of items (optimistic)
      try {
        logsCache.value[projectId] = data.items || []
      } catch (e) { /* ignore */ }
      return data
    } catch (err) {
      return { items: [], total: 0, page: 1, limit: 0, totalPages: 0 }
    }
  }

  // Optionally, fetch projects on store init
  if (typeof window !== 'undefined') {
    // fetch all projects and then populate currentProject from localStorage if available
    fetchProjects().then(() => {
      const stored = localStorage.getItem('selectedProjectId')
      if (stored) {
        currentProjectId.value = stored
        fetchProject(stored).catch(() => {})
      } else {
        // if auth has a default project we already try to set currentProjectId earlier
        if (currentProjectId.value) fetchProject(currentProjectId.value).catch(() => {})
      }
    })
  }

  // Watch auth user projects so we can sync selected project when user data changes
  try {
    const auth = useAuthStore();
    watch(() => auth.user && auth.user.projects, (projectsVal) => {
      if (!projectsVal) return
      // If a project is already selected (from localStorage) but we haven't hydrated
      // `currentProject` yet (common during auth bootstrap), fetch it now so
      // feature-gated UI (e.g., Systems) can render correctly.
      try {
        if (currentProjectId.value && !currentProject.value && getToken()) {
          fetchProject(String(currentProjectId.value)).catch(() => {})
        }
      } catch (e) { /* ignore */ }
      // Do not override an explicit user selection (localStorage/currentProjectId).
      if (currentProjectId.value) return
      const dp = Array.isArray(projectsVal) ? projectsVal.find((p: any) => p && p.default) : null
      if (dp) {
        const dd: any = dp
        const id = typeof dp === 'string' ? dp : (dd._id || dd.id || null)
        if (id) setCurrentProject(String(id))
      }
    }, { immediate: true })

    // Also try again when auth finishes bootstrapping.
    watch(() => auth.authReady, (ready) => {
      if (!ready) return
      try {
        if (currentProjectId.value && !currentProject.value && getToken()) {
          fetchProject(String(currentProjectId.value)).catch(() => {})
        }
      } catch (e) { /* ignore */ }
    }, { immediate: true })
  } catch (e) {
    // ignore if store not ready
  }

  return {
    projects,
    currentProjectId,
    currentProject,
    setCurrentProject,
    fetchProjects,
  fetchProject,
    addProject,
    updateProject,
    deleteProject,
    archiveProject,
    restoreProject,
    // Logs
    appendProjectLog,
    fetchProjectLogs,
    logsCache,
  };
});
