import { motion } from 'framer-motion';
import { Search, FileText, Sun, Moon, Loader2, MessageSquare } from 'lucide-react';
import { useAppStore } from '../../store';

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
  
  const { currentUser, selectedChatUser, setSelectedChatUser, theme, toggleTheme } = useAppStore();
  const isDark = theme === 'dark';
  const displayContacts = searchQuery ? searchResults : recentContacts;

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
                       {new Date(user.lastMessageTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
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
      
      {/* Footer */}
      <div className={`p-3 md:p-4 border-t flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-900/30' : 'border-slate-200 bg-slate-50'}`}>
           <div className="flex items-center gap-2 md:gap-3">
             <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-slate-700 flex items-center justify-center text-[10px] md:text-xs text-white">
               {currentUser?.name[0]}
             </div>
             <div className="text-xs">
               <div className="font-bold">{currentUser?.name}</div>
               <div className="text-emerald-500">Connected</div>
             </div>
           </div>
           <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition">
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
           </button>
      </div>
    </aside>
  );
}