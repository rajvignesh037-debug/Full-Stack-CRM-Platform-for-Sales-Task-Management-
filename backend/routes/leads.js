const express = require('express');
const router = express.Router();
const leadService = require('../services/leadService');
const authenticateToken = require('../middlewares/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    let result = await leadService.getLeads(req.user);
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, message: 'Internal error' }); }
});

router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, contact, email, location, city, status, plan_value, duration } = req.body;
  try {
    const result = await leadService.updateLead(id, { name, contact, email, location, city, status, plan_value, duration });
    if (!result) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, data: result });
  } catch(err) { res.status(500).json({ success: false, message: 'Internal error' }); }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });
  const { id } = req.params;
  try {
    await leadService.deleteLead(id);
    res.json({ success: true, data: { message: 'Lead deleted successfully' } });
  } catch(err) { res.status(500).json({ success: false, message: 'Internal error' }); }
});

router.post('/upload', authenticateToken, async (req, res) => {
  const { leads, group, internId } = req.body; 
  if (!Array.isArray(leads) || leads.length === 0) return res.status(400).json({ success: false, message: 'Array of leads required' });

  try {
    const result = await leadService.uploadLeads(req.user.id, leads, group, internId);
    res.json({ success: true, data: { message: 'Leads uploaded successfully', count: result.insertedLeads, assignedInterns: result.assignedInterns } });
  }catch (err) {
    console.error("Upload error:", err);

    res.status(500).json({
      success: false,
      message: err.message || 'Upload failed'
    });
  }
});

router.post('/assign', authenticateToken, async (req, res) => {
  const { group, leadIds } = req.body;
  try {
    const result = await leadService.assignLeads(req.user.id, group, leadIds);
    if (result.error) return res.status(400).json({ success: false, message: result.error });

    res.json({ success: true, data: { message: 'Leads assigned successfully' } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Assign failed' });
  }
});

module.exports = router;
