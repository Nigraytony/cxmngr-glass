// Safe guard: if critical JWT secret missing, warn but allow server to start
if (!process.env.JWT_SECRET) {
  console.warn('[startup] JWT_SECRET not set; auth features may fail.');
}
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Project = require('../models/project');
const jwt = require('jsonwebtoken');
const { auth } = require('../middleware/auth');
const crypto = require('crypto');
const PasswordReset = require('../models/passwordReset');
const { sendResetEmail } = require('../utils/mailer');
const { rateLimit } = require('../middleware/rateLimit');
const { requireObjectIdParam } = require('../middleware/validate');
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

const loginLimiter = rateLimit({ windowMs: 60_000, max: 20, keyPrefix: 'login' })
const registerLimiter = rateLimit({ windowMs: 60_000, max: 10, keyPrefix: 'register' })
const passwordResetLimiter = rateLimit({ windowMs: 10 * 60_000, max: 10, keyPrefix: 'pwreset' })
const changePasswordLimiter = rateLimit({ windowMs: 10 * 60_000, max: 10, keyPrefix: 'change-password' })

function normalizeShortString(value, { maxLen = 256 } = {}) {
  if (value === undefined || value === null) return null
  const s = String(value).trim()
  if (!s) return null
  if (s.length > maxLen) return null
  return s
}

function normalizePasswordResetToken(value) {
  const s = normalizeShortString(value, { maxLen: 128 })
  if (!s) return null
  // tokens are generated via `crypto.randomBytes(32).toString('hex')` (64 hex chars)
  if (!/^[a-f0-9]{64}$/i.test(s)) return null
  return s.toLowerCase()
}

// Helper: hydrate user.projects from the Projects collection (avoid stale embedded fields)
async function hydrateUserProjects(userObj) {
  try {
    const projects = Array.isArray(userObj.projects) ? userObj.projects : []
    const ids = projects
      .map((p) => (typeof p === 'string' ? p : (p && (p._id || p.id))))
      .filter(Boolean)
      .map(String)
    if (!ids.length) { userObj.projects = []; return userObj }
    const uniqueIds = Array.from(new Set(ids))
    const found = await Project.find({ _id: { $in: uniqueIds } }).lean()
    const map = {}
    for (const pr of found) { map[String(pr._id)] = pr }
    userObj.projects = projects.map((p) => {
      const pid = String(typeof p === 'string' ? p : (p && (p._id || p.id)))
      const role = (typeof p === 'object' && p && p.role) ? p.role : undefined
      const isDefault = Boolean(typeof p === 'object' && p && p.default)
      const proj = map[pid] || null
      // Return a flattened, backward-compatible shape while sourcing fields from the canonical project
      return {
        _id: pid,
        name: proj ? proj.name : (typeof p === 'object' && p ? p.name : undefined),
        client: proj ? proj.client : (typeof p === 'object' && p ? p.client : undefined),
        location: proj ? proj.location : (typeof p === 'object' && p ? p.location : undefined),
        project_type: proj ? proj.project_type : (typeof p === 'object' && p ? p.project_type : undefined),
        status: proj ? proj.status : (typeof p === 'object' && p ? p.status : undefined),
        description: proj ? proj.description : (typeof p === 'object' && p ? p.description : undefined),
        role: role || 'user',
        default: isDefault,
      }
    })
    return userObj
  } catch (e) {
    // On failure, at least normalize to an array of {_id, role, default}
    const projects = Array.isArray(userObj.projects) ? userObj.projects : []
    userObj.projects = projects.map((p) => ({ _id: String(typeof p === 'string' ? p : (p && (p._id || p.id))), role: (p && p.role) || 'user', default: Boolean(p && p.default) }))
    return userObj
  }
}

// Register a new user
	router.post('/register', registerLimiter, async (req, res) => {
  // Accepts: firstName, lastName, company, email, password, role, projects[]
  try {
    const email = String(req.body && req.body.email || '').trim().toLowerCase()
    if (!email) return res.status(400).send({ error: 'email is required' })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).send({ error: 'Invalid email' })

    const firstName = String(req.body && req.body.firstName || '').trim()
    const lastName = String(req.body && req.body.lastName || '').trim()
    const company = String(req.body && req.body.company || '').trim()
    const password = String(req.body && req.body.password || '')
    if (!firstName) return res.status(400).send({ error: 'firstName is required' })
    if (!lastName) return res.status(400).send({ error: 'lastName is required' })
    if (!company) return res.status(400).send({ error: 'company is required' })
    if (!password) return res.status(400).send({ error: 'password is required' })
    if (password.length < 8) return res.status(400).send({ error: 'password must be at least 8 characters' })

    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).send({ error: 'Email already registered.' });
    }

    // Build user object
    const user = new User({
      avatar: req.body.avatar || '',
      firstName,
      lastName,
      email,
      password, // Will be hashed by pre-save hook
      // Security: never allow self-registration to set role or projects
      role: 'user',
      projects: [],
      contact: {
        company,
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

    // Ensure incoming projects are stored minimally to avoid duplication
    if (Array.isArray(user.projects)) {
      user.projects = user.projects.map((p) => {
        const pid = String(typeof p === 'string' ? p : (p && (p._id || p.id)))
        const role = (typeof p === 'object' && p && p.role) ? p.role : 'user'
        const isDefault = Boolean(typeof p === 'object' && p && p.default)
        return { _id: pid, role, default: isDefault }
      })
    }
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
  // Hydrate projects with live data
  const hydrated = await hydrateUserProjects(userObj)
  res.status(201).send({ user: hydrated, token });

  } catch (error) {
    res.status(400).send({ error: error.message || error });
  }
});
// ...existing code...

// Login a user
router.post('/login', loginLimiter, async (req, res) => {
  // console.log(req.body);
   try {
    const email = String(req.body && req.body.email || '').trim().toLowerCase()
    const password = String(req.body && req.body.password || '')
    if (!email || !password) return res.status(400).send({ error: 'email and password are required' })

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(req.body.password))) {
      return res.status(400).send({ error: 'Invalid login credentials' });
    }
    const userDoc = user.toObject({ getters: true });
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('[users.login] JWT_SECRET is not set');
      return res.status(500).send({ error: 'Server configuration error' });
    }
    const token = jwt.sign({ _id: user._id }, jwtSecret);
    delete userDoc.password; // Remove password from response
    const hydrated = await hydrateUserProjects(userDoc)
    res.send({ user: hydrated, token });
  } catch (error) {
    console.error('[users.login] error', error && (error.stack || error.message || error))
    res.status(400).send({ error: error && error.message ? String(error.message) : 'Login failed' });
  }
});

// Return the currently authenticated, hydrated user
router.get('/me', auth, async (req, res) => {
  try {
    // req.user is populated by auth middleware
    const user = req.user;
    if (!user) return res.status(404).send({ error: 'User not found' });

    const userObj = user.toObject ? user.toObject() : JSON.parse(JSON.stringify(user));
    if (userObj.password) delete userObj.password;
    if (userObj.__v) delete userObj.__v;

    const hydrated = await hydrateUserProjects(userObj);
    return res.status(200).send({ user: hydrated });
  } catch (err) {
    console.error('get /me error', err);
    return res.status(500).send({ error: 'Failed to load user' });
  }
});

// Update a user
router.put('/update/:_id', auth, requireObjectIdParam('_id'), async (req, res) => {
  // console.log(req.params, req.body);
  try {
    const actorId = String(req.user && (req.user._id || req.user.id) || '')
    const targetId = String(req.params._id || '')
    const globalRole = String(req.user && req.user.role || '').trim()
    const canAdminEdit = globalRole === 'globaladmin' || globalRole === 'superadmin'
    const isSelf = actorId && targetId && actorId === targetId
    if (!isSelf && !canAdminEdit) return res.status(403).send({ error: 'Forbidden' })

    // Sanitize project items to avoid writing duplicated project fields
    const payload = { ...(req.body || {}) }

    // If email is being changed, validate and ensure uniqueness
    if (payload.email !== undefined) {
      const nextEmail = String(payload.email || '').trim().toLowerCase()
      if (!nextEmail) return res.status(400).send({ error: 'email is required' })
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) return res.status(400).send({ error: 'Invalid email' })
      const existing = await User.findOne({ email: nextEmail }).select('_id').lean()
      if (existing && String(existing._id) !== String(targetId)) {
        return res.status(400).send({ error: 'Email already registered.' })
      }
      payload.email = nextEmail
    }

    // Non-admins cannot change membership, role, billing, or activation fields via profile update.
    if (!canAdminEdit) {
      delete payload.projects
      delete payload.role
      delete payload.isActive
      delete payload.deleted
      delete payload.status
      delete payload.stripeCustomerId
      delete payload.permissions
    }

    if (Array.isArray(payload.projects)) {
      payload.projects = payload.projects.map((p) => {
        const pid = String(typeof p === 'string' ? p : (p && (p._id || p.id)))
        const role = (typeof p === 'object' && p && p.role) ? p.role : 'user'
        const isDefault = Boolean(typeof p === 'object' && p && p.default)
        return { _id: pid, role, default: isDefault }
      })
    }
    // Basic validation/sanitization for profile signature block to avoid huge payloads
    try {
      // Only validate signature if a non-empty block is provided
      if (payload.contact && payload.contact.signature && typeof payload.contact.signature.block === 'string' && payload.contact.signature.block.trim() !== '') {
        const block = payload.contact.signature.block || ''
        // limit roughly to 300 KB (base64 data length) to avoid large DB writes
        const maxBytes = 300 * 1024
        // approximate bytes from base64 length (strip data:...;base64, prefix)
        const base64 = (block.split(',')[1] || '')
        const approxBytes = Math.ceil((base64.length * 3) / 4)
        if (approxBytes > maxBytes) {
          return res.status(400).send({ error: 'Signature image too large' })
        }
        // ensure it looks like a data URL image
        if (!block.startsWith('data:image/')) {
          return res.status(400).send({ error: 'Invalid signature format' })
        }
      }
    } catch (e) {
      // if any unexpected error during validation, fail safely
      return res.status(400).send({ error: 'Invalid signature payload' })
    }
    // Sanitize perPage preference if present: accept only common page sizes
    try {
      if (payload.contact && payload.contact.perPage !== undefined && payload.contact.perPage !== null) {
        const n = parseInt(String(payload.contact.perPage), 10)
        const allowed = [5, 10, 20, 25, 50, 100]
        if (isNaN(n) || !allowed.includes(n)) {
          // drop invalid value so it doesn't get written
          delete payload.contact.perPage
        } else {
          payload.contact.perPage = n
        }
      }
    } catch (e) {
      // ignore perPage sanitization errors and drop the field
      if (payload.contact) delete payload.contact.perPage
    }
    // Use a find + merge + save flow so partial updates don't fail validation
    const userDoc = await User.findById(req.params._id);
    if (!userDoc) {
      return res.status(404).send({ error: 'User not found' });
    }

    // Merge top-level fields from payload into the user document
    for (const key of Object.keys(payload)) {
      // avoid clobbering password unless explicitly provided
      if (key === 'password') continue;
      // simple assign for most fields; nested objects (contact, social_media) should be provided as objects
      userDoc[key] = payload[key];
    }

    // If password needs to be changed via this endpoint, require a separate flow (change-password)
    await userDoc.save();

    // sanitize user
    const userObj = userDoc.toObject ? userDoc.toObject() : JSON.parse(JSON.stringify(userDoc));
    if (userObj.password) delete userObj.password;
    if (userObj.__v) delete userObj.__v;
    const hydrated = await hydrateUserProjects(userObj);
    res.send({ user: hydrated });
  } catch (error) {
    console.error('[users.update] error', error && (error.stack || error.message || error))
    res.status(400).send({ error: error && error.message ? String(error.message) : 'Failed to update user' });
  }
});

// Change user password (secure): verify current password and hash the new one
router.post('/change-password', auth, changePasswordLimiter, async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).send({ error: 'currentPassword and newPassword are required' });
    }

    // If caller provided an email, ensure it matches the authenticated user.
    if (email) {
      const normalized = String(email).trim().toLowerCase()
      const actual = String(req.user && req.user.email || '').trim().toLowerCase()
      if (actual && normalized && normalized !== actual) {
        return res.status(400).send({ error: 'Email does not match authenticated user' })
      }
    }

    // Load the authenticated user with password for comparison.
    const userId = req.user && (req.user._id || req.user.id)
    const user = userId ? await User.findById(userId).select('+password') : null
    if (!user) return res.status(404).send({ error: 'User not found' })

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

// Request a password reset: creates a short-lived token and emails reset link
router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
  try {
    const { email } = req.body || {};
    const normalized = String(email || '').trim().toLowerCase()
    if (!normalized) return res.status(400).send({ error: 'email is required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return res.status(400).send({ error: 'Invalid email' })
    const user = await User.findOne({ email: normalized });
    if (!user) return res.status(200).send({ message: 'If that account exists, a reset email has been sent' });

    // generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    // store token
    const pr = new PasswordReset({ userId: user._id, token, expiresAt });
    await pr.save();

    const resetUrl = `${APP_URL}/reset-password?token=${token}`;
    // send email (best-effort)
    try {
      await sendResetEmail({ to: user.email, name: `${user.firstName || ''} ${user.lastName || ''}`.trim(), resetUrl });
    } catch (e) {
      console.error('forgot-password: failed to send reset email', e);
    }

    // Always respond with success message to avoid user enumeration
    return res.status(200).send({ message: 'If that account exists, a reset email has been sent' });
  } catch (err) {
    console.error('forgot-password error', err);
    return res.status(500).send({ error: 'Failed to process password reset' });
  }
});

// Perform password reset using token
router.post('/reset-password', passwordResetLimiter, async (req, res) => {
  try {
    const token = normalizePasswordResetToken(req.body && req.body.token)
    const newPassword = req.body && req.body.newPassword
    if (!token || !newPassword) return res.status(400).send({ error: 'token and newPassword are required' });
    if (typeof newPassword !== 'string' || newPassword.length < 8) return res.status(400).send({ error: 'New password must be at least 8 characters' });

    const pr = await PasswordReset.findOne({ token });
    if (!pr) return res.status(400).send({ error: 'Invalid or expired token' });
    if (pr.used) return res.status(400).send({ error: 'Token already used' });
    if (pr.expiresAt < new Date()) return res.status(400).send({ error: 'Token expired' });

    const user = await User.findById(pr.userId).select('+password');
    if (!user) return res.status(404).send({ error: 'User not found' });

    user.password = newPassword;
    await user.save();

    pr.used = true;
    await pr.save();

    return res.status(200).send({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('reset-password error', err);
    return res.status(500).send({ error: 'Failed to reset password' });
  }
});

module.exports = router;
