const mongoose = require('mongoose')

const projectAddOnPurchaseSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    addonKey: { type: String, required: true, index: true }, // e.g. 'oprWorkshop'
    stripeCheckoutSessionId: { type: String, required: false, index: true },
    stripePaymentIntentId: { type: String, required: false, index: true },
    amount: { type: Number, required: false },
    currency: { type: String, required: false },
    status: { type: String, enum: ['paid', 'pending', 'failed', 'refunded'], default: 'paid', index: true },
    purchasedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    purchasedAt: { type: Date, default: Date.now },
    raw: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
)

projectAddOnPurchaseSchema.index({ projectId: 1, addonKey: 1, stripePaymentIntentId: 1 }, { unique: true, sparse: true })
projectAddOnPurchaseSchema.index({ projectId: 1, addonKey: 1, stripeCheckoutSessionId: 1 }, { unique: true, sparse: true })

projectAddOnPurchaseSchema.pre('validate', function (next) {
  try {
    if (this.addonKey) this.addonKey = String(this.addonKey).trim()
    if (this.currency) this.currency = String(this.currency).trim().toLowerCase()
  } catch (_) {
    // best-effort
  }
  next()
})

module.exports = mongoose.model('ProjectAddOnPurchase', projectAddOnPurchaseSchema)

