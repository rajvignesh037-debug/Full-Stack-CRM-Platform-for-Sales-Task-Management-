const express = require('express');
const router = express.Router();
const activityService = require('../services/activityService');
const authenticateToken = require('../middlewares/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await activityService.getActivities();
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, message: 'Internal error' }); }
});

module.exports = router;
