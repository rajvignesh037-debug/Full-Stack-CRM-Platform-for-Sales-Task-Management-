const express = require('express');
const router = express.Router();
const techService = require('../services/techService');
const authenticateToken = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/tasks';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// All routes here require authentication
router.use(authenticateToken);

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  const url = `${req.protocol}://${req.get('host')}/uploads/tasks/${req.file.filename}`;
  res.json({ success: true, url, name: req.file.originalname });
});

router.get('/overview', async (req, res) => {
  try {
    const data = await techService.getOverview();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Groups
router.get('/groups', async (req, res) => {
  try {
    const data = await techService.getGroups();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/groups', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });
  try {
    const { name, description } = req.body;
    const data = await techService.createGroup(name, description, req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/groups/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });
  try {
    const { name, description } = req.body;
    const data = await techService.updateGroup(req.params.id, name, description, req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/groups/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });
  try {
    await techService.deleteGroup(req.params.id, req.user.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Tasks
router.get('/tasks', async (req, res) => {
  try {
    const data = await techService.getTasks(req.user.id, req.user.role);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/tasks', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });
  try {
    const data = await techService.createTask(req.body, req.user.id, req.user.name);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/tasks/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });
  try {
    const data = await techService.updateTask(req.params.id, req.body, req.user.id, req.user.name);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/tasks/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });
  try {
    await techService.deleteTask(req.params.id, req.user.id);
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/tasks/:id', async (req, res) => {
  try {
    const data = await techService.getTaskDetails(req.params.id, req.user.id, req.user.role);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/tasks/:id/mark-read', async (req, res) => {
  try {
    await techService.markTaskAsRead(req.params.id, req.user.role);
    res.json({ success: true, message: 'Read' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/tasks/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const data = await techService.updateTaskStatus(req.params.id, status, req.user.id, req.user.name, req.user.role);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/tasks/:id/comments', async (req, res) => {
  try {
    const { comment } = req.body;
    const data = await techService.addComment(req.params.id, req.user.id, req.user.name, comment, req.user.role);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
