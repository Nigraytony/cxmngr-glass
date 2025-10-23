const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  avatar: { type: String },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['globaladmin','superadmin', 'admin', 'user'], default: 'user' },
  projects: [{
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    client: String,
    role: String,
    location: String,
    project_type: String,
    status: String,
    description: String,
    default: { type: Boolean, default: false }, // Indicates if this is the default project for the user
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

// Compare password method
userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

// Populate projects with specific fields
userSchema.methods.populateProjects = function () {
  return this.populate({
    path: 'projects',
    select: 'title, client, projectType, status, description' // Specify the fields to return
  }).execPopulate();
};

const User = mongoose.model('User', userSchema);

module.exports = User;