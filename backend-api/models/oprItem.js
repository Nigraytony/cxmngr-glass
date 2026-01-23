const mongoose = require('mongoose')

const oprItemSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'OprCategory', required: true, index: true },
    // For items produced from the workshop, these are populated.
    // For items imported/added manually, these may be null.
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'OprQuestion', required: false, index: true, default: null },
    sourceAnswerId: { type: mongoose.Schema.Types.ObjectId, ref: 'OprAnswer', required: false, index: true, default: null },
    text: { type: String, required: true },
    score: { type: Number, required: true, default: 0 },
    rank: { type: Number, required: true },
    status: { type: String, enum: ['active', 'archived'], default: 'active', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  },
  { timestamps: true }
)

// Enforce unique active ranks per category. Archived items may repeat ranks.
oprItemSchema.index(
  { orgId: 1, projectId: 1, categoryId: 1, rank: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
)

oprItemSchema.pre('validate', function (next) {
  try {
    if (this.text) this.text = String(this.text).trim()
    if (this.orgId) this.orgId = String(this.orgId).trim()
  } catch (_) {
    // best-effort
  }
  next()
})

module.exports = mongoose.model('OprItem', oprItemSchema)
