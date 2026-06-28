// HTTP client for the offline checkout/grant endpoints (Phase 1, decision D1 —
// backend in backend-api/routes/projects.js + users.js). Kept separate from the
// per-entity repositories: these are session/lock operations, not entity CRUD.
import http from '../utils/http'

export interface CheckoutGrant {
  grant: string
  expiresAt: string
  deviceId: string
  projectId: string
}

// Acquire the advisory lock and an offline grant. Requires the network and a
// valid session. Throws on 409 (held by another user) etc.
export async function acquireCheckout(projectId: string, deviceId: string): Promise<CheckoutGrant> {
  const res = await http.post(`/api/projects/${projectId}/checkout`, { deviceId })
  return res.data
}

// Release the advisory lock (and revoke the grant) on check-in.
export async function releaseCheckout(projectId: string): Promise<void> {
  await http.post(`/api/projects/${projectId}/checkin`, {})
}

// Exchange a still-valid offline grant for a fresh access token + user on
// reconnect. Used when the access token expired during a long offline session.
export async function redeemGrant(grant: string): Promise<{ accessToken: string; user: any }> {
  const res = await http.post('/api/users/offline-grant/redeem', { grant })
  return res.data
}
