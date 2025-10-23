const express = require('express');
const router = express.Router();
const User = require('../models/user');
const jwt = require('jsonwebtoken');

// Register a new user
router.post('/register', async (req, res) => {
  // Accepts: firstName, lastName, company, email, password, role, projects[]
  try {
    // Check if user already exists
    const existing = await User.findOne({ email: req.body.email });
    if (existing) {
      return res.status(400).send({ error: 'Email already registered.' });
    }

    // Build user object
    const user = new User({
      avatar: req.body.avatar || '',
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      password: req.body.password, // Will be hashed by pre-save hook
      role: req.body.role || 'user',
      projects: req.body.projects || [],
      contact: {
        company: req.body.company,
        phone: req.body.phone || '',
        address: {
          street: req.body.street || '',
          city: req.body.city || '',
          state: req.body.state || '',
          zip: req.body.zip || '',
          country: req.body.country || '',
          taxId: req.body.taxId || '',
        },
        bio: req.body.bio || '',
        avatar: req.body.avatar || '',
      },
      social_media: {
        linkedin: req.body.linkedin || '',
        x: req.body.x || '',
        facebook: req.body.facebook || '',
        instagram: req.body.instagram || '',
        youtube: req.body.youtube || '',
        github: req.body.github || '',
        telegram: req.body.telegram || '',
        website: req.body.website || '',
      },
    });

    await user.save();
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('[users.register] JWT_SECRET is not set');
      return res.status(500).send({ error: 'Server configuration error' });
    }
    const token = jwt.sign({ _id: user._id }, jwtSecret);
    // Remove password from response
    const userObj = user.toObject();
    delete userObj.password;
    res.status(201).send({ user: userObj, token });

  } catch (error) {
    res.status(400).send({ error: error.message || error });
  }
});
// ...existing code...

// Login a user
router.post('/login', async (req, res) => {
  // console.log(req.body);
   try {
    const user = await User.findOne({ email: req.body.email });
    const userDoc = user.toObject({ getters: true });
    if (!user || !(await user.comparePassword(req.body.password))) {
      return res.status(400).send({ error: 'Invalid login credentials' });
    }
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('[users.login] JWT_SECRET is not set');
      return res.status(500).send({ error: 'Server configuration error' });
    }
    const token = jwt.sign({ _id: user._id }, jwtSecret);
    delete userDoc.password; // Remove password from response
    res.send({ user: userDoc, token });
  } catch (error) {
    res.status(400).send(error);
  }
});

// Update a user
router.put('/update/:_id', async (req, res) => {
  // console.log(req.params, req.body);
  try {
    const user = await User.findByIdAndUpdate(req.params._id, req.body, { new: true, runValidators: true });
    if (!user) {
      return res.status(404).send({ error: 'User not found' });
    }
    // sanitize user
    const userObj = user.toObject ? user.toObject() : JSON.parse(JSON.stringify(user));
    if (userObj.password) delete userObj.password;
    if (userObj.__v) delete userObj.__v;
    res.send({ user: userObj });
  } catch (error) {
    res.status(400).send(error);
  }
});

// Change user password (secure): verify current password and hash the new one
router.post('/change-password', async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body || {};
    if (!email || !currentPassword || !newPassword) {
      return res.status(400).send({ error: 'email, currentPassword and newPassword are required' });
    }

    // find user and include password for comparison (if schema excludes it by default)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(404).send({ error: 'User not found' });
    }

    // Verify current password using model helper
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).send({ error: 'Current password is incorrect' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).send({ error: 'New password must be at least 8 characters' });
    }

    // Assign raw new password; the User model pre-save hook will hash it
    user.password = newPassword;

    // Optional: invalidate tokens / rotate session version here

    await user.save();
    res.send({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('change-password error', error);
    res.status(400).send({ error: error.message || error });
  }
});

module.exports = router;