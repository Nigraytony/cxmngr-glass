const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  number: { type: Number, required: false },
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, required: false },
  dateFound: { type: String, required: false },
  foundBy: { type: String, required: false },
  dueDate: { type: String, required: false },
  assignedTo: { type: String, required: false },
  severity: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  status: { type: String, enum: ['Open', 'In Progress', 'Closed'], default: 'Open' },
  system: { type: String, required: false },
  location: { type: String, required: false },
  recommendation: { type: String, required: false },
  resolution: { type: String, required: false },
  assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: false }, // Reference to an asset if applicable
  activityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: false }, // Reference to an activity if applicable
  photos: { type: [String], default: [] },
  documents: { type: [String], default: [] },
  comments: { type: [String], default: [] },
  logs: { type: [String], default: [] },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() },
});

const Issue = mongoose.model('Issue', issueSchema);

module.exports = Issue;