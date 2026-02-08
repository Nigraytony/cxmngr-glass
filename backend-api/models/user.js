const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  avatar: { type: String },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['globaladmin','superadmin', 'admin', 'user'], default: 'user' },
  // Minimal per-project membership entries to avoid duplicating project data.
  // Keep only an id, role and a default flag; hydrate on read when needed.
  projects: [{
    _id: mongoose.Schema.Types.ObjectId,
    role: { type: String, default: 'user' },
    default: { type: Boolean, default: false },
  }],
  contact: {
    company: { type: String, required: true },
    phone: { type: String, required: false }, // Optional phone number
    address: {
      street: { type: String, required: false },
      city: { type: String, required: false },
      state: { type: String, required: false },
      zip: { type: String, required: false },
      country: { type: String, required: false },
      taxId: { type: String, required: false }, // Optional tax ID
    },
    bio: { type: String, required: false }, // Optional biography or description
    avatar: { type: String, required: false }, // Optional avatar URL
    // Optional profile signature (stored as simple strings; block typically a dataURL PNG)
    signature: {
      title: { type: String, required: false },
      person: { type: String, required: false },
      block: { type: String, required: false },
    },
    // Optional per-page preference for list pages (stored as a number of items per page)
    perPage: { type: Number, required: false },
    // Optional UI preferences
    ui: {
      equipmentListChartsDefault: { type: Boolean, required: false },
      issuesListChartsDefault: { type: Boolean, required: false },
      tasksListChartsDefault: { type: Boolean, required: false },
    },
  },
  social_media: {
    linkedin: { type: String, required: false }, // Optional LinkedIn profile URL
    x: { type: String, required: false }, // Optional X handle
    facebook: { type: String, required: false }, // Optional Facebook profile URL
    instagram: { type: String, required: false }, // Optional Instagram profile URL
    youtube: { type: String, required: false }, // Optional YouTube channel URL
    github: { type: String, required: false }, // Optional GitHub profile URL
    telegram: { type: String, required: false }, // Optional Telegram handle
    website: { type: String, required: false }, // Optional personal or company website URL
  },
  // Stripe customer id for billing
  stripeCustomerId: { type: String, default: null },
  // Increment to invalidate all previously issued JWTs for the user (e.g., logout everywhere)
  tokenVersion: { type: Number, default: 0 },
  // Support soft-delete and a simple status enum for frontend display
  deleted: { type: Boolean, default: false },
  status: { type: String, enum: ['Active', 'Deleted', 'Inactive', 'Invited', 'Pending'], default: 'Active' },
  // Admin support access: requires end-user PIN grant to allow an admin to view/edit user profile in support mode.
  supportAccess: {
    requestedByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    requestedAt: { type: Date, default: null },
    pinHash: { type: String, default: null },
    pinExpiresAt: { type: Date, default: null },
    grantedAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    grantedUntil: { type: Date, default: null },
    grantedAt: { type: Date, default: null },
  },
});

// Hash the password before saving the user
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 8);
  }
  // Keep deleted + status in sync: if deleted flag set, ensure status is 'Deleted'
  try {
    if (this.deleted) {
      this.status = 'Deleted'
    } else if (this.status === 'Deleted') {
      this.deleted = true
    } else if (!this.status) {
      this.status = 'Active'
    }
  } catch (e) { /* ignore sync errors */ }
  next();
});

// Normalize email to lowercase and trim to ensure consistent uniqueness and lookups
userSchema.pre('save', function (next) {
  try {
    if (this.email && typeof this.email === 'string') {
      this.email = String(this.email).trim().toLowerCase();
    }
  } catch (e) {
    // best-effort normalization; don't block save on unexpected errors
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

// Note: Do not use populate() on projects – it's not a ref array. Hydration is done in routes.

const User = mongoose.model('User', userSchema);

module.exports = User;
