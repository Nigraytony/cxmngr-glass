const mongoose = require('mongoose')

function asString(v) {
  return typeof v === 'string' ? v : (v == null ? '' : String(v))
}

const assistantChatMessageSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, default: null, index: true },
    role: {
      type: String,
      required: true,
      enum: ['user', 'assistant', 'system'],
      set: (v) => asString(v).trim().toLowerCase(),
    },
    content: { type: String, required: true, trim: true },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 60 * 60 * 24 * 90, // 90 days retention (TTL implies index)
    },
  },
  { versionKey: false }
)

assistantChatMessageSchema.index({ projectId: 1, createdAt: -1 })

module.exports = mongoose.model('AssistantChatMessage', assistantChatMessageSchema)

