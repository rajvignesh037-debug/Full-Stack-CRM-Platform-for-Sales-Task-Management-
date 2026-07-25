const { pool } = require('../config/db');

module.exports = {
  log: async (userId, action, details, clientParam = null) => {
    const client = clientParam || pool;
    await client.query(
      'INSERT INTO activity_log (user_id, action, details) VALUES ($1, $2, $3)', 
      [userId, action, details]
    );
  },
  getAll: async () => {
    const res = await pool.query('SELECT activity_log.*, users.name as user_name FROM activity_log LEFT JOIN users ON activity_log.user_id = users.id ORDER BY timestamp DESC');
    return res.rows;
  }
};
