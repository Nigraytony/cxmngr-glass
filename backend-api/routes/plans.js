const express = require('express');
const router = express.Router();
const plans = require('../config/plans');

// Public plans endpoint: serve canonical plan definitions
router.get('/', (req, res) => {
  try {
    res.json(plans || []);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load plans' });
  }
});

module.exports = router;
