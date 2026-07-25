const { pool } = require('../config/db');

module.exports = {
    getInternReport: async (user, filters = {}) => {
        if (user.role !== 'intern') {
            throw new Error('Only interns can access this');
        }

        const { range, week, month } = filters;
        let whereClause = 'WHERE assigned_to_id = $1';
        let params = [user.id];

        const IST_DATE = "(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date";
        const IST_TIMESTAMP = "(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')";

        if (range === 'today') {
            whereClause += ` AND DATE(created_at AT TIME ZONE 'Asia/Kolkata') = ${IST_DATE}`;
        } else if (range === 'week' && week) {
            whereClause += ` AND FLOOR((EXTRACT(DAY FROM (${IST_TIMESTAMP} - (created_at AT TIME ZONE 'Asia/Kolkata'))) / 7)) + 1 = $${params.length + 1}`;
            params.push(parseInt(week));
        } else if (range === 'month' && month) {
            whereClause += ` AND FLOOR((EXTRACT(DAY FROM (${IST_TIMESTAMP} - (created_at AT TIME ZONE 'Asia/Kolkata'))) / 30)) + 1 = $${params.length + 1}`;
            params.push(parseInt(month));
        }

        const query = `
      SELECT 
        COUNT(*) as total_leads,
        SUM(CASE WHEN status != 'Not Contacted' THEN 1 ELSE 0 END) as contacted_leads,
        SUM(CASE WHEN status = 'Demo Scheduled' THEN 1 ELSE 0 END) as demo_scheduled,
        SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) as converted_leads,
        SUM(CASE WHEN status = 'Converted' THEN COALESCE(plan_value * duration, 0) ELSE 0 END) as revenue
      FROM leads
      ${whereClause}
    `;

        const res = await pool.query(query, params);
        const data = res.rows[0];

        const scheduled = parseInt(data.demo_scheduled) || 0;
        const converted = parseInt(data.converted_leads) || 0;
        const contacted = parseInt(data.contacted_leads) || 0;

        const totalDemos = scheduled + converted;

        const conversion_rate =
            contacted > 0
                ? ((totalDemos / contacted) * 100).toFixed(2)
                : '0.00';

        return {
            total_leads: parseInt(data.total_leads) || 0,
            contacted_leads: contacted,
            demo_scheduled: totalDemos,
            converted_leads: converted,
            conversion_rate: parseFloat(conversion_rate),
            revenue: parseFloat(data.revenue) || 0
        };
    }
};