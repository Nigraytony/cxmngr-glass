const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InvoiceSchema = new Schema({
  invoiceId: { type: String, required: true, unique: true, index: true },
  projectId: { type: String, index: true },
  subscriptionId: { type: String, index: true },
  customerId: { type: String, index: true },
  amount_due: { type: Number },
  amount_paid: { type: Number },
  currency: { type: String },
  status: { type: String },
  hosted_invoice_url: { type: String },
  description: { type: String },
  period_start: { type: Date },
  period_end: { type: Date },
  createdAt: { type: Date },
  metadata: { type: Schema.Types.Mixed },
  raw: { type: Schema.Types.Mixed },
}, { timestamps: true });

module.exports = mongoose.model('Invoice', InvoiceSchema);
