// IndexedDB schema for offline support (Phase 1 — see docs/offline_phase1_design.md).
// Built on Dexie. Holds a checked-out project's entities, captured photo blobs,
// the mutation outbox, and the checkout meta record.
//
// NOTE: this is the storage layer only. The live repositories
// (activitiesRepository, etc.) do NOT read/write here yet — wiring them to
// route through IndexedDB when a project is checked out + offline is the next
// step. Importing this module has no effect on the online app; IndexedDB is
// opened lazily on first access.
import Dexie, { type Table } from 'dexie'

export type EntityType = 'activity' | 'issue' | 'equipment' | 'action'
export type OpType = 'create' | 'update' | 'delete'

// One queued offline mutation. Replayed in insertion order on check-in.
export interface OutboxOp {
  id?: number // auto-increment primary key — also the replay order
  entity: EntityType
  op: OpType
  entityId: string // client-generated (create) or existing _id
  projectId: string
  payload?: any // create/update body
  expectedVersion?: number | null // __v captured at edit time (optimistic lock)
  createdAt: number // epoch ms
}

// Single-row record describing which project is currently checked out.
export interface CheckoutMeta {
  key: string // always 'checkout'
  projectId: string
  checkedOutAt: number
  // Offline grant captured from the backend at checkout (decision D1). Stored
  // so the device can redeem it for a fresh access token on reconnect.
  deviceId?: string
  grant?: string
  grantExpiresAt?: number
}

export class OfflineDb extends Dexie {
  projects!: Table<any, string>
  activities!: Table<any, string>
  issues!: Table<any, string>
  equipment!: Table<any, string>
  actions!: Table<any, string>
  photos!: Table<any, string>
  outbox!: Table<OutboxOp, number>
  meta!: Table<CheckoutMeta, string>

  constructor(name = 'cxmngr-offline') {
    super(name)
    // Index entity tables by _id (PK) + projectId for project-scoped wipes.
    this.version(1).stores({
      projects: '_id, updatedAt',
      activities: '_id, projectId, updatedAt',
      issues: '_id, projectId, updatedAt',
      equipment: '_id, projectId, updatedAt',
      actions: '_id, projectId, activityId, updatedAt',
      photos: 'localId, entity, entityId',
      outbox: '++id, entity, entityId, projectId, createdAt',
      meta: 'key',
    })
  }
}

// App-wide singleton. Tests construct isolated instances or reset this one.
export const db = new OfflineDb()
