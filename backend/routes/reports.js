const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/auth');
const reportService = require('../services/reportService');

router.get('/', authenticateToken, async (req, res) => {
    try {
        const data = await reportService.getInternReport(req.user, req.query);
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch report' });
    }
});

module.exports = router;