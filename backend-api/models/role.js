const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  // permission strings like 'issues.create', 'activities.update'
  permissions: { type: [String], default: [] },
  // scope: 'global' roles apply across the app; 'project' roles are tied to a projectId
  scope: { type: String, enum: ['global', 'project'], default: 'global' },
  projectId: { type: mongoose.Schema.Types.ObjectId, required: false },
  createdAt: { type: Date, default: Date.now }
});

// Unique index for (name, scope, projectId) to avoid duplicate role templates
RoleSchema.index({ name: 1, scope: 1, projectId: 1 }, { unique: true });

RoleSchema.statics.findByName = function findByName(name) {
  return this.findOne({ name }).lean();
};

module.exports = mongoose.model('Role', RoleSchema);
