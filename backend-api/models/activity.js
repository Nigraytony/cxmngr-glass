const mongoose = require('mongoose');

const activityTypes = [
  'Assessment',
  'BOD Review',
  'Construction Checklist',
  'Construction Milestone Meeting',
  'Cx Meeting',
  'Cx Plan',
  'Design Coordination Meeting',
  'Design Review',
  'Functional Test',
  'Installation Review',
  'OPR Review',
  'Owners Manual Review',
  'Schedule Integration',
  'Seasonal Test',
  'Site Visit Review',
  'Startup Review',
  'Submittal Review',
  'Training Review',
  'Test and Balance Review',
  'Warranty Review',
  'Other',
];
const activityStatuses = ['draft', 'published', 'completed'];

const activitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  // rich-text HTML description stored as string
  descriptionHtml: { type: String, default: '' },
  // activity type choices
  //
  // Type strings here mirror LEED Cx + ASHRAE G0 deliverables so the Final
  // Report's `activities-by-phase` data source can group Activities into
  // Predesign / Design / Construction / Occupancy buckets. New types added
  // for Phase 1 of the Final Report work: Construction Milestone Meeting
  // (LEED v5 FCx 50%/100% meeting attendance), Design Coordination Meeting
  // (LEED v5 ECx 2-meeting minimum), Warranty Review (LEED v4 ECx 10-month
  // post-occupancy review — explicit type rather than overloading Site Visit).
  type: { type: String, enum: activityTypes, default: 'Site Visit Review' },
  status: {
    type: String,
    enum: activityStatuses,
    default: 'draft',
  },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, default: Date.now },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  // Creator of the activity (used for Draft visibility)
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  issues: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Issue' }],
  // Linked OPR items for coverage/verification
  oprItemIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OprItem' }],
  // comments include user identity and optional avatar for display
  comments: [{ userId: mongoose.Schema.Types.ObjectId, name: String, avatar: String, text: String, createdAt: { type: Date, default: Date.now } }],
  // photos stored in DB as base64 strings (note: keep sizes small)
  photos: [{ filename: String, data: String, contentType: String, size: Number, uploadedBy: mongoose.Schema.Types.ObjectId, uploadedByName: String, uploadedByAvatar: String, caption: { type: String, default: '' }, createdAt: { type: Date, default: Date.now } }],
  // other attachments (documents) can be stored as external URLs or metadata
  // Use Mixed to be backward compatible with any legacy string-based attachments
  attachments: { type: [mongoose.Schema.Types.Mixed], default: [] },
  // reviewer info and location
  reviewer: { _id: mongoose.Schema.Types.ObjectId, firstName: String, lastName: String, email: String },
  location: { type: String },
  // linked space (optional) - stores the selected Space id when chosen via the UI
  spaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Space' },
  // list of systems/equipment inspected
  systems: [{ type: String }],
  // -------------------------------------------------------------------------
  // Cx-process tagging — used by the Final Report data sources.
  //
  // `phase` lets the report group Activities into the four ASHRAE G0 phases
  // (predesign / design / construction / occupancy) for the "Cx Activities
  // by Phase" section. When null, the renderer derives a default from
  // `type` (e.g. Design Review → design, Functional Test → construction).
  //
  // The remaining fields cover specific LEED v4/v5 audit deliverables:
  //   - milestone:        which design or construction milestone this is
  //                       (e.g. "50% CD", "100% CD", "100% Backcheck")
  //   - samplePercentage: for sample reviews (LEED v5 FCx asks for 10% of
  //                       contractor docs)
  //   - backcheckComplete: design-review backcheck closeout
  //   - attendees:        meeting attendees (training sign-in sheets,
  //                       Cx meeting rosters); the Training Verification
  //                       section reads from this
  // -------------------------------------------------------------------------
  phase: {
    type: String,
    enum: ['predesign', 'design', 'construction', 'occupancy', null],
    default: null,
  },
  milestone: { type: String, default: '' },
  samplePercentage: { type: Number, default: null },
  backcheckComplete: { type: Boolean, default: false },
  attendees: {
    type: [
      {
        name: { type: String, default: '' },
        company: { type: String, default: '' },
        email: { type: String, default: '' },
        role: { type: String, default: '' },
        signedIn: { type: Boolean, default: true },
      },
    ],
    default: [],
  },
  // Flexible settings bucket (e.g., report settings) persisted per activity
  settings: { type: mongoose.Schema.Types.Mixed, default: {} },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  labels: [{ type: String }],
  // Activity-level audit logs (flexible schema)
  logs: [{ type: mongoose.Schema.Types.Mixed, default: [] }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// keep updatedAt current and normalize reviewer email for consistent lookups
activitySchema.pre('save', function (next) {
  try {
    if (this.reviewer && this.reviewer.email) {
      this.reviewer.email = String(this.reviewer.email).trim().toLowerCase()
    }
    this.updatedAt = new Date()
  } catch (e) {
    // best-effort - don't block save due to normalization errors
  }
  next()
})

// Useful indexes to speed up common queries
activitySchema.index({ projectId: 1 })
activitySchema.index({ projectId: 1, status: 1 })
activitySchema.index({ projectId: 1, createdBy: 1 })
activitySchema.index({ startDate: 1 })
activitySchema.index({ 'comments.userId': 1 })
activitySchema.index({ spaceId: 1 })

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;
module.exports.activityTypes = activityTypes;
module.exports.activityStatuses = activityStatuses;
