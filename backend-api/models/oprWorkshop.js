const mongoose = require('mongoose')

const oprWorkshopSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },

    name: { type: String, default: '' },
    date: { type: String, default: '' }, // YYYY-MM-DD
    location: { type: String, default: '' },
    startTime: { type: String, default: '' }, // HH:mm
    endTime: { type: String, default: '' }, // HH:mm
    description: { type: String, default: '' },
    tags: { type: [String], default: [] },

    // Session control (admin-driven). Participants can only check in once started.
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  },
  { timestamps: true }
)

oprWorkshopSchema.index({ orgId: 1, projectId: 1 }, { unique: true })

oprWorkshopSchema.pre('validate', function (next) {
  try {
    if (this.orgId) this.orgId = String(this.orgId).trim()
    if (this.name) this.name = String(this.name).trim()
    if (this.location) this.location = String(this.location).trim()
    if (this.startTime) this.startTime = String(this.startTime).trim()
    if (this.endTime) this.endTime = String(this.endTime).trim()
    if (this.date) this.date = String(this.date).trim()
    if (this.description) this.description = String(this.description).trim()
    if (Array.isArray(this.tags)) {
      this.tags = this.tags
        .map((t) => String(t || '').trim())
        .filter(Boolean)
        .slice(0, 50)
    }
  } catch (_) {
    // best-effort
  }
  next()
})

module.exports = mongoose.model('OprWorkshop', oprWorkshopSchema)
