const mongoose = require('mongoose')

const oprParticipantSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'OprQuestion', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    joinedAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
)

oprParticipantSchema.index({ orgId: 1, projectId: 1, questionId: 1, userId: 1 }, { unique: true })

oprParticipantSchema.pre('validate', function (next) {
  try {
    if (this.orgId) this.orgId = String(this.orgId).trim()
  } catch (_) {
    // best-effort
  }
  next()
})

module.exports = mongoose.model('OprParticipant', oprParticipantSchema)

