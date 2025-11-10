const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

// Simple endpoint to exercise permission checks in tests
router.get('/check', auth, requirePermission('rbac.test'), async (req, res) => {
  res.json({ ok: true, userRole: req.user.role });
});

module.exports = router;
