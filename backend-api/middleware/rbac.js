const Role = require('../models/role');

// Simple permission check middleware generator. Assumes `auth` has already
// populated `req.user`.
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).send({ error: 'Please authenticate.' });
      // short-circuit admins
      const roleName = String(req.user.role || '').trim();
      if (roleName === 'admin') return next();

      // load role definition from DB
      const role = await Role.findOne({ name: roleName });
      if (!role) return res.status(403).send({ error: 'Forbidden' });
      const perms = Array.isArray(role.permissions) ? role.permissions : [];
      if (perms.includes(permission)) return next();
      return res.status(403).send({ error: 'Forbidden' });
    } catch (err) {
      console.error('[rbac] permission check error', err && err.message ? err.message : err);
      return res.status(500).send({ error: 'RBAC error' });
    }
  };
};

module.exports = { requirePermission };
