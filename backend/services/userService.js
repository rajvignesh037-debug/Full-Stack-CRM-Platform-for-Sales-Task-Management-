const userRepo = require('../repositories/userRepo');
const activityRepo = require('../repositories/activityRepo');
const bcrypt = require('bcrypt');

module.exports = {
  getUsers: async (user) => {
    let result;
    if (user.role === 'admin') {
      result = await userRepo.findAll();
      result = result.filter(u => u.is_active !== false);
    } else {
      const u = await userRepo.findById(user.id);
      result = [u];
    }
    return result;
  },
  
  createUser: async (userData) => {
    const hash = await bcrypt.hash(userData.password, 10);
    const user = { ...userData, password_hash: hash };
    return await userRepo.create(user);
  },
  
  updateGroup: async (id, group_name, job_type) => {
    return await userRepo.updateGroup(id, group_name, job_type);
  },
  
  updateProfile: async (id, name, gender) => {
    return await userRepo.updateProfile(id, name, gender);
  },
  
  deactivateUser: async (adminId, targetId) => {
    await userRepo.deactivate(targetId);
    await activityRepo.log(adminId, 'Deactivate Intern', `Admin deactivated intern ${targetId}`);
  },
  
  resetPassword: async (adminId, targetId, newPassword) => {
    let isGenerated = false;
    let pwd = newPassword;
    if (!pwd || pwd.trim() === '') {
      pwd = Math.random().toString(36).slice(-8);
      isGenerated = true;
    }
    const hash = await bcrypt.hash(pwd, 10);
    await userRepo.updatePassword(targetId, hash, 0, true);
    await activityRepo.log(adminId, 'Reset Password', `Admin reset password for user ${targetId}`);
    
    return { tempPassword: isGenerated ? pwd : null };
  }
};
