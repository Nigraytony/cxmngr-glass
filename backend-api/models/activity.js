const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  // rich-text HTML description stored as string
  descriptionHtml: { type: String, default: '' },
  // activity type choices
  type: { type: String, enum: ['Design Review', 'Submittal Review', 'Site Visit Review', 'Cx Meeting', 'Startup Review', 'O&M Manual Review', 'Training Review', 'Schedule Integration', 'Test and Balance Review'], default: 'Site Visit Review' },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, default: Date.now },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  issues: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Issue' }],
  // comments include user identity and optional avatar for display
  comments: [{ userId: mongoose.Schema.Types.ObjectId, name: String, avatar: String, text: String, createdAt: { type: Date, default: Date.now } }],
  // photos stored in DB as base64 strings (note: keep sizes small)
  photos: [{ filename: String, data: String, contentType: String, size: Number, uploadedBy: mongoose.Schema.Types.ObjectId, uploadedByName: String, uploadedByAvatar: String, caption: { type: String, default: '' }, createdAt: { type: Date, default: Date.now } }],
  // other attachments (documents) can be stored as external URLs or metadata
  attachments: [{ filename: String, url: String, type: String, uploadedBy: mongoose.Schema.Types.ObjectId, createdAt: { type: Date, default: Date.now } }],
  // reviewer info and location
  reviewer: { _id: mongoose.Schema.Types.ObjectId, firstName: String, lastName: String, email: String },
  location: { type: String },
  // list of systems/equipment inspected
  systems: [{ type: String }],
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  labels: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;