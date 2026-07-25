const { pool } = require('../config/db');

module.exports = {
  findAll: async () => {
    const res = await pool.query(`
      SELECT 
        leads.id, 
        leads.name AS lead_name, 
        leads.contact, 
        leads.email, 
        leads.location, 
        leads.city, 
        leads.status, 
        leads.assigned_to_id,
        leads.plan_value,
        leads.duration,
        users.name AS intern_name, 
        users.account_id, 
        users.group_name
      FROM leads 
      LEFT JOIN users ON leads.assigned_to_id = users.id 
      WHERE users.is_active = true OR leads.assigned_to_id IS NULL
      ORDER BY leads.created_at DESC
    `);
    return res.rows;
  },
  findByUser: async (userId) => {
    const res = await pool.query(`
      SELECT 
        leads.id, 
        leads.name AS lead_name, 
        leads.contact, 
        leads.email, 
        leads.location, 
        leads.city, 
        leads.status, 
        leads.assigned_to_id,
        leads.plan_value,
        leads.duration,
        users.name AS intern_name, 
        users.account_id, 
        users.group_name
      FROM leads 
      LEFT JOIN users ON leads.assigned_to_id = users.id 
      WHERE assigned_to_id = $1 
      ORDER BY leads.created_at DESC
    `, [userId]);
    return res.rows;
  },
  findById: async (id) => {
    const res = await pool.query('SELECT * FROM leads WHERE id = $1', [id]);
    return res.rows[0];
  },
  update: async (id, lead) => {
    const res = await pool.query(
      'UPDATE leads SET name=$1, contact=$2, email=$3, location=$4, city=$5, status=$6, plan_value=$7, duration=$8 WHERE id=$9 RETURNING *',
      [lead.name, lead.contact, lead.email, lead.location, lead.city, lead.status, lead.plan_value, lead.duration, id]
    );
    return res.rows[0];
  },
  delete: async (id) => {
    await pool.query('DELETE FROM leads WHERE id=$1', [id]);
  },
  updateAssignee: async (id, assigned_to_id) => {
    await pool.query('UPDATE leads SET assigned_to_id=$1 WHERE id=$2', [assigned_to_id, id]);
  }
};
