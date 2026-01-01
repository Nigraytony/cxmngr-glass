const mongoose = require('mongoose')

const assistantChecklistItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    category: { type: String, default: '' },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    guidance: { type: String, default: '' },
    platformGuidance: { type: String, default: '' },
    platformLinks: {
      type: [
        {
          title: { type: String, required: true },
          to: { type: String, required: true },
          note: { type: String, default: '' },
        },
      ],
      default: [],
    },
    sourceTitle: { type: String, default: '' },
    sourceUrl: { type: String, default: '' },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false }
)

const assistantChecklistSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true, unique: true },
    projectType: { type: String, default: '' },
    templateKey: { type: String, required: true },
    hiddenItemIds: { type: [String], default: [] },
    items: { type: [assistantChecklistItemSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'assistant_checklists' }
)

assistantChecklistSchema.pre('save', function (next) {
  this.updatedAt = new Date()
  next()
})

assistantChecklistSchema.pre('findOneAndUpdate', function (next) {
  try {
    const update = this.getUpdate() || {}
    if (!update.$set) update.$set = {}
    update.$set.updatedAt = new Date()
    this.setUpdate(update)
  } catch (e) {
    // ignore
  }
  next()
})

module.exports = mongoose.model('AssistantChecklist', assistantChecklistSchema)
