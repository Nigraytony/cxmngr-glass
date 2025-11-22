const mongoose = require('mongoose');

const adminAuditSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, required: false },
  actorEmail: { type: String, required: false },
  targetUserId: { type: mongoose.Schema.Types.ObjectId, required: false },
  actionType: { type: String, required: true }, // e.g. 'user.create', 'user.update', 'user.soft-delete'
  details: { type: mongoose.Schema.Types.Mixed, required: false },
  ip: { type: String, required: false },
  userAgent: { type: String, required: false },
  createdAt: { type: Date, default: Date.now },
});

const AdminAudit = mongoose.model('AdminAudit', adminAuditSchema);

module.exports = AdminAudit;
