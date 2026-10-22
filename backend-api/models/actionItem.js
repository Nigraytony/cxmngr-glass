const mongoose = require('mongoose');

// An "ActionItem" is work OWED coming out of an Activity — "who owes what,
// by when" (A-1, A-2 … in the activity report) — as opposed to an Action,
// which records work PERFORMED. Its own collection (Stage 2 of the Activity
// report redesign, docs/activity_report_redesign.md) so a future project-wide
// "open action items" view can query across activities.

const actionItemStatuses = ['Open', 'In Progress', 'Complete', 'Cancelled'];

const actionItemSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  activityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true },
  // Per-activity sequence; rendered as "A-<sequence>". Assigned on create.
  sequence: { type: Number, required: true },
  description: { type: String, required: true },
  // Company or person responsible (free text, e.g. "BoldAir / Trane").
  owner: { type: String, default: '' },
  // Due date or condition, free text ("Before startup", "2026-07-13").
  due: { type: String, default: '' },
  status: { type: String, enum: actionItemStatuses, default: 'Open' },
  // Linked issues; the report's Ref column renders their numbers.
  issueIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Issue' }],
  // Free-text reference when no issue applies (e.g. "Obs.").
  refNote: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

actionItemSchema.pre('save', function (next) {
  try { this.updatedAt = new Date() } catch (e) { /* best-effort */ }
  next()
})

actionItemSchema.index({ projectId: 1, status: 1 })
actionItemSchema.index({ activityId: 1, sequence: 1 })

const ActionItem = mongoose.model('ActionItem', actionItemSchema);

module.exports = ActionItem;
module.exports.actionItemStatuses = actionItemStatuses;
