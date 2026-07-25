const { pool } = require('../config/db');

module.exports = {
  getActivities: async () => {
    const res = await pool.query('SELECT * FROM activity_log ORDER BY timestamp DESC');
    return res.rows;
  }
};
