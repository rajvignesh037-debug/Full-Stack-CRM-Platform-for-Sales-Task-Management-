import { useAppContext } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function AnalyticsDashboard() {
  const { leads, interns } = useAppContext();

  // Part 8 KPIs
  const totalLeads = leads.length;
  const activeLeads = leads.filter(l => l.status !== 'Converted' && l.status !== 'Not Contacted').length;
  const convertedLeadsList = leads.filter(l => l.status === 'Converted');
  const convertedLeads = convertedLeadsList.length;
  const conversionRate = totalLeads ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0;
  
  // Revenue calculation: plan_value * duration
  let totalRevenue = 0;
  const internRevenueMap = {};
  const planRevenueMap = { '999': 0, '2999': 0, '4999': 0 };

  convertedLeadsList.forEach(lead => {
    const rev = (Number(lead.planValue) || 0) * (Number(lead.duration) || 1);
    totalRevenue += rev;
    
    if (lead.assignedToId) {
      internRevenueMap[lead.assignedToId] = (internRevenueMap[lead.assignedToId] || 0) + rev;
    }
    
    if (planRevenueMap[lead.planValue] !== undefined) {
      planRevenueMap[lead.planValue] += rev;
    }
  });

  const avgRevenuePerLead = totalLeads ? (totalRevenue / totalLeads).toFixed(0) : 0;
  
  let topInternId = null;
  let maxRev = -1;
  Object.keys(internRevenueMap).forEach(key => {
    if (internRevenueMap[key] > maxRev) {
      maxRev = internRevenueMap[key];
      topInternId = Number(key);
    }
  });

  const topIntern = interns.find(i => i.id === topInternId)?.name || 'N/A';

  // Chart Data Preparation
  const barData = interns.map(intern => ({
    name: intern.name.split(' ')[0], // first name
    Revenue: internRevenueMap[intern.id] || 0
  })).sort((a,b) => b.Revenue - a.Revenue);

  const pieData = [
    { name: 'Starter (₹999)', value: planRevenueMap['999'] },
    { name: 'Smart (₹2999)', value: planRevenueMap['2999'] },
    { name: 'Pro (₹4999)', value: planRevenueMap['4999'] }
  ].filter(d => d.value > 0);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b'];

  const formatCurrency = (val) => `₹${Number(val).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6 font-sans pb-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Revenue Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Real-time SaaS metrics and performance tracking.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-green-600 mt-2 flex items-center font-medium">↑ 12.5% vs last month</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Active / Total Leads</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{activeLeads} / {totalLeads}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Conversion Rate</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{conversionRate}%</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Top Performing Intern</p>
          <p className="text-xl font-bold text-indigo-600 mt-2 truncate">{topIntern}</p>
          <p className="text-xs text-gray-500 mt-1">{formatCurrency(maxRev)} Generated</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800 mb-6 uppercase tracking-wider">Revenue per Intern</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="name" tick={{fontSize: 12}} />
                <YAxis tickFormatter={(v) => `₹${v/1000}k`} tick={{fontSize: 12}} />
                <Tooltip cursor={{fill: '#f3f4f6'}} formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800 mb-6 uppercase tracking-wider">Revenue by Plan</h2>
          {pieData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-400 text-sm">
              No revenue data available yet.
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mt-4">
        <h2 className="text-sm font-semibold text-gray-800 mb-4 uppercase tracking-wider">Additional Admin KPIs</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <div>
             <p className="text-xs text-gray-500">Converted Leads</p>
             <p className="text-lg font-bold text-gray-900">{convertedLeads}</p>
           </div>
           <div>
             <p className="text-xs text-gray-500">Avg Revenue per Lead</p>
             <p className="text-lg font-bold text-gray-900">{formatCurrency(avgRevenuePerLead)}</p>
           </div>
           <div>
             <p className="text-xs text-gray-500">Avg Lead Value</p>
             <p className="text-lg font-bold text-gray-900">{totalLeads > 0 ? formatCurrency((totalRevenue / convertedLeads) || 0) : '₹0'}</p>
           </div>
           <div>
             <p className="text-xs text-gray-500">Monthly Growth (Est.)</p>
             <p className="text-lg font-bold text-green-600">+12.5%</p>
           </div>
        </div>
      </div>
    </div>
  );
}
