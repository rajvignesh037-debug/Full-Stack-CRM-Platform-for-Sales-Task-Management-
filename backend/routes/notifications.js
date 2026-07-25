const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const authenticateToken = require('../middlewares/auth');

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const data = await notificationService.getNotifications(req.user.role, req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/mark-read', async (req, res) => {
  try {
    await notificationService.markAsRead(req.user.role, req.user.id);
    res.json({ success: true, message: 'Notifications marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/:id/mark-read', async (req, res) => {
  try {
    await notificationService.markReadById(req.params.id, req.user.role, req.user.id);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/unread-count', async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.role, req.user.id);
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await notificationService.deleteNotification(req.params.id, req.user.role, req.user.id);
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/', async (req, res) => {
  try {
    await notificationService.clearAllNotifications(req.user.role, req.user.id);
    res.json({ success: true, message: 'All notifications cleared' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
