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
    // Compact ledger of tools that actually ran during an assistant turn. Only
    // the fields needed to ground future replays (which records were really
    // created/updated/deleted) — NOT the full records, to keep history small.
    // Replayed back into context so the model can't imitate a past "✅ created"
    // prose turn that had no backing tool calls. See routes/agent.js.
    toolResults: {
      type: [{
        _id: false,
        tool: { type: String, default: '' },
        name: { type: String, default: '' },
        success: { type: Boolean, default: false },
      }],
      default: undefined,
    },
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

