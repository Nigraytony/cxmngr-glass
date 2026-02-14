const mongoose = require('mongoose');

// Project-scoped "System" (mechanical/electrical/HVAC/etc.)
// One MongoDB document per System.
const systemSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },

  // Display fields
  tag: { type: String, required: false },
  name: { type: String, required: true },
  type: { type: String, required: false },
  description: { type: String, required: false },

  // Hierarchy
  parentSystem: { type: mongoose.Schema.Types.ObjectId, ref: 'System', required: false, default: null },

  // Relationships (optional; can be derived/managed by frontend stores)
  equipmentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Equipment' }],
  issueIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Issue' }],
  oprItemIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OprItem' }],

  // Embedded structured data (mirrors Equipment behavior)
  checklists: { type: [mongoose.Schema.Types.Mixed], default: [] },
  functionalTests: { type: [mongoose.Schema.Types.Mixed], default: [] },
  fptSignatures: { type: [mongoose.Schema.Types.Mixed], default: [] },

  tags: { type: [String], default: [] },
  // Free-form attributes (key/value pairs), similar to Space.attributes
  attributes: [
    {
      key: { type: String, required: false, trim: true },
      value: { type: String, required: false, trim: true },
    },
  ],
  metadata: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true });

systemSchema.index({ projectId: 1 })

module.exports = mongoose.model('System', systemSchema);
