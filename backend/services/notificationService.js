const notificationRepo = require('../repositories/notificationRepo');

class NotificationService {
  async createNotification(data, clientParam = null) {
    return await notificationRepo.createNotification(data, clientParam);
  }

  async getNotifications(role, userId) {
    return await notificationRepo.getNotifications(role, userId);
  }

  async markAsRead(role, userId) {
    return await notificationRepo.markAsRead(role, userId);
  }

  async markReadById(id, role, userId) {
    return await notificationRepo.markReadById(id, role, userId);
  }

  async getUnreadCount(role, userId) {
    return await notificationRepo.getUnreadCount(role, userId);
  }

  async deleteNotification(id, role, userId) {
    return await notificationRepo.deleteNotification(id, role, userId);
  }

  async clearAllNotifications(role, userId) {
    return await notificationRepo.clearAllNotifications(role, userId);
  }
}

module.exports = new NotificationService();
