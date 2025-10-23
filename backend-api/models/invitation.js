const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
  email: { type: String, required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  inviterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true },
  accepted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const Invitation = mongoose.model('Invitation', invitationSchema);

module.exports = Invitation;
