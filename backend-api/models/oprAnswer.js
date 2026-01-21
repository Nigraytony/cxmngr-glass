const mongoose = require('mongoose')

const oprAnswerSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'OprQuestion', required: true, index: true },
    authorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Stable per-question sequence number used to generate tags (e.g., OPR-1-3).
    // NOTE: do not default to null; sparse+unique index must not see many null values.
    seq: { type: Number, required: false, index: true },
    text: { type: String, required: true },
    // Merge lifecycle: when an answer is merged away, it points to the canonical answer.
    mergedIntoAnswerId: { type: mongoose.Schema.Types.ObjectId, ref: 'OprAnswer', default: null, index: true },
    // Canonical answer stores which answers were merged into it.
    mergedFromAnswerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OprAnswer', default: [] }],
    // Stores the canonical answer's pre-merge text so unmerge can restore exact state.
    mergeOriginalText: { type: String, default: null },
    mergedAt: { type: Date, default: null },
    mergedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

oprAnswerSchema.index({ orgId: 1, projectId: 1, questionId: 1, authorUserId: 1 })
oprAnswerSchema.index({ orgId: 1, projectId: 1, questionId: 1, seq: 1 }, { unique: true, sparse: true })

oprAnswerSchema.pre('validate', function (next) {
  try {
    if (this.text) this.text = String(this.text).trim()
    if (this.orgId) this.orgId = String(this.orgId).trim()
  } catch (_) {
    // best-effort
  }
  next()
})

module.exports = mongoose.model('OprAnswer', oprAnswerSchema)
