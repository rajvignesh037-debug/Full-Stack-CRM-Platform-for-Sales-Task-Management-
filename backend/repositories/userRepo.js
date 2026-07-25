const { pool } = require('../config/db');

module.exports = {
  findByEmail: async (email) => {
    const res = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    return res.rows[0];
  },
  findById: async (id) => {
    const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return res.rows[0];
  },
  findAll: async () => {
    const res = await pool.query('SELECT id, name, email, role, group_name, job_type, account_id, gender, is_active FROM users');
    return res.rows;
  },
  findInternsByGroup: async (groupName) => {
    const query = groupName === 'All Groups' || !groupName 
      ? "SELECT id, name, job_type FROM users WHERE role='intern' AND is_active = true" 
      : "SELECT id, name, job_type FROM users WHERE role='intern' AND group_name=$1 AND is_active = true";
    const params = groupName && groupName !== 'All Groups' ? [groupName] : [];
    const res = await pool.query(query, params);
    return res.rows;
  },
  findActiveIntern: async (id) => {
    const res = await pool.query("SELECT id, name, job_type FROM users WHERE role='intern' AND id=$1 AND is_active = true", [id]);
    return res.rows;
  },
  create: async (user) => {
    const res = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, group_name, job_type, account_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, email, role, group_name, job_type, account_id, gender, is_active`,
      [user.name, user.email, user.password_hash, user.role, user.group_name, user.job_type, user.account_id]
    );
    return res.rows[0];
  },
  updatePassword: async (id, hash, attempts, forceChange) => {
    await pool.query(
      "UPDATE users SET password_hash = $1, password_attempts = $2, force_password_change = $3 WHERE id = $4", 
      [hash, attempts, forceChange, id]
    );
  },
  updateGroup: async (id, groupName, jobType) => {
    const res = await pool.query(
      `UPDATE users SET group_name = $1, job_type = $2 WHERE id = $3 RETURNING id, name, email, role, group_name, job_type, account_id, gender, is_active`,
      [groupName, jobType, id]
    );
    return res.rows[0];
  },
  updateProfile: async (id, name, gender) => {
    const res = await pool.query(
      `UPDATE users SET name = $1, gender = $2 WHERE id = $3 RETURNING id, name, email, role, group_name, job_type, account_id, gender, is_active`,
      [name, gender, id]
    );
    return res.rows[0];
  },
  deactivate: async (id) => {
    await pool.query('UPDATE users SET is_active = false WHERE id = $1', [id]);
  }
};
