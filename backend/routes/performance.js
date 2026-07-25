const express = require('express');
const router = express.Router();
const performanceService = require('../services/performanceService');
const authenticateToken = require('../middlewares/auth');

router.get('/', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });
  try {
    const result = await performanceService.getPerformance();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal error' });
  }
});

module.exports = router;
