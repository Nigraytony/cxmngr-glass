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
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  stripeSubscriptionStatus?: string | null;
  stripeCurrentPeriodEnd?: string | null;
  stripeCancelAtPeriodEnd?: boolean;
  trialStartedAt?: string | null;
  trialStarted?: boolean;
  trialStart?: string | null;
  trialEnd?: string | null;
  // Project-level search behavior applied across list pages
  searchMode?: 'substring' | 'exact' | 'fuzzy';
}

import { getApiBase } from '../utils/api'
const API_BASE = `${getApiBase()}/api/projects`;

import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import axios from 'axios';
import { useAuthStore } from './auth';
import { getAuthHeaders } from '../utils/auth'

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
      // Prefer fetching the authenticated user's hydrated projects if available
      try {
        const auth = useAuthStore();
        if (auth && auth.token) {
          const resp = await axios.get(`${getApiBase()}/api/users/me`, { headers: getAuthHeaders() });
          const userProjects = resp?.data?.user?.projects || [];
          projects.value = Array.isArray(userProjects)
            ? userProjects.map((p: any) => ({ ...p, id: p._id || p.id }))
            : [];
          return;
        }
      } catch (innerErr) {
        // fall back to public projects list if fetching /me failed
      }

      const res = await axios.get(API_BASE);
      // Map backend _id to id for frontend
      projects.value = Array.isArray(res.data) ? res.data.map((p: any) => ({ ...p, id: p._id })) : [];
    } catch (err) {
      // Optionally handle error
      projects.value = [];
    }
  }


  async function addProject(project: Partial<Project>) {
    try {
      // Get current userId from auth store
      const authStore = useAuthStore();
      const userId = authStore.user?.id;
      if (!userId) throw new Error('No user ID found. Please log in.');
      const res = await axios.post( API_BASE, { ...project, userId });
      const newProject = { ...res.data, id: res.data._id };
      projects.value.push(newProject);
      return newProject;
    } catch (err) {
      throw err;
    }
  }

  async function fetchProject(id: string) {
    try {
      const res = await axios.get(`${API_BASE}/${id}`)
      const p = { ...res.data, id: res.data._id }
      const idx = projects.value.findIndex(pr => pr.id === p.id)
      if (idx !== -1) projects.value.splice(idx, 1, p)
      else projects.value.push(p)
      // set the currentProject ref so consumers can react to it
      currentProject.value = p
      return p
    } catch (err) {
      throw err
    }
  }

  async function updateProject(updated: Partial<Project> & { id?: string, _id?: string }) {
    try {
      const id = (updated.id || (updated as any)._id)
      if (!id) throw new Error('Missing project id')
      // avoid sending immutable _id or id in the update payload
      const payload: any = { ...updated };
      if (payload.id) delete payload.id;
      if (payload._id) delete payload._id;
      const res = await axios.put(`${API_BASE}/${id}`, payload, { headers: getAuthHeaders() });
      const idx = projects.value.findIndex(p => p.id === id);
      if (idx !== -1) {
        projects.value[idx] = { ...res.data, id: res.data._id };
        // if we just updated the current project, refresh it
        if (currentProject.value && (currentProject.value.id === id || (currentProject.value as any)._id === id)) {
            currentProject.value = { ...res.data, id: res.data._id }
        }
      }
      return res.data;
    } catch (err) {
      throw err;
    }
  }

  async function deleteProject(id: string) {
    try {
      await axios.delete(`/api/projects/${id}`);
      projects.value = projects.value.filter(p => p.id !== id);
    } catch (err) {
      throw err;
    }
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
        } catch { /* ignore */ }
      }
      await axios.post(`${API_BASE}/${projectId}/logs`, payload, { headers: getAuthHeaders() })
      // optimistic cache update
      const arr = logsCache.value[projectId] || []
      const ts = payload.ts ? new Date(payload.ts).toISOString() : new Date().toISOString()
      logsCache.value[projectId] = [{ ...payload, ts }, ...arr].slice(0, 200)
    } catch (err) {
      // swallow
    }
  }
  async function fetchProjectLogs(projectId: string, opts?: { limit?: number; type?: string }): Promise<any[]> {
    if (!projectId) return []
    try {
      const params: any = {}
      if (opts?.limit) params.limit = opts.limit
      if (opts?.type) params.type = opts.type
      const res = await axios.get(`${API_BASE}/${projectId}/logs`, { params, headers: getAuthHeaders() })
      const list = Array.isArray(res.data) ? res.data : []
      logsCache.value[projectId] = list
      return list
    } catch (err) {
      return []
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
      const dp = Array.isArray(projectsVal) ? projectsVal.find((p: any) => p && p.default) : null
      if (dp) {
        const dd: any = dp
        const id = typeof dp === 'string' ? dp : (dd._id || dd.id || null)
        if (id) currentProjectId.value = id
      }
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
    // Logs
    appendProjectLog,
    fetchProjectLogs,
    logsCache,
  };
});
