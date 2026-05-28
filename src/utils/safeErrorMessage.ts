// Extract a user-safe error message from a caught error or axios rejection.
//
// The audit found ~132 call sites doing:
//   ui.showError(e?.response?.data?.error || e?.message || 'Failed to X')
//
// When `e.response` is missing (network blip, JS exception in the handler,
// router crash), `e.message` becomes the toast — that's how "require is not
// defined", "Cannot read properties of undefined", and other developer
// jargon end up in front of customers. This helper centralizes the
// extraction so the fallback is always shown when the underlying message
// would be unhelpful or scary.
//
// Usage:
//   ui.showError(err, "Couldn't save your changes")
//   ui.showError(safeErrorMessage(err, "Couldn't save your changes"))
//
// The fallback string should describe the user's failed intent in plain
// English. The console still receives the raw error so devs can debug.

export const NETWORK_FALLBACK = "Couldn't reach the server. Check your connection and try again."

// Patterns that strongly suggest developer jargon, JS runtime errors, or
// stack traces — anything we don't want a customer to see in a toast.
const DEV_JARGON = [
  /^TypeError\b/i,
  /^ReferenceError\b/i,
  /^SyntaxError\b/i,
  /^RangeError\b/i,
  /Cannot read propert/i,
  /Cannot set propert/i,
  /\bis not defined\b/i,
  /\bis not a function\b/i,
  /\bundefined is\b/i,
  /\bnull is\b/i,
  /Unexpected token/i,
  /Maximum call stack/i,
  /^Request failed with status/i, // axios default message — useless to users
  /at (?:async )?[A-Za-z_$][\w$]*\s*\(/, // stack-trace frame
]

// Patterns that indicate a network/transport problem rather than an
// application error. These get replaced by NETWORK_FALLBACK so the user
// sees something actionable instead of "Network Error".
const NETWORK_ERROR = [
  /^Network Error$/i,
  /^fetch failed$/i,
  /\bECONNREFUSED\b/,
  /\bECONNRESET\b/,
  /\bENOTFOUND\b/,
  /\bETIMEDOUT\b/,
  /\bERR_NETWORK\b/i,
  /\bERR_INTERNET_DISCONNECTED\b/i,
]

function looksLikeDevJargon(msg: string): boolean {
  if (msg.length > 200) return true // probably a stack trace dump
  return DEV_JARGON.some((rx) => rx.test(msg))
}

function looksLikeNetworkError(msg: string): boolean {
  return NETWORK_ERROR.some((rx) => rx.test(msg))
}

function pickFirstString(...candidates: unknown[]): string | null {
  for (const c of candidates) {
    if (typeof c === 'string') {
      const s = c.trim()
      if (s) return s
    }
  }
  return null
}

/**
 * Pull a user-safe message out of `err`, falling back to `fallback` if
 * nothing usable is present. Always returns a non-empty string.
 *
 * Precedence:
 *   1. err.response.data.error (our API's canonical shape)
 *   2. err.response.data.message
 *   3. err.message — only if it doesn't look like dev jargon
 *   4. A network-specific fallback if err.message smelled like a network err
 *   5. The provided fallback
 */
export function safeErrorMessage(err: unknown, fallback: string): string {
  const safeFallback = (fallback && fallback.trim()) || 'Something went wrong. Please try again.'

  if (err == null) return safeFallback

  const anyErr = err as any
  const apiError = pickFirstString(
    anyErr?.response?.data?.error,
    anyErr?.response?.data?.message,
  )
  if (apiError && !looksLikeDevJargon(apiError)) {
    return apiError
  }

  const rawMessage = pickFirstString(anyErr?.message)
  if (rawMessage) {
    if (looksLikeNetworkError(rawMessage)) return NETWORK_FALLBACK
    if (!looksLikeDevJargon(rawMessage)) return rawMessage
  }

  return safeFallback
}
