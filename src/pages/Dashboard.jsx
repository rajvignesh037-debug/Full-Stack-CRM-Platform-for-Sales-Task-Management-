import { useAppContext } from '../context/AppContext';

export default function Dashboard() {
  const { user, leads, demos, interns } = useAppContext();
  const isAdmin = user?.role === 'admin';

  const myLeads = isAdmin ? leads : leads.filter(l => l.assignedToId === user?.id);
  const myDemos = isAdmin ? demos : demos.filter(d => d.assignedToId === user?.id);

  const totalLeads = myLeads.filter(l => ["Follow-up Required", "Demo Scheduled", "Converted"].includes(l.status)).length;
  const totalDemos = myDemos.length;
  
  const closedDeals = myLeads.filter(l => l.status === "Converted");
  const closedDealsCount = closedDeals.length;
  
  const totalRevenue = closedDeals.reduce((sum, d) => sum + ((d.planValue || 0) * (d.duration || 0)), 0);
  const myProfit = totalRevenue * 0.02;
  const formattedRevenue = `₹${totalRevenue.toLocaleString()}`;
  const formattedProfit = `₹${myProfit.toLocaleString()}`;

  const getUserName = (id) => {
     if (id === 'admin') return 'Admin';
     const intern = interns.find(i => i.id === id);
     return intern ? intern.name : 'Unknown User';
  };

  let activities = [];

  myDemos.forEach(demo => {
    activities.push({
      id: `demo-${demo.id}`,
      user: getUserName(demo.assignedToId),
      action: "Demo Scheduled",
      target: demo.clientName,
      timestamp: new Date(demo.demoDate).getTime() || Date.now(),
      dateStr: new Date(demo.demoDate).toLocaleDateString()
    });
  });

  myLeads.filter(l => l.status === "Follow-up Required").forEach(lead => {
    activities.push({
      id: `follow-${lead.id}`,
      user: getUserName(lead.assignedToId),
      action: "Follow-up Required",
      target: lead.clientName,
      timestamp: new Date(lead.actionDate).getTime() || Date.now(),
      dateStr: new Date(lead.actionDate).toLocaleDateString()
    });
  });

  closedDeals.forEach(lead => {
    activities.push({
      id: `close-${lead.id}`,
      user: getUserName(lead.assignedToId),
      action: "Deal Closed",
      target: lead.clientName,
      timestamp: new Date(lead.actionDate).getTime() || Date.now(),
      dateStr: new Date(lead.actionDate).toLocaleDateString()
    });
  });

  activities = activities.sort((a,b) => b.timestamp - a.timestamp).slice(0, 10);

  const getIcon = (action) => {
    if (action === "Deal Closed") return <div className="p-2 bg-indigo-100 text-indigo-600 rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></div>;
    if (action === "Demo Scheduled") return <div className="p-2 bg-green-100 text-green-600 rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>;
    return <div className="p-2 bg-yellow-100 text-yellow-600 rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center">
            <p className="text-sm font-medium text-gray-500">Active Pipeline Leads</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{totalLeads}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6 flex flex-col justify-center">
            <p className="text-sm font-medium text-green-600">Total Demos</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{totalDemos}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 p-6 flex flex-col justify-center">
            <p className="text-sm font-medium text-indigo-600">Deals Closed</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{closedDealsCount}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-6 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 bg-purple-50 rounded-full opacity-50"></div>
            <p className="text-sm font-medium text-purple-600 relative z-10">{isAdmin ? 'Total Revenue Base' : 'Your Earnings (2%)'}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2 relative z-10">{isAdmin ? formattedRevenue : formattedProfit}</p>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
         <div className="px-6 py-5 border-b border-gray-100">
           <h3 className="text-lg font-semibold text-gray-900">Recent Tracking Logs</h3>
         </div>
         <div className="p-6">
           <div className="space-y-6">
             {activities.length > 0 ? activities.map((act) => (
                <div key={act.id} className="flex items-center gap-4">
                  {getIcon(act.action)}
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      <span className="font-semibold text-gray-800">{act.user}</span> deployed <span className="font-medium text-indigo-600">{act.action}</span> inside <span className="font-medium bg-gray-50 px-1 py-0.5 rounded-sm">{act.target}</span>.
                    </p>
                    <p className="text-xs text-gray-500">{act.dateStr}</p>
                  </div>
                </div>
             )) : (
                <p className="text-sm text-gray-500">No active tracking mappings to display.</p>
             )}
           </div>
         </div>
      </div>
    </div>
  )
}
