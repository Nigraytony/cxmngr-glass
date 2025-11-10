const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
  permissions: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});

RoleSchema.statics.findByName = function findByName(name) {
  return this.findOne({ name }).lean();
};

module.exports = mongoose.model('Role', RoleSchema);
