// Checkout / check-in engine (offline Phase 1 — see docs/offline_phase1_design.md).
//
//  - checkoutProject(): pull a project's Assets/Activities/Issues (+ Actions)
//    into IndexedDB for offline use.
//  - checkInProject(): replay the outbox back through the repositories, applying
//    the Phase-1 conflict policy (last-write-wins with a surfaced report).
//  - discardCheckout(): drop all local data + queued edits.
//
// Repositories are injectable (`opts.repos`) so the engine is unit-testable
// without a network. Defaults to the real repositories.
import { db, type OutboxOp, type CheckoutMeta } from './db'
import { outbox } from './outbox'
import { setReplaying } from './offlineGate'
import activitiesRepository from './activitiesRepository'
import issuesRepository from './issuesRepository'
import equipmentRepository from './equipmentRepository'
import actionsRepository from './actionsRepository'

export interface CheckInRepos {
  activities: any
  issues: any
  equipment: any
  actions: any
}

const defaultRepos: CheckInRepos = {
  activities: activitiesRepository,
  issues: issuesRepository,
  equipment: equipmentRepository,
  actions: actionsRepository,
}

function repoFor(entity: string, repos: CheckInRepos): any {
  switch (entity) {
    case 'activity': return repos.activities
    case 'issue': return repos.issues
    case 'equipment': return repos.equipment
    case 'action': return repos.actions
    default: throw new Error(`Unknown entity type: ${entity}`)
  }
}

// Pull full detail records (equipment components, activity/issue photos,
// comments) so offline edit pages aren't missing the heavier fields the list
// endpoints omit. Bounded concurrency keeps checkout from opening hundreds of
// sockets at once; any record whose detail fetch fails keeps its lighter list
// payload. `fetchOne` is optional so injected test repos without a get() simply
// skip hydration.
async function hydrateFullRecords(
  list: any[],
  fetchOne: ((id: string) => Promise<any>) | undefined,
  limit = 6,
): Promise<any[]> {
  if (!Array.isArray(list) || !list.length || typeof fetchOne !== 'function') return list || []
  const out = new Array(list.length)
  let cursor = 0
  const worker = async () => {
    while (cursor < list.length) {
      const idx = cursor++
      const base = list[idx]
      const id = String(base?._id || base?.id || '')
      if (!id) { out[idx] = base; continue }
      try {
        const full = await fetchOne(id)
        out[idx] = full ? { ...base, ...full } : base
      } catch (e) {
        out[idx] = base
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, () => worker()))
  return out
}

// ---- Checkout (hydrate local store) -------------------------------------

export interface CheckoutSummary {
  projectId: string
  activities: number
  issues: number
  equipment: number
  actions: number
}

export interface CheckoutGrantMeta {
  deviceId?: string
  grant?: string
  grantExpiresAt?: number
}

export async function checkoutProject(
  projectId: string,
  opts: { repos?: CheckInRepos; grant?: CheckoutGrantMeta } = {},
): Promise<CheckoutSummary> {
  const repos = opts.repos || defaultRepos

  // A project's plan may disable a feature (e.g. activities on the basic tier),
  // whose list endpoint then returns 403 FEATURE_NOT_IN_PLAN. That's an expected
  // "no such data" signal, not a checkout failure — treat it as an empty set.
  // Any other error still aborts the checkout.
  const hydrate = async (fn: () => Promise<any>): Promise<any> => {
    try {
      return await fn()
    } catch (e: any) {
      if (e?.response?.status === 403 && e?.response?.data?.code === 'FEATURE_NOT_IN_PLAN') return []
      throw e
    }
  }

  const [activities, issuesRaw, equipment] = await Promise.all([
    hydrate(() => repos.activities.list({ projectId })),
    hydrate(() => repos.issues.list({ projectId })),
    hydrate(() => repos.equipment.listByProject(projectId)),
  ])
  // Issues list may be an array or a paginated { items } shape.
  const issues = Array.isArray(issuesRaw)
    ? issuesRaw
    : (Array.isArray(issuesRaw?.items) ? issuesRaw.items : [])

  // Upgrade the light list payloads to full detail records for offline use.
  const [fullActivities, fullIssues, fullEquipment] = await Promise.all([
    hydrateFullRecords(activities || [], repos.activities?.get ? (id: string) => repos.activities.get(id, { includePhotos: true }) : undefined),
    hydrateFullRecords(issues, repos.issues?.get ? (id: string) => repos.issues.get(id) : undefined),
    hydrateFullRecords(equipment || [], repos.equipment?.get ? (id: string) => repos.equipment.get(id, { includePhotos: true }) : undefined),
  ])

  // Actions are sub-records of each activity.
  const actionLists = await Promise.all(
    (activities || []).map((a: any) =>
      repos.actions.list(String(a._id || a.id), projectId).catch(() => [])),
  )
  const actions = actionLists.flat()

  await db.transaction('rw', db.activities, db.issues, db.equipment, db.actions, db.meta, async () => {
    // Replace any prior copy of this project's data.
    await db.activities.where('projectId').equals(projectId).delete()
    await db.issues.where('projectId').equals(projectId).delete()
    await db.equipment.where('projectId').equals(projectId).delete()
    await db.actions.where('projectId').equals(projectId).delete()
    if (fullActivities?.length) await db.activities.bulkPut(fullActivities)
    if (fullIssues?.length) await db.issues.bulkPut(fullIssues)
    if (fullEquipment?.length) await db.equipment.bulkPut(fullEquipment)
    if (actions?.length) await db.actions.bulkPut(actions)
    await db.meta.put({
      key: 'checkout',
      projectId,
      checkedOutAt: Date.now(),
      deviceId: opts.grant?.deviceId,
      grant: opts.grant?.grant,
      grantExpiresAt: opts.grant?.grantExpiresAt,
    })
  })

  return {
    projectId,
    activities: activities?.length || 0,
    issues: issues?.length || 0,
    equipment: equipment?.length || 0,
    actions: actions?.length || 0,
  }
}

// ---- Check-in (replay outbox) -------------------------------------------

export interface CheckInConflict {
  entity: string
  entityId: string
  overwritten: any // server state we wrote over (last-write-wins)
  resolved: boolean // false if the forced re-apply still conflicted
}

export interface CheckInFailure {
  entity: string
  op: string
  entityId: string
  error: string
}

export interface CheckInReport {
  applied: number
  conflicts: CheckInConflict[]
  failed: CheckInFailure[]
  remaining: number // ops still queued after this run
  aborted: boolean // true if we stopped early (connectivity lost mid-sync)
}

async function replayOp(op: OutboxOp, repos: CheckInRepos): Promise<{ conflict?: CheckInConflict }> {
  const repo = repoFor(op.entity, repos)

  if (op.op === 'create') {
    await repo.create(op.payload)
    return {}
  }
  if (op.op === 'delete') {
    await repo.remove(op.entityId, op.projectId)
    return {}
  }

  // update — may return an UpdateResult with a conflict (activities/issues/
  // equipment). actions.update returns raw data and never reports conflicts.
  const res: any = await repo.update(op.entityId, op.payload, { expectedVersion: op.expectedVersion })
  if (res && res.conflict) {
    // Phase-1 policy: last-write-wins with a surfaced report. Re-apply the
    // local change against the server's current version, recording what we
    // overwrote so the user gets a post-sync summary.
    const overwritten = res.current
    const retry: any = await repo.update(op.entityId, op.payload, { expectedVersion: res.currentVersion })
    return {
      conflict: {
        entity: op.entity,
        entityId: op.entityId,
        overwritten,
        resolved: !(retry && retry.conflict),
      },
    }
  }
  return {}
}

export async function checkInProject(opts: { repos?: CheckInRepos } = {}): Promise<CheckInReport> {
  const repos = opts.repos || defaultRepos
  const ops = await outbox.all()
  const report: CheckInReport = { applied: 0, conflicts: [], failed: [], remaining: 0, aborted: false }

  // Force every replayed op onto the network (never the local fallback) for the
  // duration of the loop. See offlineGate.useLocal / shouldFallBackToLocal.
  setReplaying(true)
  try {
    for (const op of ops) {
      try {
        const outcome = await replayOp(op, repos)
        if (outcome.conflict) report.conflicts.push(outcome.conflict)
        await outbox.remove(op.id!)
        report.applied++
      } catch (e: any) {
        if (!e?.response) {
          // No HTTP response => connectivity lost. Stop; queued ops remain for
          // the next attempt.
          report.aborted = true
          break
        }
        // Server rejected (4xx/5xx). Keep the op queued and record the failure.
        report.failed.push({
          entity: op.entity,
          op: op.op,
          entityId: op.entityId,
          error: e?.response?.data?.error || e?.message || 'Request failed',
        })
      }
    }
  } finally {
    setReplaying(false)
  }

  report.remaining = await outbox.count()
  return report
}

// ---- Misc ---------------------------------------------------------------

export async function getCheckoutMeta(): Promise<CheckoutMeta | undefined> {
  return db.meta.get('checkout')
}

// Drop all local data and queued edits (e.g. after a clean check-in, or to
// abandon offline changes).
export async function discardCheckout(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
}
