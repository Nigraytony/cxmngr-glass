// Convert a (possibly Vue-reactive) value into a plain, structured-cloneable
// object before it goes into IndexedDB.
//
// Vue 3 wraps component state (`reactive`/`ref`, e.g. an edit form and its
// nested arrays like comments/photos/labels) in Proxies. IndexedDB serializes
// with the structured-clone algorithm, which throws `DataCloneError: … could
// not be cloned` on those proxies. A JSON round-trip yields a plain object and
// strips proxies, functions, and `undefined` — matching what the API would
// receive over the wire anyway (dates are already ISO strings, photos base64).
export function toPlain<T = any>(value: T): T {
  if (value == null) return value
  try {
    return JSON.parse(JSON.stringify(value))
  } catch (_) {
    // Non-serializable edge cases fall through unchanged; the caller's put may
    // still throw, but we never make things worse than the original value.
    return value
  }
}

export default toPlain
