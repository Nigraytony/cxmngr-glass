import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { useProjectStore } from './project';
import { api } from '../utils/api';

export type UserRole = 'admin' | 'manager' | 'viewer' | 'globaladmin' | 'superadmin' | 'user';

export interface User {
  _id: string;
  id?: string;
  avatar?: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  projects?: any[];
  contact: {
    company: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
      country: string;
      taxId: string;
    };
    bio: string;
    avatar: string;
    signature?: {
      title?: string;
      person?: string;
      block?: string;
    };
    perPage?: number;
    ui?: {
      equipmentListChartsDefault?: boolean;
      issuesListChartsDefault?: boolean;
      tasksListChartsDefault?: boolean;
    };
  };
  social_media?: {
    linkedin?: string;
    x?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
    github?: string;
    telegram?: string;
    website?: string;
  };
}

const AUTH_LAST_ACTIVITY_KEY = 'auth.lastActivityAt'
const AUTH_SESSION_EXPIRED_KEY = 'auth.sessionExpired'
const AUTH_SESSION_EXPIRED_REASON_KEY = 'auth.sessionExpiredReason'
const AUTH_INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000

function decodeJwtExpMs(token: string | null | undefined): number {
  try {
    const raw = String(token || '').trim()
    if (!raw) return 0
    const parts = raw.split('.')
    if (parts.length < 2 || !parts[1]) return 0
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const decoded = JSON.parse(atob(padded))
    const exp = Number(decoded?.exp || 0)
    return Number.isFinite(exp) && exp > 0 ? exp * 1000 : 0
  } catch (e) {
    return 0
  }
}

function readStoredActivityAt(): number {
  try {
    const raw = sessionStorage.getItem(AUTH_LAST_ACTIVITY_KEY)
    const value = Number(raw)
    return Number.isFinite(value) && value > 0 ? value : 0
  } catch (e) {
    return 0
  }
}

function storeActivityAt(value: number) {
  try { sessionStorage.setItem(AUTH_LAST_ACTIVITY_KEY, String(value)) } catch (e) { /* ignore */ }
}

function clearStoredActivityAt() {
  try { sessionStorage.removeItem(AUTH_LAST_ACTIVITY_KEY) } catch (e) { /* ignore */ }
}

function markExpiredReason(reason: 'expired' | 'inactive' = 'expired') {
  try {
    sessionStorage.setItem(AUTH_SESSION_EXPIRED_KEY, '1')
    sessionStorage.setItem(AUTH_SESSION_EXPIRED_REASON_KEY, reason)
  } catch (e) {
    // ignore
  }
}

function syncDefaultProject(user: any) {
  try {
    const projectStore = useProjectStore();
    const projects = user && Array.isArray(user.projects) ? user.projects : [];
    const dp = projects.find((p: any) => p && p.default);
    if (!dp) return;
    const id = typeof dp === 'string' ? dp : (dp._id || dp.id || null);
    if (id) projectStore.setCurrentProject(id);
  } catch (e) {
    // ignore
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const lastActivityAt = ref<number>(readStoredActivityAt());
  const sessionWarningOpen = ref(false)
  const sessionWarningDeadlineAt = ref(0)
  const accessToken = ref<string | null>((() => {
    try {
      const t = sessionStorage.getItem('auth.accessToken')
      return t && String(t).trim() ? String(t) : null
    } catch (e) {
      return null
    }
  })());
  const authReady = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!user.value && !!accessToken.value);
  const accessTokenExpiresAt = computed(() => decodeJwtExpMs(accessToken.value))
  const idleMs = computed(() => {
    const at = Number(lastActivityAt.value || 0)
    if (!at) return Number.POSITIVE_INFINITY
    return Math.max(0, Date.now() - at)
  })
  const isInactive = computed(() => idleMs.value >= AUTH_INACTIVITY_TIMEOUT_MS)

  function setAccessToken(token: string | null) {
    accessToken.value = token;
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      try { sessionStorage.setItem('auth.accessToken', token) } catch (e) { /* ignore */ }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (api.defaults.headers.common as any).Authorization;
      try { sessionStorage.removeItem('auth.accessToken') } catch (e) { /* ignore */ }
    }
  }

  function clearSession() {
    user.value = null;
    setAccessToken(null);
    lastActivityAt.value = 0
    sessionWarningOpen.value = false
    sessionWarningDeadlineAt.value = 0
    clearStoredActivityAt()
  }

  function markActivity(timestamp = Date.now()) {
    const ts = Number(timestamp)
    if (!Number.isFinite(ts) || ts <= 0) return
    lastActivityAt.value = ts
    storeActivityAt(ts)
  }

  function isInactiveExceeded(now = Date.now()) {
    const at = Number(lastActivityAt.value || 0)
    if (!at) return true
    return now - at >= AUTH_INACTIVITY_TIMEOUT_MS
  }

  function willAccessTokenExpireSoon(withinMs = 60_000, now = Date.now()) {
    const exp = Number(accessTokenExpiresAt.value || 0)
    if (!exp) return true
    return exp - now <= Math.max(0, Number(withinMs) || 0)
  }

  function showSessionWarning(deadlineAt = Date.now() + 60_000) {
    sessionWarningDeadlineAt.value = Number(deadlineAt) || 0
    sessionWarningOpen.value = true
  }

  function hideSessionWarning() {
    sessionWarningOpen.value = false
    sessionWarningDeadlineAt.value = 0
  }

  async function expireSession(reason: 'expired' | 'inactive' = 'expired', opts?: { announce?: boolean }) {
    if (opts?.announce !== false) markExpiredReason(reason)
    try {
      await api.post('/api/users/logout')
    } catch (e) {
      // ignore
    }
    clearSession()
    try { localStorage.removeItem('selectedProjectId'); } catch (e) { /* ignore */ }
  }

  async function login(email: string, password: string) {
    error.value = null;
    try {
      const res = await api.post('/api/users/login', { email, password });
      const data = res.data || {};
      if (!data.user || !data.accessToken) throw new Error('Invalid login response');

      setAccessToken(String(data.accessToken));
      user.value = data.user as User;
      markActivity();
      hideSessionWarning()
      syncDefaultProject(user.value);
      return true;
    } catch (e: any) {
      error.value = e?.response?.data?.error || e?.response?.data?.message || 'Login failed';
      clearSession();
      return false;
    }
  }

  async function refresh() {
    error.value = null;
    try {
      const res = await api.post('/api/users/refresh');
      const data = res.data || {};
      if (!data.accessToken) return false;
      setAccessToken(String(data.accessToken));
      hideSessionWarning()
      return true;
    } catch (e) {
      return false;
    }
  }

  async function fetchMe() {
    error.value = null;
    try {
      const res = await api.get('/api/users/me');
      const data = res.data || {};
      if (!data.user) return false;
      user.value = data.user as User;
      hideSessionWarning()
      syncDefaultProject(user.value);
      return true;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Failed to load user';
      return false;
    }
  }

  async function logout() {
    await expireSession('expired', { announce: false })
  }

  async function staySignedIn() {
    hideSessionWarning()
    markActivity()
    const ok = await refresh()
    if (!ok) return false
    if (!user.value) await fetchMe()
    return true
  }

  async function bootstrap() {
    authReady.value = false;
    error.value = null;
    try {
      if (lastActivityAt.value && isInactiveExceeded()) {
        markExpiredReason('inactive')
        clearSession()
        return
      }
      // If we have a (tab-scoped) stored access token, try it first.
      // This prevents logging out on browser refresh when refresh cookies are blocked.
      if (accessToken.value) {
        try {
          // Ensure axios has the header after reload.
          api.defaults.headers.common.Authorization = `Bearer ${accessToken.value}`
        } catch (e) {
          // ignore
        }
        const meOk = await fetchMe()
        if (meOk) return
      }

      const ok = await refresh();
      if (ok) await fetchMe();
    } catch (e) {
      // ignore
    } finally {
      // If we couldn't establish a valid access token + user, ensure clean state.
      if (!user.value) setAccessToken(null);
      authReady.value = true;
    }
  }

  function waitForAuthReady(timeout = 3000) {
    return new Promise((resolve) => {
      if (authReady.value) return resolve(true);
      const unwatch = watch(authReady, (v: boolean) => {
        if (v) {
          unwatch();
          resolve(true);
        }
      });
      if (timeout && timeout > 0) {
        setTimeout(() => {
          try { unwatch(); } catch (e) { /* ignore */ }
          resolve(false);
        }, timeout);
      }
    });
  }

  async function register(payload: {
    firstName: string;
    lastName: string;
    company: string;
    email: string;
    password: string;
    role?: string;
    projects?: string[];
  }) {
    error.value = null;
    try {
      const r = await api.post('/api/users/register', payload);
      return { success: true, data: r.data };
    } catch (e: any) {
      error.value = e?.response?.data?.message || e?.response?.data?.error || 'Signup failed.';
      return { success: false, error: error.value };
    }
  }

  async function updateUser(updated: Partial<User>) {
    if (!user.value) return false;
    try {
      const uid = user.value._id || user.value.id;
      const res = await api.put(`/api/users/update/${uid}`, updated, { headers: { 'Content-Type': 'application/json' } });
      const data = res.data;
      const returned = data && data.user ? data.user : data;
      user.value = { ...user.value, ...returned } as User;
      syncDefaultProject(user.value);
      return true;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Network error';
      return false;
    }
  }

  async function updateAvatar(avatarUrl: string, userId?: string) {
    if (!user.value && !userId) return false;
    try {
      const uid = userId || user.value!._id || user.value!.id;
      const res = await api.put(`/api/users/update/${uid}`, { avatar: avatarUrl }, { headers: { 'Content-Type': 'application/json' } });
      const data = res.data;
      const returned = data && data.user ? data.user : data;
      if (user.value) user.value.avatar = returned.avatar || (returned.contact?.avatar) || avatarUrl;
      return true;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Network error';
      return false;
    }
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    if (!user.value) return { success: false, error: 'Not authenticated' };
    try {
      await api.post('/api/users/change-password', { email: user.value.email, currentPassword, newPassword }, { headers: { 'Content-Type': 'application/json' } });
      return { success: true };
    } catch (e: any) {
      error.value = e?.response?.data?.error || e?.response?.data?.message || 'Failed to change password';
      return { success: false, error: error.value };
    }
  }

  return {
    user,
    accessToken,
    isAuthenticated,
    accessTokenExpiresAt,
    error,
    authReady,
    waitForAuthReady,
    lastActivityAt,
    sessionWarningOpen,
    sessionWarningDeadlineAt,
    idleMs,
    isInactive,
    markActivity,
    isInactiveExceeded,
    willAccessTokenExpireSoon,
    showSessionWarning,
    hideSessionWarning,
    expireSession,
    bootstrap,
    setAccessToken,
    clearSession,
    login,
    refresh,
    fetchMe,
    logout,
    staySignedIn,
    register,
    updateUser,
    updateAvatar,
    changePassword,
  };
});
