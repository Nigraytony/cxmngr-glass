const mongoose = require('mongoose');

const issueSeverities = ['Comment', 'Critical', 'Low', 'Medium', 'High'];
const issueStatuses = ['Cancelled', 'Closed', 'Open', 'Pending', 'In Progress'];

const issueSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  spaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: false },
  number: { type: Number, required: false },
  // Optional asset tag (e.g., equipment tag like "AHU-1") for sorting/searching in lists.
  tag: { type: String, required: false },
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, required: false },
  dateFound: { type: String, required: false },
  foundBy: { type: String, required: false },
  dueDate: { type: String, required: false },
  assignedTo: { type: String, required: false },
  severity: { type: String, enum: issueSeverities, default: 'Medium' },
  status: { type: String, enum: issueStatuses, default: 'Open' },
  // Closed metadata: who closed it and when (ISO date string, e.g., 2025-10-29)
  closedDate: { type: String, required: false },
  closedBy: { type: String, required: false },
  system: { type: String, required: false },
  location: { type: String, required: false },
  recommendation: { type: String, required: false },
  resolution: { type: String, required: false },
  // Where the issue came from: 'checklist' (raised from a checklist answer),
  // 'site walk', 'fpt', '' (unknown/manual). Checklist-origin issues require
  // a recommendation (enforced in the create route); the Activity report
  // prints this as the issue's source.
  origin: { type: String, default: '' },
  // Structured origin for checklist-raised issues (issues batch redesign).
  // Checklists live embedded on Equipment (equipment.checklists[] keyed by
  // number, questions[] keyed by number), so the link is numbers + the
  // equipment id, not a checklist id. Replaces the "Equipment: … Section: …
  // Question: …" text dumps that used to be pasted into title/description.
  source: {
    sourceType: { type: String, default: '' }, // 'checklist' (later: 'fpt', …)
    equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment' },
    equipmentTag: { type: String, default: '' },
    checklistNumber: { type: Number },          // printed as "Sec N"
    checklistTitle: { type: String, default: '' },  // e.g. 'Installation Verification'
    checklistType: { type: String, default: '' },   // e.g. 'Pre-functional Checklist'
    questionNumber: { type: Number },           // printed as "Qn"
    questionText: { type: String, default: '' },
    answer: { type: String, default: '' },      // the triggering answer, e.g. 'no'
  },
  // -------------------------------------------------------------------------
  // Issue report redesign Step 2 (issue-mockup.pdf). All optional.
  // -------------------------------------------------------------------------
  // Equipment this issue applies to (the report's facts grid + QA checks).
  equipmentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Equipment' }],
  // Life-safety banner: defaults ON for Critical issues at create, editable.
  lifeSafety: { type: Boolean, default: false },
  lifeSafetyNote: { type: String, default: '' },
  // Spec section / code reference printed under Required action.
  reference: { type: String, default: '' },
  // Contractor response (supersedes the free-text `resolution`; legacy
  // resolution text renders as the recorded response until edited).
  response: {
    correctiveAction: { type: String, default: '' },
    completedDate: { type: String, default: '' },
    respondedBy: { type: String, default: '' },
  },
  // CxA verification; a closing outcome is required to close the issue and
  // stamps closedDate/closedBy automatically (routes/issues.js).
  verification: {
    outcome: { type: String, enum: ['', 'verified_closed', 'not_resolved', 'accepted_as_is'], default: '' },
    verifiedBy: { type: String, default: '' },
    verifiedDate: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  // Caption/flags for Azure-stored issue photos, keyed by doc-file id
  // (mirrors Activity.photoMeta).
  photoMeta: { type: mongoose.Schema.Types.Mixed, default: {} },
  // Free-form tags for filtering/grouping
  labels: { type: [String], default: [] },
  // OPR Items linked for traceability (OPR Workshop add-on)
  oprItemIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OprItem' }],
  assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: false }, // Reference to an asset if applicable
  activityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: false }, // Reference to an activity if applicable
  systemId: { type: mongoose.Schema.Types.ObjectId, ref: 'System', required: false }, // Reference to a system if applicable
  // photos stored in DB as base64 strings (note: keep sizes small)
  photos: [{ filename: String, data: String, contentType: String, size: Number, uploadedBy: mongoose.Schema.Types.ObjectId, uploadedByName: String, uploadedByAvatar: String, caption: { type: String, default: '' }, createdAt: { type: Date, default: Date.now } }],
  // other attachments (documents) can be stored as external URLs or metadata
  // Use Mixed to be backward compatible with any legacy string-based attachments
  attachments: { type: [mongoose.Schema.Types.Mixed], default: [] },
  // comments include user identity and optional avatar for display
  comments: [{ userId: mongoose.Schema.Types.ObjectId, name: String, avatar: String, text: String, createdAt: { type: Date, default: Date.now } }],
  logs: { type: [mongoose.Schema.Types.Mixed], default: [] },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() },
});

// Keep updatedAt fresh and add useful index
issueSchema.pre('save', function (next) {
  try { this.updatedAt = new Date().toISOString() } catch (e) { /* ignore */ }
  next()
})

issueSchema.index({ projectId: 1 })
issueSchema.index({ projectId: 1, spaceId: 1 })
issueSchema.index({ projectId: 1, tag: 1 })
issueSchema.index({ projectId: 1, oprItemIds: 1 })

const Issue = mongoose.model('Issue', issueSchema);

module.exports = Issue;
module.exports.issueSeverities = issueSeverities;
module.exports.issueStatuses = issueStatuses;
