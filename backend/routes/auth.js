const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const authenticateToken = require('../middlewares/auth');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });

  try {
    const data = await authService.login(email, password);
    res.json({
        success: true,
        data: {
            message: 'Login successful', 
            ...data
        }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    const status = error.message.includes('User not found') || error.message.includes('Incorrect password') || error.message.includes('disabled') ? 401 : 500;
    res.status(status).json({ success: false, message: error.message || 'Internal server error' });
  }
});

router.get('/verify', authenticateToken, async (req, res) => {
  try {
    const user = await authService.verifyUser(req.user.id);
    res.json({ success: true, data: { valid: true, user } });
  } catch (err) {
    const status = err.message === 'User not found' ? 404 : (err.message === 'Account disabled' ? 403 : 500);
    res.status(status).json({ success: false, message: err.message || 'Internal server error' });
  }
});

router.post('/logout', authenticateToken, async (req, res) => {
  try {
    await authService.logout(req.user.id);
    res.json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post('/change-password', authenticateToken, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters and contain letters and numbers.' });
  }

  try {
      const remaining = await authService.changePassword(req.user.id, newPassword);
      res.json({ success: true, data: { message: 'Password updated successfully', remaining_attempts: remaining } });
  } catch (err) {
      const status = err.message.includes('not found') ? 404 : (err.message.includes('exceeded') ? 403 : 500);
      res.status(status).json({ success: false, message: err.message || 'Internal server error' });
  }
});

module.exports = router;
