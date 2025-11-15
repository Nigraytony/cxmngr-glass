const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  // rich-text HTML description stored as string
  descriptionHtml: { type: String, default: '' },
  // activity type choices
  type: { type: String, 
    enum: [
      'Assessment',
      'BOD Review',
      'Construction Checklist',
      'Cx Meeting', 
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
      'Other'
    ], default: 'Site Visit Review' },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, default: Date.now },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  issues: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Issue' }],
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
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  labels: [{ type: String }],
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
activitySchema.index({ startDate: 1 })
activitySchema.index({ 'comments.userId': 1 })
activitySchema.index({ spaceId: 1 })

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;