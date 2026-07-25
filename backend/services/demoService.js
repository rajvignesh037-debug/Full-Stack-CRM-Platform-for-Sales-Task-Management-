const demoRepo = require('../repositories/demoRepo');
const leadRepo = require('../repositories/leadRepo');
const activityRepo = require('../repositories/activityRepo');
const { runTransaction } = require('../config/db');
const notificationService = require('./notificationService');

module.exports = {
  getDemos: async (user) => {
    if (user.role === 'admin') {
      return await demoRepo.findAll();
    } else {
      return await demoRepo.findByIntern(user.id);
    }
  },
  
  createDemo: async (intern_id, lead_id, date, time, userName) => {
    // FIX 10: Mandatory Debugging
    console.log("Creating demo:", {
      lead_id,
      intern_id,
      date,
      time
    });

    const leadCheck = await leadRepo.findById(lead_id);
    if (!leadCheck) {
      throw new Error('Lead not found');
    }

    // FIX 7: Backend Validation
    const existing = await demoRepo.findByLeadAndIntern(lead_id, intern_id);
    if (existing) {
      throw new Error("Demo already scheduled for this lead");
    }
    
    return await runTransaction(async (client) => {
      const demo = await demoRepo.create({ lead_id, intern_id, date, time }, client);
      await client.query('UPDATE leads SET status = $1 WHERE id = $2', ['Demo Scheduled', lead_id]);
      await activityRepo.log(intern_id, 'Demo Scheduled', `Scheduled demo for lead ${lead_id}`, client);
      
      // Create global inbox notification for Admin
      await notificationService.createNotification({
        type: 'demo_scheduled',
        demo_id: demo.id,
        sender_id: intern_id,
        receiver_role: 'admin',
        title: 'New Demo Scheduled',
        message: `${userName || 'Intern'} scheduled a new demo for lead ${leadCheck.name} at ${time} on ${date}.`
      }, client);

      // Create notification for Intern as well (as requested)
      await notificationService.createNotification({
        type: 'demo_scheduled',
        demo_id: demo.id,
        sender_id: null, // System notification
        receiver_id: intern_id, // I need to add receiver_id to notifications or use a role/id system
        receiver_role: 'intern',
        title: 'Demo Scheduled Successfully',
        message: `Your demo for ${leadCheck.name} on ${date} at ${time} is confirmed.`
      }, client);

      return demo;
    });
  },
  
  updateDemo: async (userId, id, date, time, userName) => {
    const demo = await demoRepo.findById(id);
    if (!demo) return null;
    
    const result = await demoRepo.update(id, { date, time });
    if (result) {
      await activityRepo.log(userId, 'Demo Updated', `Updated demo ${id} to ${date} ${time}`);
      
      // Notify Intern
      await notificationService.createNotification({
        type: 'demo_updated',
        demo_id: id,
        sender_id: userId,
        receiver_id: demo.intern_id,
        receiver_role: 'intern',
        title: 'Demo Schedule Updated',
        message: `Admin ${userName || ''} updated your demo (ID: ${id}) to ${date} at ${time}.`
      });
    }
    return result;
  },
  
  convertDemo: async (userId, id, status, plan_value, duration, userName) => {
    const demo = await demoRepo.findById(id);
    if (!demo) throw new Error('Demo not found');
    
    const lead_id = demo.lead_id;
    if (!lead_id) throw new Error('Lead not found for this demo');

    return await runTransaction(async (client) => {
      const leadRes = await client.query(
          'UPDATE leads SET status = $1, plan_value = $2, duration = $3 WHERE id = $4 RETURNING *',
          [status, plan_value, duration, lead_id]
      );
      
      if (leadRes.rows.length === 0) throw new Error('Lead update failed');
      
      const demoRes = await client.query('UPDATE demos SET status = $1 WHERE id = $2 RETURNING *', ['Completed', id]);
      await activityRepo.log(userId, 'Demo Converted', `Converted demo ${id} to ${status} with plan ₹${plan_value} for ${duration} months`, client);
      
      // Notify Intern
      await notificationService.createNotification({
        type: 'demo_converted',
        demo_id: id,
        sender_id: userId,
        receiver_id: demo.intern_id,
        receiver_role: 'intern',
        title: 'Demo Converted!',
        message: `Your demo for ${leadRes.rows[0].name} has been converted to ${status} by Admin ${userName || ''}. Great job!`
      }, client);

      // Notify Admin (optional, but good for consistency)
      await notificationService.createNotification({
        type: 'demo_converted',
        demo_id: id,
        sender_id: userId,
        receiver_role: 'admin',
        title: 'Demo Converted',
        message: `Demo for ${leadRes.rows[0].name} converted to ${status} by admin.`
      }, client);

      return { lead: leadRes.rows[0], demo: demoRes.rows[0] };
    });
  },

  updatePlan: async (userId, id, plan_value, duration, userName) => {
    const demo = await demoRepo.findById(id);
    if (!demo) throw new Error('Demo not found');
    
    return await runTransaction(async (client) => {
      await client.query(
        'UPDATE leads SET plan_value = $1, duration = $2 WHERE id = $3',
        [plan_value, duration, demo.lead_id]
      );
      await activityRepo.log(userId, 'Plan Updated', `Updated plan for demo ${id} to ₹${plan_value} for ${duration} months`, client);
      
      // Notify Intern
      await notificationService.createNotification({
        type: 'demo_plan_updated',
        demo_id: id,
        sender_id: userId,
        receiver_id: demo.intern_id,
        receiver_role: 'intern',
        title: 'Demo Plan Updated',
        message: `Admin ${userName || ''} updated the plan for your demo (Lead ID: ${demo.lead_id}) to ₹${plan_value}.`
      }, client);

      return { success: true };
    });
  },
  
  updateFeedback: async (userId, id, feedback, userName) => {
    const demo = await demoRepo.findById(id);
    if (!demo) return null;

    const result = await demoRepo.updateFeedback(id, feedback);
    if (result) {
      await activityRepo.log(userId, 'Demo Feedback', `Added feedback for demo ${id}`);
      
      const lead = await leadRepo.findById(demo.lead_id);
      const isIntern = userId === demo.intern_id;

      if (isIntern) {
        // Intern added feedback -> Notify Admin
        await notificationService.createNotification({
          type: 'demo_feedback',
          demo_id: id,
          sender_id: userId,
          receiver_role: 'admin',
          title: 'Intern Feedback Added',
          message: `${userName || 'Intern'} added feedback for ${lead?.name || 'Client'}.`
        });
      } else {
        // Admin added feedback -> Notify Intern
        await notificationService.createNotification({
          type: 'demo_feedback',
          demo_id: id,
          sender_id: userId,
          receiver_id: demo.intern_id,
          receiver_role: 'intern',
          title: 'New Demo Feedback',
          message: `Admin ${userName || ''} provided feedback on your demo (ID: ${id}).`
        });
      }
    }
    return result;
  }
};
