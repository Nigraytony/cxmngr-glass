const mongoose = require('mongoose');

// Mirror the Equipment schema to make Templates behave identically on the backend
const templateSchema = new mongoose.Schema({
  number: { type: String, required: false },
  tag: { type: String, required: true },
  title: { type: String, required: true },
  type: { type: String, required: true },
  system: { type: String, required: false },
  responsible: { type: String, required: false },
  // Keep relation field name for future linking if needed
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', required: false },
  status: {
    type: String,
    enum: ['Ordered', 'Shipped', 'In Storage', 'Installed', 'Tested', 'Operational', 'Not Started'],
    default: 'Not Started'
  },
  // Attributes as key/value pairs (same as Equipment)
  attributes: {
    type: [{ key: { type: String, required: true }, value: { type: String, default: '' } }],
    default: [],
  },
  description: { type: String, required: false },
  spaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: false },
  orderDate: { type: Date, required: false },
  installationDate: { type: Date, required: false },
  balanceDate: { type: Date, required: false },
  testDate: { type: Date, required: false },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  issues: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Issue' }],
  // Structured JSON arrays same as Equipment
  checklists: { type: [mongoose.Schema.Types.Mixed], default: [] },
  functionalTests: { type: [mongoose.Schema.Types.Mixed], default: [] },
  components: { type: [mongoose.Schema.Types.Mixed], default: [] },
  photos: [{ filename: String, data: String, contentType: String, size: Number, uploadedBy: mongoose.Schema.Types.ObjectId, uploadedByName: String, uploadedByAvatar: String, caption: { type: String, default: '' }, createdAt: { type: Date, default: Date.now } }],
  images: { type: String, required: false },
  attachments: { type: [mongoose.Schema.Types.Mixed], default: [] },
  history: { type: String, required: false },
  labels: { type: String, required: false },
  metadata: { type: String, required: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Keep updatedAt fresh and normalize title/tag
templateSchema.pre('save', function (next) {
  try {
    if (this.title && typeof this.title === 'string') this.title = String(this.title).trim()
    if (this.tag && typeof this.tag === 'string') this.tag = String(this.tag).trim()
    this.updatedAt = new Date()
  } catch (e) { /* ignore */ }
  next()
})

templateSchema.index({ projectId: 1 })

const Template = mongoose.model('Template', templateSchema);

module.exports = Template;