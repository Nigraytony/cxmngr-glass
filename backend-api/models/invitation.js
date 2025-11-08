const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  inviterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true, unique: true },
  accepted: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now },
});

// Compound index to quickly lookup pending invites for a user
invitationSchema.index({ email: 1, accepted: 1, createdAt: -1 });

const Invitation = mongoose.model('Invitation', invitationSchema);

module.exports = Invitation;
