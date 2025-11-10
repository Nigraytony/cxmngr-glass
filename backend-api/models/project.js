const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true }, // was title
  number: { type: String },
  po_number: { type: String }, // was ponumber
  project_type: { type: String }, // was projectType
  industry: { type: String },
  client: { type: String, required: true },
  location: { type: String },
  building_type: { type: String },
  description: { type: String },
  status: { type: String },
  settings: [{ type: String }],
  photos: [{ type: String }],
  documents: [{ type: String }],
  team: [{
    _id: mongoose.Schema.Types.ObjectId,
    firstName: String,
    lastName: String,
    email: String,
    company: String,
    role: String,
  }],
  commissioning_agent: {
    firstName: String,
    lastName: String,
    email: String,
    company: String,
    role: String,
    // Optional logo for the commissioning agent (stored like user avatar: URL or data URI)
    logo: { type: String },
    // Optional phone number for the commissioning agent contact
    phone: { type: String },
  },
  logo: { type: String },
  meta: [{ type: String }],
  tags: [{ type: String }],
  startDate: { type: Date },
  endDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  activities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Activity' }],
  issues: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Issue' }],
  // Per-project atomic issue counter. Incremented when creating issues to assign sequential numbers.
  lastIssueNumber: { type: Number, default: 0 },
  equipment: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Equipment' }],
  templates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Template' }],
  tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  spaces: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Space' }],
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // Project-level audit logs (flexible schema)
  logs: [{ type: mongoose.Schema.Types.Mixed, default: [] }],
  // Active flag for project (soft delete / enable/disable)
  isActive: { type: Boolean, default: true },
  // Stripe billing fields (per-project subscription)
  stripeSubscriptionId: { type: String, default: null },
  stripePriceId: { type: String, default: null },
  stripeSubscriptionStatus: { type: String, default: null },
  stripeCurrentPeriodEnd: { type: Date, default: null },
  stripeCancelAtPeriodEnd: { type: Boolean, default: false },
  // Trial tracking: record when the project's trial started so we don't re-grant
  // the full trial window on subsequent subscription attempts.
  trialStartedAt: { type: Date, default: null, immutable: true },
  // New explicit trial flags to lock a single trial per project
  trialStarted: { type: Boolean, default: false },
  trialStart: { type: Date, default: null },
  trialEnd: { type: Date, default: null },
});

// Keep updatedAt current and normalize embedded emails on save
projectSchema.pre('save', function (next) {
  try {
    // normalize team emails
    if (Array.isArray(this.team)) {
      for (const m of this.team) {
        if (m && m.email) m.email = String(m.email).trim().toLowerCase()
      }
    }
    if (this.commissioning_agent && this.commissioning_agent.email) {
      this.commissioning_agent.email = String(this.commissioning_agent.email).trim().toLowerCase()
    }
    this.updatedAt = new Date()
  } catch (e) {
    // best-effort
  }
  next()
})

// Useful indexes
projectSchema.index({ name: 1 })
projectSchema.index({ client: 1 })

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;