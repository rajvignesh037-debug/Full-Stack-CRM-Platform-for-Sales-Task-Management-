const { pool } = require('../config/db');

class NotificationRepo {
  async createNotification(data, clientParam = null) {
    const { type, task_id, demo_id, sender_id, receiver_role, receiver_id, title, message } = data;
    const db = clientParam || pool;
    const res = await db.query(
      'INSERT INTO notifications (type, task_id, demo_id, sender_id, receiver_role, receiver_id, title, message) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [type, task_id, demo_id, sender_id, receiver_role, receiver_id, title, message]
    );
    return res.rows[0];
  }

  async getNotifications(role, userId) {
    let query = `
      SELECT n.*, u.name as sender_name, g.name as group_name, t.title as task_title, d.date as demo_date, d.time as demo_time, l.name as client_name
      FROM notifications n
      LEFT JOIN users u ON n.sender_id = u.id
      LEFT JOIN tech_tasks t ON n.task_id = t.id
      LEFT JOIN tech_groups g ON t.group_id = g.id
      LEFT JOIN demos d ON n.demo_id = d.id
      LEFT JOIN leads l ON d.lead_id = l.id
      WHERE n.receiver_role = $1
    `;
    const params = [role];

    if (role === 'intern') {
      query += ` AND n.receiver_id = $2`;
      params.push(userId);
    }

    query += ` ORDER BY n.created_at DESC`;
    
    const res = await pool.query(query, params);
    return res.rows;
  }

  async markAsRead(role, userId) {
    if (role === 'admin') {
      await pool.query('UPDATE notifications SET is_read = TRUE WHERE receiver_role = $1', [role]);
    } else {
      await pool.query('UPDATE notifications SET is_read = TRUE WHERE receiver_role = $1 AND receiver_id = $2', [role, userId]);
    }
  }

  async markReadById(id, role, userId) {
    if (role === 'admin') {
      await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND receiver_role = $2', [id, role]);
    } else {
      await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND receiver_role = $2 AND receiver_id = $3', [id, role, userId]);
    }
  }

  async getUnreadCount(role, userId) {
    let query = 'SELECT COUNT(*) FROM notifications WHERE receiver_role = $1 AND is_read = FALSE';
    const params = [role];

    if (role === 'intern') {
      query += ' AND receiver_id = $2';
      params.push(userId);
    }

    const res = await pool.query(query, params);
    return parseInt(res.rows[0].count);
  }

  async deleteNotification(id, role, userId) {
    if (role === 'admin') {
      await pool.query('DELETE FROM notifications WHERE id = $1 AND receiver_role = $2', [id, role]);
    } else {
      await pool.query('DELETE FROM notifications WHERE id = $1 AND receiver_role = $2 AND receiver_id = $3', [id, role, userId]);
    }
  }

  async clearAllNotifications(role, userId) {
    if (role === 'admin') {
      await pool.query('DELETE FROM notifications WHERE receiver_role = $1', [role]);
    } else {
      await pool.query('DELETE FROM notifications WHERE receiver_role = $1 AND receiver_id = $2', [role, userId]);
    }
  }
}

module.exports = new NotificationRepo();
