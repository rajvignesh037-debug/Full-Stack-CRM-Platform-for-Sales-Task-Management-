const userRepo = require('../repositories/userRepo');
const activityRepo = require('../repositories/activityRepo');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_12345';

module.exports = {
  login: async (email, password) => {
    console.log(`[AuthService] Attempting login for: ${email}`);
    const user = await userRepo.findByEmail(email);
    
    if (!user) {
      console.log(`[AuthService] Login failed: User with email ${email} not found.`);
      throw new Error('User not found');
    }
    
    if (user.is_active === false) {
      console.log(`[AuthService] Login failed: Account disabled for ${email}.`);
      throw new Error('Your account has been disabled. Please contact admin.');
    }

    console.log(`[AuthService] User found. Comparing passwords...`);
    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
      console.log(`[AuthService] Login failed: Incorrect password for ${email}.`);
      throw new Error('Incorrect password');
    }

    console.log(`[AuthService] Login successful for: ${email}`);
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, account_id: user.account_id, gender: user.gender, force_password_change: user.force_password_change },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    await activityRepo.log(user.id, 'Login', 'User logged in');

    return {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, account_id: user.account_id, group_name: user.group_name, password_attempts: user.password_attempts || 0, gender: user.gender, force_password_change: user.force_password_change }
    };
  },
  
  verifyUser: async (id) => {
    const user = await userRepo.findById(id);
    if (!user) throw new Error('User not found');
    if (user.is_active === false) throw new Error('Your account has been disabled. Please contact admin.');
    return user;
  },
  
  logout: async (userId) => {
    await activityRepo.log(userId, 'Logout', 'User logged out');
  },
  
  changePassword: async (userId, newPassword) => {
    const user = await userRepo.findById(userId);
    if (!user) throw new Error('User not found');
    
    const attempts = user.password_attempts || 0;
    if (attempts >= 2) throw new Error('Maximum password changes exceeded.');

    const pwdHash = await bcrypt.hash(newPassword, 10);
    await userRepo.updatePassword(userId, pwdHash, attempts + 1, false);
    await activityRepo.log(userId, 'Change Password', 'Intern changed their password');
    
    return 2 - (attempts + 1);
  }
};
