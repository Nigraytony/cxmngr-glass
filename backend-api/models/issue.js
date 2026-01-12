const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
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
  severity: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  status: { type: String, enum: ['Open', 'In Progress', 'Closed'], default: 'Open' },
  // Closed metadata: who closed it and when (ISO date string, e.g., 2025-10-29)
  closedDate: { type: String, required: false },
  closedBy: { type: String, required: false },
  system: { type: String, required: false },
  location: { type: String, required: false },
  recommendation: { type: String, required: false },
  resolution: { type: String, required: false },
  // Free-form tags for filtering/grouping
  labels: { type: [String], default: [] },
  assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: false }, // Reference to an asset if applicable
  activityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: false }, // Reference to an activity if applicable
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
issueSchema.index({ projectId: 1, tag: 1 })

const Issue = mongoose.model('Issue', issueSchema);

module.exports = Issue;
