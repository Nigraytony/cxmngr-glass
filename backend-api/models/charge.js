const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ChargeSchema = new Schema({
  chargeId: { type: String, required: true, unique: true, index: true },
  invoiceId: { type: String, index: true },
  projectId: { type: String, index: true },
  customerId: { type: String, index: true },
  amount: { type: Number },
  currency: { type: String },
  status: { type: String },
  payment_method_details: { type: Schema.Types.Mixed },
  createdAt: { type: Date },
  metadata: { type: Schema.Types.Mixed },
  raw: { type: Schema.Types.Mixed },
}, { timestamps: true });

module.exports = mongoose.model('Charge', ChargeSchema);
