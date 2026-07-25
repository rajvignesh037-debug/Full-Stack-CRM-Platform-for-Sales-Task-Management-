import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { user, setUser, interns, setInterns, fetchAllData } = useAppContext();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const attemptsLeft = user?.password_attempts !== undefined ? Math.max(0, 2 - user.password_attempts) : 2;
  const isPasswordDisabled = attemptsLeft <= 0;

  const avatars = [
      "https://api.dicebear.com/7.x/notionists/svg?seed=avatar1",
      "https://api.dicebear.com/7.x/notionists/svg?seed=avatar2",
      "https://api.dicebear.com/7.x/notionists/svg?seed=avatar3",
      "https://api.dicebear.com/7.x/notionists/svg?seed=avatar4"
  ];

  const handleSave = async () => {
      try {
          const profileRes = await fetch(`http://localhost:5000/api/users/${user.id}/profile`, {
              method: 'PUT',
              headers: { 
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${localStorage.getItem('token')}` 
              },
              body: JSON.stringify({ name, gender })
          });
          
          if (profileRes.ok) {
              await fetchAllData();
              alert('Profile updated and synced successfully!');
          } else {
              const errData = await profileRes.json();
              alert(`Failed to update: ${errData.message || 'Server error'}`);
          }
      } catch (err) {
          console.error(err);
          alert('Sync failed. Please check your connection.');
      }
  };

  const handleChangePassword = async (e) => {
      e.preventDefault();
      if (!newPassword || newPassword.length < 8) return alert('Password must be at least 8 characters.');
      if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) return alert('Password must contain letters and numbers.');
      if (newPassword !== confirmPassword) return alert('Passwords do not match.');
      
      try {
         const res = await fetch('http://localhost:5000/api/auth/change-password', {
             method: 'POST',
             headers: {
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${localStorage.getItem('token')}`
             },
             body: JSON.stringify({ newPassword })
         });
         const data = await res.json();
         if (!res.ok) throw new Error(data.error);
         
         alert(`Password changed successfully! Attempts remaining: ${data.remaining_attempts}`);
         setNewPassword('');
         setConfirmPassword('');
         
         // Sync user state
         try {
             const verifyRes = await fetch('http://localhost:5000/api/auth/verify', {
                 headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
             });
             const verifyData = await verifyRes.json();
             if (verifyRes.ok && verifyData.valid) {
                 setUser(prev => ({ ...prev, ...verifyData.user }));
             }
         } catch (err) {
             console.error(err);
         }
      } catch (err) {
         alert(`Error: ${err.message}`);
      }
  };

  const handleLogout = () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
      navigate('/');
  };

  return (
      <div className="max-w-2xl mx-auto space-y-6">
         <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
         
         <div className="bg-white shadow-sm rounded-2xl border border-gray-100 p-6 space-y-6">
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-3">Avatar Selection</label>
               <div className="flex gap-4">
                  {avatars.map(a => (
                      <div 
                         key={a} 
                         onClick={() => setAvatar(a)}
                         className={`w-16 h-16 rounded-full cursor-pointer flex-shrink-0 overflow-hidden border-4 transition-all ${avatar === a ? 'border-indigo-500 scale-110' : 'border-transparent hover:border-gray-200'}`}
                      >
                          <img src={a} alt="avatar" className="w-full h-full object-cover bg-indigo-50" />
                      </div>
                  ))}
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                   <input 
                      type="text" 
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500"
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Email (Read Only)</label>
                   <input 
                      type="email" 
                      readOnly
                      value={user?.email || ''}
                      className="w-full border border-gray-200 bg-gray-50 text-gray-500 rounded-xl px-3 py-2 text-sm cursor-not-allowed outline-none"
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                   <select 
                      value={gender}
                      onChange={e => setGender(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 bg-white"
                   >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Account ID (Read Only)</label>
                   <input 
                      type="text" 
                      readOnly
                      value={user?.accountId || 'N/A'}
                      className="w-full border border-gray-200 bg-gray-50 text-gray-500 rounded-xl px-3 py-2 text-sm cursor-not-allowed outline-none font-mono"
                   />
                </div>
            </div>
            
            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                <button onClick={handleLogout} className="text-red-500 hover:text-red-700 font-medium text-sm transition-colors border border-red-100 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100">Logout of account</button>
                <button onClick={handleSave} className="bg-indigo-600 text-white rounded-xl px-6 py-2 text-sm font-medium hover:bg-indigo-700 transition shadow-sm">Save Profile Changes</button>
            </div>
         </div>

         {user?.role === 'intern' && (
         <div className="bg-white shadow-sm rounded-2xl border border-gray-100 p-6 space-y-4">
            <div className="border-b border-gray-100 pb-2 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Security</h2>
                <span className={`text-sm font-medium ${attemptsLeft > 0 ? 'text-indigo-600' : 'text-red-500'}`}>
                    Attempts remaining: {attemptsLeft}
                </span>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                   <input 
                      type="password" 
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 chars, letters + numbers"
                      required
                      disabled={isPasswordDisabled}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                   <input 
                      type="password" 
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      required
                      disabled={isPasswordDisabled}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                   />
                </div>
                <button 
                  type="submit" 
                  disabled={isPasswordDisabled}
                  className="bg-indigo-600 text-white rounded-xl px-6 py-2 text-sm font-medium hover:bg-indigo-700 transition shadow-sm disabled:bg-indigo-300 disabled:cursor-not-allowed"
                >
                   Update Password
                </button>
            </form>
         </div>
         )}
      </div>
  )
}
