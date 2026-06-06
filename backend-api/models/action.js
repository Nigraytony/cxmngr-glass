const mongoose = require('mongoose');

// An "Action" is a sub-record of work performed under an Activity — e.g. a single
// submittal reviewed, a meeting held, a checklist verified, a training/as-built
// review. Stored in its own collection (scoped by projectId + activityId) so each
// can carry its own photos/documents (Azure blob, keyed by entityType="Action")
// and linked issues without bloating the parent Activity document.

const actionTypes = [
  'Submittal',
  'Meeting',
  'Review',
  'Checklist Verification',
  'Training Review',
  'As-Built Review',
  'Other',
];
const actionStatuses = ['Not Started', 'In Progress', 'Complete'];

const actionSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  activityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true },
  title: { type: String, required: true },
  type: { type: String, enum: actionTypes, default: 'Other' },
  status: { type: String, enum: actionStatuses, default: 'Not Started' },
  // Date the action was performed/reviewed (stored as YYYY-MM-DD string for parity
  // with Issue.dateFound and to avoid timezone drift on date-only inputs).
  date: { type: String, default: '' },
  // Who performed/reviewed it (free-form name or team, mirrors Issue.foundBy).
  performedBy: { type: String, default: '' },
  location: { type: String, default: '' },
  // Optional links to a specific equipment and/or equipment template
  // (e.g. one submittal per template).
  equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', default: null },
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', default: null },
  notes: { type: String, default: '' },
  // Linked issues raised from / associated with this action.
  issues: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Issue' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

actionSchema.pre('save', function (next) {
  try { this.updatedAt = new Date() } catch (e) { /* best-effort */ }
  next()
})

actionSchema.index({ projectId: 1 })
actionSchema.index({ activityId: 1 })
actionSchema.index({ activityId: 1, createdAt: 1 })

const Action = mongoose.model('Action', actionSchema);

module.exports = Action;
module.exports.actionTypes = actionTypes;
module.exports.actionStatuses = actionStatuses;
