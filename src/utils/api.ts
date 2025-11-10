// Centralized helper for backend API base URL
// Reads from Vite env (VITE_API_BASE) and falls back to localhost:4242

export function getApiBase(): string {
  try {
    const raw = (import.meta as any).env?.VITE_API_BASE as string | undefined
    const base = raw && typeof raw === 'string' ? raw : 'http://localhost:4242'
    const cleaned = base.replace(/\/$/, '')
    // Expose and log once for runtime verification in production deployments
    if (typeof window !== 'undefined') {
      (window as any).__API_BASE = cleaned
      if (!(window as any).__API_BASE_LOGGED) {
        (window as any).__API_BASE_LOGGED = true
        // Only log in production builds to help verify env injection
        // (Vite sets import.meta.env.MODE)
        if ((import.meta as any).env?.MODE === 'production') {
          console.info('[API] Using base:', cleaned)
        }
      }
    }
    return cleaned
  } catch (e) {
    return 'http://localhost:4242'
  }
}

export function apiUrl(path: string): string {
  const base = getApiBase()
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}
