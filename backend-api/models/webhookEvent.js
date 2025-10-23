const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const WebhookEventSchema = new Schema({
  eventId: { type: String, required: true, unique: true, index: true },
  type: { type: String },
  receivedAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
  status: { type: String, enum: ['processing', 'processed', 'failed'], default: 'processing' },
  errorMessage: { type: String },
  meta: { type: Schema.Types.Mixed },
}, { timestamps: false });

// Add a TTL index so webhook records are cleaned up after a retention period.
// Retention in seconds can be configured via WEBHOOK_RETENTION_DAYS env var (default 30 days).
const retentionDays = parseInt(process.env.WEBHOOK_RETENTION_DAYS || '30', 10);
WebhookEventSchema.index({ receivedAt: 1 }, { expireAfterSeconds: retentionDays * 24 * 60 * 60 });

module.exports = mongoose.model('WebhookEvent', WebhookEventSchema);
