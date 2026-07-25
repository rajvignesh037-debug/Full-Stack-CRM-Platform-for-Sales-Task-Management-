const jwt = require('jsonwebtoken');
const userRepo = require('../repositories/userRepo');
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_12345';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ success: false, message: 'Access denied, token missing' });

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid token' });
    
    try {
      const user = await userRepo.findById(decoded.id);
      if (!user || user.is_active === false) {
        return res.status(403).json({ success: false, message: 'Your account has been disabled. Please contact admin.' });
      }
      req.user = user;
      next();
    } catch (dbErr) {
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });
};

module.exports = authenticateToken;
