const techRepo = require('../repositories/techRepo');
const notificationService = require('./notificationService');

class TechService {
  async getOverview() {
    const stats = await techRepo.getStats();
    const activities = await techRepo.getRecentActivities(10);
    const topMembers = await techRepo.getTopMembers(5);
    const groups = await techRepo.getAllGroups();

    return {
      stats,
      activities,
      topMembers,
      groups
    };
  }

  async createGroup(name, description, adminId) {
    const group = await techRepo.createGroup(name, description);
    await techRepo.logActivity(adminId, 'Created Group', `Group "${name}" was created.`);
    return group;
  }

  async getGroups() {
    return await techRepo.getAllGroups();
  }

  async getGroupDetails(id) {
    const group = await techRepo.getGroupById(id);
    if (!group) return null;

    // In a real scenario, we might want tasks and members for this specific group
    // For now, let's just return the group
    return group;
  }

  async updateGroup(id, name, description, adminId) {
    const group = await techRepo.updateGroup(id, name, description);
    await techRepo.logActivity(adminId, 'Updated Group', `Group "${name}" was updated.`);
    return group;
  }

  async deleteGroup(id, adminId) {
    const group = await techRepo.getGroupById(id);
    if (group) {
      await techRepo.deleteGroup(id);
      await techRepo.logActivity(adminId, 'Deleted Group', `Group "${group.name}" was deleted.`);
    }
    return true;
  }

  async createTask(data, adminId, adminName) {
    const task = await techRepo.createTask(data);
    await techRepo.logActivity(adminId, 'Created Task', `Task "${data.title}" was assigned.`);

    // Notify intern
    if (data.assigned_to_id) {
      await notificationService.createNotification({
        type: 'tech_task_assigned',
        task_id: task.id,
        sender_id: adminId,
        receiver_id: data.assigned_to_id,
        receiver_role: 'intern',
        title: 'New Task Assigned',
        message: `Admin ${adminName || ''} assigned you a new task: "${data.title}"`
      });
    }
    return task;
  }

  async updateTask(id, data, adminId, adminName) {
    const task = await techRepo.updateTask(id, data);
    await techRepo.logActivity(adminId, 'Updated Task', `Task "${data.title}" was modified.`);

    // Notify intern
    if (task.assigned_to_id) {
      await notificationService.createNotification({
        type: 'tech_task_updated',
        task_id: task.id,
        sender_id: adminId,
        receiver_id: task.assigned_to_id,
        receiver_role: 'intern',
        title: 'Task Details Updated',
        message: `Admin ${adminName || ''} updated the details for your task: "${task.title}".`
      });
    }
    return task;
  }

  async deleteTask(id, adminId) {
    const task = await techRepo.getTaskById(id);
    if (task) {
      await techRepo.deleteTask(id);
      await techRepo.logActivity(adminId, 'Deleted Task', `Task "${task.title}" was removed.`);
    }
    return true;
  }

  async getTasks(userId, role) {
    if (role === 'admin') {
      return await techRepo.getAllTasks();
    } else {
      return await techRepo.getTasksByUserId(userId);
    }
  }

  async getTaskDetails(id, userId, role) {
    const task = await techRepo.getTaskById(id);
    if (!task) return null;
    const comments = await techRepo.getCommentsByTaskId(id);
    await techRepo.markCommentsAsRead(id, userId);
    // Also mark the task as read for the current role
    await techRepo.markTaskAsRead(id, role);
    return { ...task, comments };
  }

  async markTaskAsRead(id, role) {
    return await techRepo.markTaskAsRead(id, role);
  }

  async updateTaskStatus(id, status, userId, userName, role) {
    const task = await techRepo.updateTaskStatus(id, status);

    // Set unread flags based on status change
    if (status === 'Review' && role !== 'admin') {
      await techRepo.setUnreadFlag(id, 'admin', true);
    } else if (status === 'Ongoing' && role === 'admin') {
      await techRepo.setUnreadFlag(id, 'intern', true);
    } else if (status === 'Completed' && role === 'admin') {
      await techRepo.setUnreadFlag(id, 'intern', true);
    }

    await techRepo.logActivity(userId, 'Updated Task Status', `${userName} moved task "${task.title}" to ${status}.`);

    // Create notification for admin if intern submits for review
    if (status === 'Review' && role !== 'admin') {
      await notificationService.createNotification({
        type: 'tech_review',
        task_id: id,
        sender_id: userId,
        receiver_role: 'admin',
        title: 'Task Submitted for Review',
        message: `${userName} submitted task "${task.title}" for review.`
      });
    }

    // Create notification for intern if admin updates status
    if (role === 'admin' && task.assigned_to_id) {
      let title = 'Task Status Updated';
      let message = '';
      if (status === 'Ongoing') {
        title = 'Task Sent Back for Changes';
        message = `Admin ${userName} requested changes on task "${task.title}".`;
      } else if (status === 'Completed') {
        title = 'Task Approved';
        message = `Admin ${userName} approved and completed your task "${task.title}".`;
      } else {
        message = `Admin ${userName} moved your task "${task.title}" to ${status}.`;
      }

      await notificationService.createNotification({
        type: 'tech_status_update',
        task_id: id,
        sender_id: userId,
        receiver_id: task.assigned_to_id,
        receiver_role: 'intern',
        title: title,
        message: message
      });
    }

    return task;
  }

  async addComment(taskId, userId, userName, comment, role) {
    const newComment = await techRepo.addComment(taskId, userId, comment);
    // Set unread flag for the other party
    const targetFlag = role === 'admin' ? 'intern' : 'admin';
    await techRepo.setUnreadFlag(taskId, targetFlag, true);

    // Create global inbox notification if intern sends a message
    if (role !== 'admin') {
      await notificationService.createNotification({
        type: 'tech_message',
        task_id: taskId,
        sender_id: userId,
        receiver_role: 'admin',
        title: 'New Task Message',
        message: `${userName} sent a new discussion message: "${comment.length > 50 ? comment.substring(0, 50) + '...' : comment}"`
      });
    } else {
      // Notify intern if admin sends a message
      const task = await techRepo.getTaskById(taskId);
      if (task && task.assigned_to_id) {
        await notificationService.createNotification({
          type: 'tech_message',
          task_id: taskId,
          sender_id: userId,
          receiver_id: task.assigned_to_id,
          receiver_role: 'intern',
          title: 'Admin replied to task',
          message: `Admin ${userName} replied: "${comment.length > 50 ? comment.substring(0, 50) + '...' : comment}"`
        });
      }
    }

    return newComment;
  }
}

module.exports = new TechService();
