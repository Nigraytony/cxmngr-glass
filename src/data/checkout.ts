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

  const [activities, issuesRaw, equipment] = await Promise.all([
    repos.activities.list({ projectId }),
    repos.issues.list({ projectId }),
    repos.equipment.listByProject(projectId),
  ])
  // Issues list may be an array or a paginated { items } shape.
  const issues = Array.isArray(issuesRaw)
    ? issuesRaw
    : (Array.isArray(issuesRaw?.items) ? issuesRaw.items : [])

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
    if (activities?.length) await db.activities.bulkPut(activities)
    if (issues?.length) await db.issues.bulkPut(issues)
    if (equipment?.length) await db.equipment.bulkPut(equipment)
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
