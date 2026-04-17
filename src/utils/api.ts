import axios from 'axios';

// Backend API base URL
// Preferred env: VITE_API_URL
// Back-compat: VITE_API_BASE (older)
export function getApiBase(): string {
  const raw =
    ((import.meta as any).env?.VITE_API_URL as string | undefined) ||
    ((import.meta as any).env?.VITE_API_BASE as string | undefined);
  const base = raw && typeof raw === 'string' && raw.trim() ? raw : 'http://localhost:3000';
  return base.replace(/\/$/, '');
}

export function apiUrl(path: string = ''): string {
  const base = getApiBase();
  const safe = typeof path === 'string' ? path : '';
  const p = safe.startsWith('/') ? safe : safe ? `/${safe}` : '';
  return `${base}${p}`;
}

function getCookie(name: string): string | null {
  try {
    if (typeof document === 'undefined') return null;
    const all = String(document.cookie || '');
    if (!all) return null;
    const parts = all.split(';');
    for (const part of parts) {
      const [k, ...rest] = part.trim().split('=');
      if (k === name) return decodeURIComponent(rest.join('=') || '');
    }
    return null;
  } catch (e) {
    return null;
  }
}

function randomHex(bytes = 32): string {
  try {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    // fallback (non-crypto environments)
    return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
  }
}

export const api = axios.create({
  baseURL: getApiBase(),
  withCredentials: true,
});

// Double-submit CSRF: attach X-CSRF-Token from cookie; if cookie missing, generate a seed token.
api.interceptors.request.use((config) => {
  const cookieVal = getCookie('csrf');
  const token = cookieVal && cookieVal.trim() ? cookieVal : randomHex(32);
  config.headers = { ...(config.headers || {}), 'X-CSRF-Token': token };
  return config;
});

// All 401 handling lives in http.ts, which is activity-aware: it only forces
// a logout when the user has been idle past the inactivity threshold.
// Previously a second interceptor here unconditionally called expireSession
// on any refresh failure, which forced /login on active users whenever a
// refresh-cookie race left the server-side refreshTokenIdHash stale.
