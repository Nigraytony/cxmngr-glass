const mongoose = require('mongoose');

const passwordResetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

passwordResetSchema.index({ token: 1 });
passwordResetSchema.index({ userId: 1 });

module.exports = mongoose.model('PasswordReset', passwordResetSchema);
