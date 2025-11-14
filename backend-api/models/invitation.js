const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  inviterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true, unique: true },
  // Optional: store chosen project role template id and a small snapshot of it
  roleTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project.roleTemplates', required: false },
  roleTemplateSnapshot: {
    name: { type: String },
    permissions: [{ type: String }],
  },
  accepted: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now },
});

// Compound index to quickly lookup pending invites for a user
invitationSchema.index({ email: 1, accepted: 1, createdAt: -1 });

// Normalize email to lowercase before saving to ensure consistent matching
invitationSchema.pre('save', function (next) {
  try {
    if (this.email && typeof this.email === 'string') {
      this.email = String(this.email).trim().toLowerCase();
    }
  } catch (e) {
    // ignore
  }
  next();
});

const Invitation = mongoose.model('Invitation', invitationSchema);

module.exports = Invitation;
