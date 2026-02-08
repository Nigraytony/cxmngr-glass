const jwt = require('jsonwebtoken');
const User = require('../models/user');

const auth = async (req, res, next) => {
  try {
    const raw = req.header('Authorization') || '';
    const token = raw.replace('Bearer ', '').trim();
    if (!token) return res.status(401).send({ error: 'Please authenticate.' });

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('[auth] JWT_SECRET not configured');
      return res.status(500).send({ error: 'Server configuration error' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (e) {
      return res.status(401).send({ error: 'Please authenticate.' });
    }

    const user = await User.findById(decoded._id || decoded.id || decoded.userId);
    if (!user) {
      return res.status(401).send({ error: 'Please authenticate.' });
    }

    // Optional server-side invalidation: if token includes tv claim, require it to match user.tokenVersion.
    // This allows invalidating outstanding tokens (e.g., logout everywhere) while keeping the API backward compatible.
    if (decoded && Object.prototype.hasOwnProperty.call(decoded, 'tv')) {
      const userTv = Number(user.tokenVersion || 0)
      const tokenTv = Number(decoded.tv || 0)
      if (userTv !== tokenTv) {
        return res.status(401).send({ error: 'Please authenticate.' });
      }
    }

    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    console.error('[auth] unexpected error', error);
    res.status(401).send({ error: 'Please authenticate.' });
  }
};

const authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return [
    auth,
    (req, res, next) => {
      if (!roles.includes(req.user.role)) {
        return res.status(403).send({ error: 'Forbidden' });
      }
      next();
    },
  ];
};

module.exports = { auth, authorize };