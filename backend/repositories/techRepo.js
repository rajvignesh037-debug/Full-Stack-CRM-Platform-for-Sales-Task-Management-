const { pool } = require('../config/db');

class TechRepo {
  // Groups
  async createGroup(name, description) {
    const res = await pool.query(
      'INSERT INTO tech_groups (name, description) VALUES ($1, $2) RETURNING *',
      [name, description]
    );
    return res.rows[0];
  }

  async getAllGroups() {
    const res = await pool.query(`
      SELECT g.*, 
      (SELECT COUNT(*) FROM users u WHERE u.group_name = g.name AND u.role = 'intern') as employee_count,
      (SELECT COUNT(*) FROM tech_tasks t WHERE t.group_id = g.id) as task_count
      FROM tech_groups g
      ORDER BY g.created_at DESC
    `);
    return res.rows;
  }

  async getGroupById(id) {
    const res = await pool.query('SELECT * FROM tech_groups WHERE id = $1', [id]);
    return res.rows[0];
  }

  async updateGroup(id, name, description) {
    const res = await pool.query(
      'UPDATE tech_groups SET name = $1, description = $2 WHERE id = $3 RETURNING *',
      [name, description, id]
    );
    return res.rows[0];
  }

  async deleteGroup(id) {
    await pool.query('DELETE FROM tech_groups WHERE id = $1', [id]);
    return true;
  }

  // Tasks
  async createTask(data) {
    const { title, description, assigned_to_id, group_id, due_date, priority, attachments } = data;
    const res = await pool.query(
      'INSERT INTO tech_tasks (title, description, assigned_to_id, group_id, due_date, priority, attachments) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [title, description, assigned_to_id, group_id, due_date, priority, attachments]
    );
    return res.rows[0];
  }

  async getAllTasks() {
    const res = await pool.query(`
      SELECT t.*, u.name as assigned_to_name, u.job_type, g.name as group_name
      FROM tech_tasks t
      LEFT JOIN users u ON t.assigned_to_id = u.id
      LEFT JOIN tech_groups g ON t.group_id = g.id
      ORDER BY t.created_at DESC
    `);
    return res.rows;
  }

  async getTasksByUserId(userId) {
    const res = await pool.query(`
      SELECT t.*, u.name as assigned_to_name, u.job_type, g.name as group_name
      FROM tech_tasks t
      LEFT JOIN users u ON t.assigned_to_id = u.id
      LEFT JOIN tech_groups g ON t.group_id = g.id
      WHERE t.assigned_to_id = $1
      ORDER BY t.created_at DESC
    `, [userId]);
    return res.rows;
  }

  async getTaskById(id) {
    const res = await pool.query(`
      SELECT t.*, u.name as assigned_to_name, u.job_type, g.name as group_name
      FROM tech_tasks t
      LEFT JOIN users u ON t.assigned_to_id = u.id
      LEFT JOIN tech_groups g ON t.group_id = g.id
      WHERE t.id = $1
    `, [id]);
    return res.rows[0];
  }

  async updateTaskStatus(id, status) {
    let query = 'UPDATE tech_tasks SET status = $1, updated_at = CURRENT_TIMESTAMP';
    let params = [status, id];
    
    if (status === 'Review') {
      query = 'UPDATE tech_tasks SET status = $1, last_submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
    } else {
      query = 'UPDATE tech_tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
    }
    
    const res = await pool.query(query, params);
    return res.rows[0];
  }

  async updateTask(id, data) {
    const { title, description, assigned_to_id, group_id, due_date, priority, status, attachments } = data;
    const res = await pool.query(
      'UPDATE tech_tasks SET title = $1, description = $2, assigned_to_id = $3, group_id = $4, due_date = $5, priority = $6, status = $7, attachments = $8, updated_at = CURRENT_TIMESTAMP WHERE id = $9 RETURNING *',
      [title, description, assigned_to_id, group_id, due_date, priority, status, attachments, id]
    );
    return res.rows[0];
  }

  async deleteTask(id) {
    await pool.query('DELETE FROM tech_tasks WHERE id = $1', [id]);
    return true;
  }

  async setUnreadFlag(id, flag, value) {
    const column = flag === 'admin' ? 'admin_unread' : 'intern_unread';
    await pool.query(`UPDATE tech_tasks SET ${column} = $1 WHERE id = $2`, [value, id]);
  }

  async markTaskAsRead(id, role) {
    const column = role === 'admin' ? 'admin_unread' : 'intern_unread';
    await pool.query(`UPDATE tech_tasks SET ${column} = FALSE WHERE id = $1`, [id]);
  }

  // Comments
  async addComment(taskId, userId, comment) {
    const res = await pool.query(
      'INSERT INTO tech_task_comments (task_id, user_id, comment) VALUES ($1, $2, $3) RETURNING *',
      [taskId, userId, comment]
    );
    return res.rows[0];
  }

  async getCommentsByTaskId(taskId) {
    const res = await pool.query(`
      SELECT c.*, u.name as user_name, u.role as user_role
      FROM tech_task_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.task_id = $1
      ORDER BY c.created_at ASC
    `, [taskId]);
    return res.rows;
  }

  async markCommentsAsRead(taskId, userId) {
    await pool.query(
      'UPDATE tech_task_comments SET is_read = TRUE WHERE task_id = $1 AND user_id != $2',
      [taskId, userId]
    );
  }

  // Activities
  async logActivity(userId, action, details) {
    const res = await pool.query(
      'INSERT INTO tech_activities (user_id, action, details) VALUES ($1, $2, $3) RETURNING *',
      [userId, action, details]
    );
    return res.rows[0];
  }

  async getRecentActivities(limit = 20) {
    const res = await pool.query(`
      SELECT a.*, u.name as user_name
      FROM tech_activities a
      JOIN users u ON a.user_id = u.id
      ORDER BY a.timestamp DESC
      LIMIT $1
    `, [limit]);
    return res.rows;
  }

  // Stats
  async getStats() {
    const employeeCount = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'intern' AND group_name = 'Technical' AND is_active = TRUE");
    const taskStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'Ongoing') as ongoing,
        COUNT(*) FILTER (WHERE status = 'Review') as review,
        COUNT(*) FILTER (WHERE status = 'Completed') as completed,
        COUNT(*) FILTER (WHERE status = 'Todo') as todo
      FROM tech_tasks
    `);
    
    return {
      totalEmployees: parseInt(employeeCount.rows[0].count),
      tasks: {
        total: parseInt(taskStats.rows[0].total),
        ongoing: parseInt(taskStats.rows[0].ongoing),
        review: parseInt(taskStats.rows[0].review),
        completed: parseInt(taskStats.rows[0].completed),
        todo: parseInt(taskStats.rows[0].todo)
      }
    };
  }

  async getTopMembers(limit = 5) {
    const res = await pool.query(`
      SELECT u.id, u.name, u.job_type,
             COUNT(t.id) FILTER (WHERE t.status = 'Completed') as completed_count,
             COUNT(t.id) FILTER (WHERE t.status = 'Ongoing') as ongoing_count,
             COUNT(t.id) FILTER (WHERE t.status = 'Review') as review_count,
             COUNT(t.id) as total_active
      FROM users u
      LEFT JOIN tech_tasks t ON u.id = t.assigned_to_id
      WHERE u.is_active = TRUE AND u.group_name = 'Technical'
      GROUP BY u.id, u.name, u.job_type
      ORDER BY total_active DESC, completed_count DESC
      LIMIT $1
    `, [limit]);
    return res.rows;
  }
}

module.exports = new TechRepo();
