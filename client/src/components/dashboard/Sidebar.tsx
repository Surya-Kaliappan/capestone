import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, Settings, LogOut, Moon, Sun, Clock, Loader2, MessageSquare } from 'lucide-react';
import { useAppStore } from '../../store';
import { api } from '../../lib/api'; // Ensure you have this for logout API call

interface Contact {
  id: string;
  name: string;
  email: string;
  status: 'online' | 'offline' | 'busy';
  lastMessage?: string;
  lastMessageTime?: string;
}

interface SidebarProps {
  onlineUsers: Map<string, string>;
  recentContacts: Contact[];
  searchResults: Contact[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearching: boolean;
}

export default function Sidebar({ 
  onlineUsers, recentContacts, searchResults, 
  searchQuery, setSearchQuery, isSearching 
}: SidebarProps) {
  
  const { 
    currentUser, selectedChatUser, setSelectedChatUser, 
    theme, toggleTheme, timeFormat, toggleTimeFormat, logout 
  } = useAppStore();
  
  const isDark = theme === 'dark';
  const displayContacts = searchQuery ? searchResults : recentContacts;
  
  // Settings Menu State
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close settings if clicked outside
  useEffect(() => {
    function handleClickOutside(event: any) {
        if (settingsRef.current && !settingsRef.current.contains(event.target)) {
            setShowSettings(false);
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Helper to format time for the list (Respects 12h/24h)
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: timeFormat === '12h'
    });
  };

  const handleLogout = async () => {
    try {
        await api.post('/auth/logout'); // Optional: Clear cookie on server
    } catch(e) { 
        console.log("Logout cleanup failed", e); 
    } finally {
        logout(); // Clear client state
    }
  };

  return (
    <aside className={`flex flex-col border-r transition-all duration-300 z-20
        ${isDark ? 'border-slate-800 bg-[#1e293b]/60 backdrop-blur-xl' : 'border-slate-200 bg-white'}
        ${selectedChatUser ? 'hidden md:flex' : 'w-full flex'} md:w-80 lg:w-96
    `}>
      {/* Header */}
      <div className={`h-16 md:h-20 flex flex-col justify-center px-4 md:px-6 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
        <div className="flex items-center gap-2 md:gap-3">
           <div className="w-8 h-8 md:w-9 md:h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
             <FileText size={20} className="text-white" />
           </div>
           <div>
             <h1 className={`font-bold text-base md:text-lg tracking-tight leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
               Secure<span className="text-primary">Agreements</span>
             </h1>
           </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 md:p-4 pb-2">
        <div className={`flex items-center gap-2 px-3 py-2 md:py-2.5 rounded-xl border transition-all
           ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}
        `}>
           <Search size={14} className="opacity-50" />
           <input 
             type="text" 
             placeholder="Search contacts..." 
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="bg-transparent text-sm w-full focus:outline-none placeholder:opacity-50"
           />
           {isSearching && <Loader2 size={14} className="animate-spin opacity-50"/>}
        </div>
      </div>

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto p-2 md:p-3 space-y-1">
         {displayContacts.length === 0 && (
            <div className="p-8 text-center opacity-40 text-xs flex flex-col items-center">
              <MessageSquare size={32} className="mb-2 opacity-50"/>
              {searchQuery ? "No users found." : "No recent chats."}
            </div>
         )}
         
         {displayContacts.map((user) => {
           const isOnline = onlineUsers.has(user.id);
           const status = isOnline ? onlineUsers.get(user.id) : 'offline';

           return (
             <motion.button 
               whileTap={{ scale: 0.98 }}
               key={user.id} 
               onClick={() => setSelectedChatUser(user as any)}
               className={`w-full flex items-center gap-3 md:gap-4 p-2.5 md:p-3 rounded-xl transition-all text-left border relative group
                 ${selectedChatUser?.id === user.id 
                    ? 'bg-primary/10 border-primary/50' 
                    : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'}
               `}
             >
               <div className="relative shrink-0">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white font-bold text-sm md:text-lg shadow-md bg-primary`}>
                    {user.name[0]}
                  </div>
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 md:w-3.5 md:h-3.5 border-2 rounded-full
                     ${isDark ? 'border-slate-800' : 'border-white'}
                     ${status === 'online' ? 'bg-emerald-500' : status === 'busy' ? 'bg-amber-500' : 'bg-slate-400'}
                  `}></span>
               </div>
               <div className="flex-1 min-w-0">
                 <div className="flex justify-between items-center mb-0.5">
                   <span className={`font-semibold text-sm md:text-base truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{user.name}</span>
                   {user.lastMessageTime && (
                     <span className="text-[10px] opacity-40">
                       {formatTime(user.lastMessageTime)}
                     </span>
                   )}
                 </div>
                 <div className="text-xs md:text-sm opacity-60 truncate font-medium">
                    {user.lastMessage || user.email}
                 </div>
               </div>
             </motion.button>
           );
         })}
      </div>
      
      {/* Footer (With Settings Menu) */}
      <div className={`p-3 md:p-4 border-t flex items-center justify-between relative ${isDark ? 'border-slate-800 bg-slate-900/30' : 'border-slate-200 bg-slate-50'}`}>
           
           {/* Settings Popover */}
           <AnimatePresence>
             {showSettings && (
               <motion.div 
                 ref={settingsRef}
                 initial={{ opacity: 0, y: 10, scale: 0.95 }}
                 animate={{ opacity: 1, y: -50, scale: 1 }} // Moved up to float above footer
                 exit={{ opacity: 0, y: 10, scale: 0.95 }}
                 className={`absolute bottom-full right-4 w-56 mb-2 rounded-2xl shadow-2xl border backdrop-blur-xl overflow-hidden z-50
                    ${isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-slate-200'}
                 `}
               >
                 <div className="p-2 space-y-1">
                    {/* Theme Toggle */}
                    <button 
                      onClick={toggleTheme}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors text-sm font-medium
                        ${isDark ? 'hover:bg-white/10 text-slate-200' : 'hover:bg-slate-100 text-slate-700'}
                      `}
                    >
                      <span className="flex items-center gap-3">{isDark ? <Moon size={16}/> : <Sun size={16}/> } Theme</span>
                      <span className="text-xs opacity-50 uppercase">{theme}</span>
                    </button>

                    {/* Time Format Toggle */}
                    <button 
                      onClick={toggleTimeFormat}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors text-sm font-medium
                        ${isDark ? 'hover:bg-white/10 text-slate-200' : 'hover:bg-slate-100 text-slate-700'}
                      `}
                    >
                      <span className="flex items-center gap-3"><Clock size={16}/> Time Format</span>
                      <span className="text-xs opacity-50">{timeFormat}</span>
                    </button>

                    <div className={`h-px my-1 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />

                    {/* Logout */}
                    <button 
                      onClick={handleLogout}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium text-red-500
                        ${isDark ? 'hover:bg-red-500/10' : 'hover:bg-red-50'}
                      `}
                    >
                      <LogOut size={16}/> Log Out
                    </button>
                 </div>
               </motion.div>
             )}
           </AnimatePresence>

           {/* User Profile */}
           <div className="flex items-center gap-2 md:gap-3">
             <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-slate-700 flex items-center justify-center text-[10px] md:text-xs text-white shadow-md">
               {currentUser?.name[0]}
             </div>
             <div className="text-xs">
               <div className="font-bold">{currentUser?.name}</div>
               <div className="text-emerald-500">Connected</div>
             </div>
           </div>

           {/* Settings Trigger Button */}
           <button 
             onClick={() => setShowSettings(!showSettings)}
             className={`p-2.5 rounded-xl transition-all active:scale-95
               ${showSettings ? 'bg-primary text-white shadow-lg shadow-primary/30' : (isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-200 text-slate-500')}
             `}
           >
              <Settings size={20} />
           </button>
      </div>
    </aside>
  );
}