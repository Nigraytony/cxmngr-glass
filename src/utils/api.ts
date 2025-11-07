// Centralized helper for backend API base URL
// Reads from Vite env (VITE_API_BASE) and falls back to localhost:4242

export function getApiBase(): string {
  try {
    const raw = (import.meta as any).env?.VITE_API_BASE as string | undefined
    const base = raw && typeof raw === 'string' ? raw : 'http://localhost:4242'
    return base.replace(/\/$/, '')
  } catch {
    return 'http://localhost:4242'
  }
}

export function apiUrl(path: string): string {
  const base = getApiBase()
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}
