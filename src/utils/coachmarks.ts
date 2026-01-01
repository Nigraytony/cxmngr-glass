type CoachmarkScope = {
  projectId?: string | null
  userId?: string | null
}

function safeKeyPart(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .slice(0, 120)
}

export function coachmarkStorageKey(baseKey: string, scope: CoachmarkScope = {}) {
  const parts = [
    'coachmark',
    safeKeyPart(baseKey),
    scope.projectId ? `p.${safeKeyPart(scope.projectId)}` : 'p.global',
    scope.userId ? `u.${safeKeyPart(scope.userId)}` : 'u.global',
  ]
  return parts.join('.')
}

export function hasSeenCoachmark(storageKey: string) {
  try {
    return localStorage.getItem(storageKey) === '1'
  } catch {
    return false
  }
}

export function markCoachmarkSeen(storageKey: string) {
  try {
    localStorage.setItem(storageKey, '1')
  } catch {
    // ignore
  }
}

