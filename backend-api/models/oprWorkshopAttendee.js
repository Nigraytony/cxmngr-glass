const mongoose = require('mongoose')

const oprWorkshopAttendeeSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending', index: true },
    checkedInAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now, index: true },

    approvedAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deniedAt: { type: Date, default: null },
    deniedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    snapshot: {
      name: { type: String, default: '' },
      email: { type: String, default: '' },
      company: { type: String, default: '' },
      role: { type: String, default: '' },
    },
  },
  { timestamps: true }
)

oprWorkshopAttendeeSchema.index({ orgId: 1, projectId: 1, userId: 1 }, { unique: true })

oprWorkshopAttendeeSchema.pre('validate', function (next) {
  try {
    if (this.orgId) this.orgId = String(this.orgId).trim()
    if (this.snapshot) {
      if (this.snapshot.name) this.snapshot.name = String(this.snapshot.name).trim()
      if (this.snapshot.email) this.snapshot.email = String(this.snapshot.email).trim().toLowerCase()
      if (this.snapshot.company) this.snapshot.company = String(this.snapshot.company).trim()
      if (this.snapshot.role) this.snapshot.role = String(this.snapshot.role).trim()
    }
  } catch (_) {
    // best-effort
  }
  next()
})

module.exports = mongoose.model('OprWorkshopAttendee', oprWorkshopAttendeeSchema)

