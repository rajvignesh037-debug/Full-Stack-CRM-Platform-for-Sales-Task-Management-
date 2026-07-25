const { pool } = require('../config/db');

module.exports = {
  findAll: async () => {
    const res = await pool.query(`
      SELECT 
        d.id, d.lead_id, d.intern_id, d.date, d.time, 
        (
          SELECT al.timestamp AT TIME ZONE 'Asia/Kolkata'
          FROM activity_log al
          WHERE al.details LIKE '%' || d.id || '%'
          AND al.action IN ('Demo Scheduled', 'Demo Converted', 'Plan Updated')
          ORDER BY al.timestamp DESC
          LIMIT 1
        ) AS timeline,
        d.status, d.feedback, d.created_at,
        l.name AS lead_name, l.contact AS lead_contact, l.email AS lead_email, l.location AS lead_location, l.city as lead_city, l.status AS lead_status,
        l.plan_value, l.duration,
        u.name AS intern_name, u.account_id AS intern_account_id, u.group_name AS intern_group
      FROM demos d
      LEFT JOIN leads l ON d.lead_id = l.id
      LEFT JOIN users u ON d.intern_id = u.id
      WHERE u.is_active = true OR d.intern_id IS NULL
      ORDER BY d.date::date ASC, d.time::time ASC
    `);
    return res.rows;
  },
  findByIntern: async (internId) => {
    const res = await pool.query(`
      SELECT 
        d.id, d.lead_id, d.intern_id, d.date, d.time, 
        (
          SELECT al.timestamp AT TIME ZONE 'Asia/Kolkata'
          FROM activity_log al
          WHERE al.details LIKE '%' || d.id || '%'
          AND al.action IN ('Demo Scheduled', 'Demo Converted', 'Plan Updated')
          ORDER BY al.timestamp DESC
          LIMIT 1
        ) AS timeline,
        d.status, d.feedback, d.created_at,
        l.name AS lead_name, l.contact AS lead_contact, l.email AS lead_email, l.location AS lead_location, l.city as lead_city, l.status AS lead_status,
        l.plan_value, l.duration,
        u.name AS intern_name, u.account_id AS intern_account_id, u.group_name AS intern_group
      FROM demos d
      LEFT JOIN leads l ON d.lead_id = l.id
      LEFT JOIN users u ON d.intern_id = u.id
      WHERE d.intern_id = $1
      ORDER BY d.date::date ASC, d.time::time ASC
    `, [internId]);
    return res.rows;
  },
  create: async (demo, clientParam = null) => {
    const client = clientParam || pool;
    const res = await client.query(
      'INSERT INTO demos (lead_id, intern_id, date, time) VALUES ($1, $2, $3, $4) RETURNING *',
      [demo.lead_id, demo.intern_id, demo.date, demo.time]
    );
    return res.rows[0];
  },
  update: async (id, demo) => {
    const res = await pool.query(
      'UPDATE demos SET date = $1, time = $2 WHERE id = $3 RETURNING *',
      [demo.date, demo.time, id]
    );
    return res.rows[0];
  },
  updateFeedback: async (id, feedback) => {
    const res = await pool.query(
      'UPDATE demos SET feedback = $1 WHERE id = $2 RETURNING *',
      [feedback, id]
    );
    return res.rows[0];
  },
  findById: async (id) => {
    const res = await pool.query('SELECT * FROM demos WHERE id = $1', [id]);
    return res.rows[0];
  },
  findByLeadAndIntern: async (leadId, internId) => {
    const res = await pool.query('SELECT * FROM demos WHERE lead_id = $1 AND intern_id = $2', [leadId, internId]);
    return res.rows[0];
  }
};
