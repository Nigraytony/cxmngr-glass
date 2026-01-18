const mongoose = require('mongoose')

const rankingSchema = new mongoose.Schema(
  {
    answerId: { type: mongoose.Schema.Types.ObjectId, ref: 'OprAnswer', required: true },
    rank: { type: Number, required: true, min: 1, max: 5 },
  },
  { _id: false }
)

const oprVoteSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'OprQuestion', required: true, index: true },
    voterUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rankings: { type: [rankingSchema], default: [] },
  },
  { timestamps: true }
)

oprVoteSchema.index({ orgId: 1, projectId: 1, questionId: 1, voterUserId: 1 }, { unique: true })

oprVoteSchema.pre('validate', function (next) {
  try {
    if (this.orgId) this.orgId = String(this.orgId).trim()
  } catch (_) {
    // best-effort
  }
  next()
})

module.exports = mongoose.model('OprVote', oprVoteSchema)

