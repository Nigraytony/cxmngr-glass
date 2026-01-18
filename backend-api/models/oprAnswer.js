const mongoose = require('mongoose')

const oprAnswerSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'OprQuestion', required: true, index: true },
    authorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    text: { type: String, required: true },
  },
  { timestamps: true }
)

oprAnswerSchema.index({ orgId: 1, projectId: 1, questionId: 1, authorUserId: 1 })

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

