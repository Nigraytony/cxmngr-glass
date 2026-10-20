const mongoose = require('mongoose');

// A saved, project-shared report definition (docs/report_module_design.md,
// "Custom reports"). A definition is DATA, not code:
//   Stage 1 (list presets): { columns, filters, sort, sections, photoLimit, ... }
//   Stage 2 (composer):     { blocks: [...], branding, page options }
// The shape lives in `definition` (Mixed) so stages can evolve without
// migrations; `entity` scopes a definition to the module it reports on.
const reportDefinitionSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  // Module this definition reports on: 'issues', 'equipment', 'activities',
  // 'tasks', 'spaces', 'systems', 'oprItems', or 'composite' (Stage 2).
  entity: { type: String, required: true, trim: true, lowercase: true, maxlength: 40 },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 500, default: '' },
  definition: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  createdByName: { type: String, trim: true, maxlength: 160, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

reportDefinitionSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

reportDefinitionSchema.index({ projectId: 1, entity: 1, updatedAt: -1 });

module.exports = mongoose.model('ReportDefinition', reportDefinitionSchema);
