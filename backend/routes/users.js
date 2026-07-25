const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const authenticateToken = require('../middlewares/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await userService.getUsers(req.user);
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, message: 'Internal error' }); }
});

router.post('/', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });
  try {
    const result = await userService.createUser(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
});

router.put('/:id/group', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });
  try {
    const { group_name, job_type } = req.body;
    const result = await userService.updateGroup(req.params.id, group_name, job_type);
    if (!result) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update group' });
  }
});

router.put('/:id/profile', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, gender } = req.body;
  if (req.user.id !== parseInt(id) && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  try {
    const result = await userService.updateProfile(id, name, gender);
    if (!result) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

router.put('/:id/deactivate', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });
  try {
    await userService.deactivateUser(req.user.id, req.params.id);
    res.json({ success: true, data: { message: 'User deactivated successfully' } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to deactivate user' });
  }
});

router.put('/reset-password/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });
  try {
    const response = await userService.resetPassword(req.user.id, req.params.id, req.body.newPassword);
    const data = { message: "Password reset successful" };
    if (response.tempPassword) data.tempPassword = response.tempPassword;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
});

module.exports = router;
