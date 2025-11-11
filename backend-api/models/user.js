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
});

// Hash the password before saving the user
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 8);
  }
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