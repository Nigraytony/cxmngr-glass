#!/usr/bin/env node
// reset-password.js
// Usage: node scripts/reset-password.js user@example.com NewP@ssw0rd
const mongoose = require('mongoose');
const path = require('path');

// Adjust path to your models/user file if needed
const User = require(path.join(__dirname, '..', 'models', 'user'));

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cxmngr-api'; // use your DB
const email = process.argv[2];
const newPassword = process.argv[3];

if (!newPassword) {
  console.error('Usage: node reset-password.js [email] <newPassword>');
  process.exit(1);
}

async function run() {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

    let user;
    if (email) {
      user = await User.findOne({ email });
      if (!user) {
        console.error('User not found for email:', email);
        process.exit(2);
      }
    } else {
      // take first user
      user = await User.findOne({});
      if (!user) {
        console.error('No users found in DB.');
        process.exit(3);
      }
      console.log('No email provided — using first user:', user.email);
    }

    // Assign the raw password; rely on the User model's pre-save hook to hash it.
    user.password = newPassword;

    await user.save();
    console.log('Password reset successful for', user.email);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(10);
  }
}

run();