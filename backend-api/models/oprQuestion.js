const mongoose = require('mongoose')

const oprQuestionSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'OprCategory', required: true, index: true },
    prompt: { type: String, required: true },
    // Default answer window for this question when opened (in minutes).
    answerWindowMinutes: { type: Number, default: 10 },
    status: { type: String, enum: ['draft', 'open', 'closed', 'voting', 'finalized'], default: 'draft', index: true },
    openedAt: { type: Date, default: null },
    closesAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    votingOpenedAt: { type: Date, default: null },
    votingClosesAt: { type: Date, default: null },
    votingClosedAt: { type: Date, default: null },
    finalizedAt: { type: Date, default: null },
    // Stable per-question counter to assign OprAnswer.seq.
    lastAnswerSeq: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  },
  { timestamps: true }
)

// Ensure at most one active question per project.
oprQuestionSchema.index(
  { projectId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['open', 'closed', 'voting'] },
    },
  }
)

oprQuestionSchema.pre('validate', function (next) {
  try {
    if (this.prompt) this.prompt = String(this.prompt).trim()
    if (this.orgId) this.orgId = String(this.orgId).trim()
  } catch (_) {
    // best-effort
  }
  next()
})

module.exports = mongoose.model('OprQuestion', oprQuestionSchema)
