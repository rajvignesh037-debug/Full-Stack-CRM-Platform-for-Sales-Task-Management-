const leadRepo = require('../repositories/leadRepo');
const userRepo = require('../repositories/userRepo');
const activityRepo = require('../repositories/activityRepo');
const { runTransaction } = require('../config/db');

module.exports = {
  getLeads: async (user) => {
    let rows;
    if (user.role === 'admin') {
      rows = await leadRepo.findAll();
    } else {
      rows = await leadRepo.findByUser(user.id);
    }
    // FIX: Mandatory Debugging
    console.log("Assigned Leads Data:", rows);
    return rows;
  },
  
  updateLead: async (id, leadData) => {
    // FIX 10: Mandatory Debugging
    console.log("Updating lead:", id, leadData);

    const existingLead = await leadRepo.findById(id);
    if (!existingLead) return null;

    // FIX 2: Data integrity fallback
    leadData.city = leadData.city ?? existingLead.city;
    leadData.location = leadData.location ?? existingLead.location;
    leadData.email = leadData.email ?? existingLead.email;
    leadData.contact = leadData.contact ?? existingLead.contact;
    leadData.status = leadData.status ?? existingLead.status;
    leadData.plan_value = leadData.plan_value ?? existingLead.plan_value;
    leadData.duration = leadData.duration ?? existingLead.duration;

    return await leadRepo.update(id, leadData);
  },
  
  deleteLead: async (id) => {
    await leadRepo.delete(id);
  },
  
  uploadLeads: async (userId, leads, group, internId) => {
    return await runTransaction(async (client) => {
      let interns = [];
      if (internId) {
        interns = await userRepo.findActiveIntern(internId);
      } else {
        interns = await userRepo.findInternsByGroup(group);
      }
      
      let insertedLeads = 0;
      let currInternIdx = 0;

      for (const data of leads) {

      // name mandatory
      if (!data.name) continue;

      // fallback values
      data.contact = data.contact || "No Contact";
      data.email = data.email || "No Website";
      data.location = data.location || "";
      data.city = data.city || "";

      let assigned_to_id = null;

      if (interns.length > 0) {
        assigned_to_id = interns[currInternIdx].id;
        currInternIdx = (currInternIdx + 1) % interns.length;
      }

      await client.query(
        `INSERT INTO leads 
        (name, contact, email, location, city, assigned_to_id, status) 
        VALUES ($1, $2, $3, $4, $5, $6, 'Not Contacted')`,
        [
          String(data.name || "").trim().slice(0, 100),
          String(data.contact || "").trim().slice(0, 100),
          String(data.email || "").trim().slice(0, 255),
          String(data.location || "").trim().slice(0, 100),
          String(data.city || "").trim().slice(0, 100),
          assigned_to_id
        ]
      );

      insertedLeads++;
    }

      await activityRepo.log(userId, 'Leads Uploaded', `Uploaded ${insertedLeads} leads`, client);
      if (interns.length > 0) {
        await activityRepo.log(userId, 'Leads Assigned', `Auto-assigned ${insertedLeads} leads sequentially`, client);
      }
      return { insertedLeads, assignedInterns: interns.map(i => i.name) };
    });
  },
  
  assignLeads: async (userId, group, leadIds) => {
    const interns = await userRepo.findInternsByGroup(group);
    if(interns.length === 0) return { error: 'No active interns found in that group' };

    let currInternIdx = 0;
    for (const leadId of leadIds) {
      const assigned_to_id = interns[currInternIdx].id;
      await leadRepo.updateAssignee(leadId, assigned_to_id);
      currInternIdx = (currInternIdx + 1) % interns.length;
    }

    await activityRepo.log(userId, 'Leads Assigned', `Assigned ${leadIds.length} leads to group ${group}`);
    return { success: true };
  }
};
