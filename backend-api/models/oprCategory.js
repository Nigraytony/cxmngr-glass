const mongoose = require('mongoose')

const oprCategorySchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    name: { type: String, required: true },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  },
  { timestamps: true }
)

oprCategorySchema.index({ orgId: 1, projectId: 1, name: 1 }, { unique: true })

oprCategorySchema.pre('validate', function (next) {
  try {
    if (this.name) this.name = String(this.name).trim()
    if (this.orgId) this.orgId = String(this.orgId).trim()
  } catch (_) {
    // best-effort
  }
  next()
})

module.exports = mongoose.model('OprCategory', oprCategorySchema)

