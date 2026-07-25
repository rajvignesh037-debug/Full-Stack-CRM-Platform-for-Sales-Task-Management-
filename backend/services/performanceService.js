const { pool } = require('../config/db');

module.exports = {
  getPerformance: async () => {
    const query = `
      SELECT 
        u.id as intern_id,
        u.name as intern_name,
        u.group_name,
        u.job_type,
        COUNT(l.id) as total_leads,
        SUM(CASE WHEN l.status != 'Not Contacted' THEN 1 ELSE 0 END) as contacted_leads,
        SUM(CASE WHEN l.status = 'Demo Scheduled' THEN 1 ELSE 0 END) as demo_scheduled,
        SUM(CASE WHEN l.status = 'Converted' THEN 1 ELSE 0 END) as converted_leads,
        SUM(CASE WHEN l.status = 'Converted' THEN COALESCE(l.plan_value * l.duration, 0) ELSE 0 END) as total_revenue
      FROM users u
      LEFT JOIN leads l ON u.id = l.assigned_to_id
      WHERE u.role = 'intern' AND u.is_active = true
      GROUP BY u.id, u.name, u.group_name, u.job_type
    `;
    const res = await pool.query(query);
    
    return res.rows.map(row => {
      const scheduled = parseInt(row.demo_scheduled) || 0;
      const converted = parseInt(row.converted_leads) || 0;
      const contacted = parseInt(row.contacted_leads) || 0;

      const totalDemos = scheduled + converted;

      const conversion_rate =
        contacted > 0
          ? ((totalDemos / contacted) * 100).toFixed(2)
          : '0.00';

      return {
        ...row,
        total_leads: parseInt(row.total_leads) || 0,
        contacted_leads: contacted,
        demo_scheduled: totalDemos,
        converted_leads: converted,
        conversion_rate: parseFloat(conversion_rate),
        total_revenue: parseFloat(row.total_revenue) || 0
      };
    }).sort((a, b) => b.demo_scheduled - a.demo_scheduled);
  }
};
