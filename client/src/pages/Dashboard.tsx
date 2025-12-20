// import { useState, useEffect, useMemo, useRef } from 'react';
// import { useAppStore } from '../store';
// import { useSocket } from '../context/SocketContext';
// import { motion, AnimatePresence } from 'framer-motion';
// import axios from 'axios';
// import EmojiPicker from 'emoji-picker-react'; // <--- NEW
// import { 
//   MessageSquare, FileText, User, Settings, Plus, X, Clock,
//   ArrowLeft, Search, Download, Moon, Sun, FileCheck, Send, Calendar, UserCheck, Loader2, Smile, Check, CheckCheck
// } from 'lucide-react';

// interface Message {
//   _id?: string;
//   tempId?: string;
//   sender: string;
//   content: string;
//   timestamp: string;
//   isSelf: boolean;
//   status: 'sending' | 'sent' | 'delivered' | 'read';
// }

// interface Contact {
//   id: string;
//   name: string;
//   email: string;
//   status: 'online' | 'offline' | 'busy';
//   lastMessage?: string;
//   lastMessageTime?: string;
//   unreadCount?: number; // Optional for future
// }

// export default function Dashboard() {
//   const { 
//     currentUser, 
//     selectedChatUser, setSelectedChatUser, 
//     isAgreementPanelOpen, toggleAgreementPanel,
//     theme, toggleTheme 
//   } = useAppStore();
  
//   const { socket, onlineUsers } = useSocket();
//   const [messages, setMessages] = useState<Message[]>([]);
//   const [inputMsg, setInputMsg] = useState('');
  
//   // Emoji State
//   const [showEmojiPicker, setShowEmojiPicker] = useState(false);
//   const emojiRef = useRef<any>(null);

//   // Contacts State
//   const [recentContacts, setRecentContacts] = useState<Contact[]>([]);
//   const [searchResults, setSearchResults] = useState<Contact[]>([]);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [isSearching, setIsSearching] = useState(false);

//   const isDark = theme === 'dark';
//   const scrollRef = useRef<HTMLDivElement>(null);

//   // --- HELPER: Mark Messages as Read ---
//   const markAsRead = async () => {
//     if (!selectedChatUser || !currentUser) return;
    
//     // 1. Notify Server (DB)
//     axios.post('http://localhost:3000/api/chat/mark-read', {
//         senderId: selectedChatUser.id,
//         recipientId: currentUser.id
//     }, { withCredentials: true });

//     // 2. Notify Sender via Socket (Live Update)
//     socket?.emit("messageStatusUpdate", {
//         messages: [], // We imply "all previous" for simplicity in V1
//         status: 'read',
//         senderId: selectedChatUser.id
//     });
//   };

//   useEffect(() => {
//     const delayDebounceFn = setTimeout(async () => {
//       if (searchQuery.trim().length > 0) {
//         setIsSearching(true);
//         try {
//           const res = await axios.get(`http://localhost:3000/api/users/search?query=${searchQuery}`, { withCredentials: true });
//           setSearchResults(res.data.users);
//         } catch (err) {
//           console.error("Search failed", err);
//         } finally {
//           setIsSearching(false);
//         }
//       } else {
//         setSearchResults([]);
//       }
//     }, 500);

//     return () => clearTimeout(delayDebounceFn);
//   }, [searchQuery]);

//   // --- 1. LOAD RECENT CONTACTS ---
//   useEffect(() => {
//     const fetchRecent = async () => {
//       try {
//         const res = await axios.get('http://localhost:3000/api/chat/recent-contacts', { withCredentials: true });
//         setRecentContacts(res.data.contacts);
//       } catch (err) { console.error("Failed to load contacts"); }
//     };
//     if (currentUser) fetchRecent();
//   }, [currentUser]);

//   // --- 2. FETCH HISTORY & MARK READ ---
//   useEffect(() => {
//     if (!selectedChatUser || !currentUser) return;

//     const fetchHistory = async () => {
//       try {
//         const res = await axios.get(`http://localhost:3000/api/chat/history`, {
//           params: { user1: currentUser.id, user2: selectedChatUser.id },
//           withCredentials: true
//         });
        
//         const formatted = res.data.messages.map((m: any) => ({
//           _id: m._id,
//           sender: m.sender,
//           content: m.content,
//           timestamp: m.timestamp,
//           status: m.status || 'read', // Default to read for old history
//           isSelf: m.sender === currentUser.id
//         }));
//         setMessages(formatted);
//         markAsRead(); // I am reading this now
//       } catch (err) {}
//     };
//     fetchHistory();

//     // SOCKET: Listen for Status Updates (The "Blue Tick" Magic)
//     const handleStatusUpdate = ({ status }: { status: 'delivered' | 'read' }) => {
//         setMessages(prev => prev.map(msg => 
//             msg.isSelf ? { ...msg, status } : msg
//         ));
//     };

//     socket?.on("messageStatusUpdated", handleStatusUpdate);
//     return () => { socket?.off("messageStatusUpdated", handleStatusUpdate); };

//   }, [selectedChatUser, currentUser, socket]);

//   // --- 3. SOCKET LISTENERS ---
//   useEffect(() => {
//     if (!socket) return;

//     const handleNewMessage = (newMsg: any) => {
//       const isChatOpen = selectedChatUser && (newMsg.senderId === selectedChatUser.id);
      
//       // If I am the receiver
//       if (isChatOpen || (newMsg.senderId === currentUser?.id)) {
//         setMessages((prev) => [...prev, {
//           sender: newMsg.senderId,
//           content: newMsg.message,
//           timestamp: newMsg.timestamp,
//           isSelf: newMsg.senderId === currentUser?.id,
//           status: isChatOpen ? 'read' : 'delivered' // If chat open, it's read instantly
//         }]);

//         // If I received it and chat is open, tell sender I read it
//         if (isChatOpen) {
//             socket.emit("messageStatusUpdate", {
//                 status: 'read',
//                 senderId: newMsg.senderId
//             });
//         }
//       }
      
//       // Update sidebar
//       axios.get('http://localhost:3000/api/chat/recent-contacts', { withCredentials: true })
//         .then(res => setRecentContacts(res.data.contacts));
//     };

//     socket.on("newMessage", handleNewMessage);
//     return () => { socket.off("newMessage", handleNewMessage); };
//   }, [socket, selectedChatUser, currentUser]);

//   // Auto-scroll to bottom
//   useEffect(() => {
//     if (scrollRef.current) {
//         scrollRef.current.scrollIntoView({ behavior: "smooth" });
//     }
//   }, [messages]);

//   // Handle Click Outside Emoji
//   useEffect(() => {
//     function handleClickOutside(event: any) {
//         if (emojiRef.current && !emojiRef.current.contains(event.target)) {
//             setShowEmojiPicker(false);
//         }
//     }
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);


//   const handleSendMessage = async () => {
//     if (!inputMsg.trim() || !selectedChatUser || !currentUser) return;
    
//     const tempId = Date.now().toString();
//     const content = inputMsg;
//     setInputMsg(""); // Clear immediately
//     setShowEmojiPicker(false);

//     // 1. OPTIMISTIC UI: Show "Clock" (Sending)
//     const optimisticMsg: Message = {
//         tempId,
//         sender: currentUser.id,
//         content,
//         timestamp: new Date().toISOString(),
//         isSelf: true,
//         status: 'sending' // <--- Clock Icon
//     };
//     setMessages(prev => [...prev, optimisticMsg]);

//     try {
//       // 2. API CALL
//       const res = await axios.post('http://localhost:3000/api/chat/send', {
//         sender: currentUser.id,
//         recipient: selectedChatUser.id,
//         content,
//         status: 'sent'
//       }, { withCredentials: true });

//       // 3. SOCKET EMIT (To Receiver)
//       socket?.emit("sendMessage", { 
//           recipientId: selectedChatUser.id, 
//           message: content 
//       });

//       // 4. UPDATE STATUS: Sending -> Sent (Single Tick)
//       setMessages(prev => prev.map(m => 
//           m.tempId === tempId 
//             ? { ...m, status: 'sent', _id: res.data.data._id } 
//             : m
//       ));

//     } catch (err) {
//       console.error("Send failed");
//       // Add error handling here (e.g., status: 'failed')
//     }
//   };

//   const handleAddEmoji = (emojiObject: any) => {
//     setInputMsg((prev) => prev + emojiObject.emoji);
//   };

//   const displayContacts = searchQuery ? searchResults : recentContacts;

//   // Drafting State
//   const [isDrafting, setIsDrafting] = useState(false);
//   const [draftContent, setDraftContent] = useState('');
//   const [draftTitle, setDraftTitle] = useState('');
//   const draftId = useMemo(() => Math.floor(1000 + Math.random() * 9000), [isDrafting]);

//   return (
//     <div className={`flex h-screen w-full overflow-hidden font-sans relative transition-colors duration-300
//       ${isDark ? 'bg-[rgb(var(--bg-dark))] text-slate-200' : 'bg-[rgb(var(--bg-light))] text-slate-800'}
//     `}>
      
//       {/* SIDEBAR (Keep existing sidebar code) */}
//       <aside className={`flex flex-col border-r transition-all duration-300 z-20
//           ${isDark ? 'border-slate-800 bg-[#1e293b]/60 backdrop-blur-xl' : 'border-slate-200 bg-white'}
//           ${selectedChatUser ? 'hidden md:flex' : 'w-full flex'} md:w-80 lg:w-96
//       `}>
//         {/* Header */}
//         <div className={`h-16 md:h-20 flex flex-col justify-center px-4 md:px-6 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
//           <div className="flex items-center gap-2 md:gap-3">
//              <div className="w-8 h-8 md:w-9 md:h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
//                <FileText size={20} className="text-white" />
//              </div>
//              <div>
//                <h1 className={`font-bold text-base md:text-lg tracking-tight leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
//                  Secure<span className="text-primary">Agreements</span>
//                </h1>
//              </div>
//           </div>
//         </div>

//         {/* Search */}
//         <div className="p-3 md:p-4 pb-2">
//           <div className={`flex items-center gap-2 px-3 py-2 md:py-2.5 rounded-xl border transition-all
//              ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}
//           `}>
//              <Search size={14} className="opacity-50" />
//              <input 
//                type="text" 
//                placeholder="Search..." 
//                value={searchQuery}
//                onChange={(e) => setSearchQuery(e.target.value)}
//                className="bg-transparent text-sm w-full focus:outline-none placeholder:opacity-50"
//              />
//           </div>
//         </div>

//         {/* List */}
//         <div className="flex-1 overflow-y-auto p-2 md:p-3 space-y-1">
//            {displayContacts.map((user) => {
//              const isOnline = onlineUsers.has(user.id);
//              return (
//                <motion.button 
//                  whileTap={{ scale: 0.98 }}
//                  key={user.id} 
//                  onClick={() => setSelectedChatUser(user as any)}
//                  className={`w-full flex items-center gap-3 md:gap-4 p-2.5 md:p-3 rounded-xl transition-all text-left border relative group
//                    ${selectedChatUser?.id === user.id 
//                       ? 'bg-primary/10 border-primary/50' 
//                       : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'}
//                  `}
//                >
//                  <div className="relative shrink-0">
//                     <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white font-bold text-sm md:text-lg shadow-md bg-primary`}>
//                       {user.name[0]}
//                     </div>
//                     {isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 border-2 border-white dark:border-slate-800 bg-emerald-500 rounded-full"></span>}
//                  </div>
//                  <div className="flex-1 min-w-0">
//                    <div className="flex justify-between items-center mb-0.5">
//                      <span className={`font-semibold text-sm md:text-base truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{user.name}</span>
//                      {user.lastMessageTime && (
//                        <span className="text-[10px] opacity-40">
//                          {new Date(user.lastMessageTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
//                        </span>
//                      )}
//                    </div>
//                    <div className="text-xs md:text-sm opacity-60 truncate font-medium">
//                       {user.lastMessage || user.email}
//                    </div>
//                  </div>
//                </motion.button>
//              );
//            })}
//         </div>
        
//         {/* Footer */}
//         <div className={`p-3 md:p-4 border-t flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-900/30' : 'border-slate-200 bg-slate-50'}`}>
//              <div className="flex items-center gap-2">
//                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white">{currentUser?.name[0]}</div>
//                <div className="text-xs font-bold">{currentUser?.name}</div>
//              </div>
//              <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10">
//                 {isDark ? <Sun size={16} /> : <Moon size={16} />}
//              </button>
//         </div>
//       </aside>

//       {/* MAIN CHAT */}
//       <main className={`flex-1 flex flex-col min-w-0 relative z-10 transition-all ${!selectedChatUser ? 'hidden md:flex' : 'flex'}`}>
//         {selectedChatUser ? (
//           <>
//             <header className={`h-16 md:h-20 border-b flex items-center justify-between px-4 md:px-6 backdrop-blur-md sticky top-0 z-10
//                ${isDark ? 'border-slate-800 bg-[rgb(var(--bg-dark))]/90' : 'border-slate-200 bg-white/90'}
//             `}>
//               <div className="flex items-center gap-3">
//                  <button onClick={() => setSelectedChatUser(null)} className="md:hidden p-2 -ml-2 opacity-60"><ArrowLeft size={20} /></button>
//                  <div>
//                     <h2 className={`font-bold text-sm md:text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedChatUser.name}</h2>
//                     <p className="text-[10px] md:text-xs text-primary font-medium">
//                        {onlineUsers.has(selectedChatUser.id) ? 'Online' : 'Offline'}
//                     </p>
//                  </div>
//               </div>
//               <button 
//                   onClick={() => toggleAgreementPanel(!isAgreementPanelOpen)}
//                   className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all border shadow-sm
//                     ${isAgreementPanelOpen 
//                         ? 'bg-primary text-white border-primary' 
//                         : isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}
//                   `}
//               >
//                   <FileText size={16} />
//                   <span>Agreements</span>
//               </button>
//             </header>

//             {/* CHAT MESSAGES AREA (WhatsApp Style) */}
//             <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-pattern scrollbar-hide">
//                {messages.map((msg, idx) => (
//                   <div key={idx} className={`flex w-full ${msg.isSelf ? 'justify-end' : 'justify-start'}`}>
//                      <div 
//                         className={`relative px-3 py-2 max-w-[80%] md:max-w-[60%] rounded-2xl shadow-sm text-sm break-words
//                            ${msg.isSelf 
//                               ? 'bg-primary text-white rounded-tr-none' // SELF: Theme Blue
//                               : (isDark ? 'bg-slate-800 text-slate-100' : 'bg-white text-slate-900') + ' rounded-tl-none border border-black/5 dark:border-white/10' // OTHER: Slate/White
//                            }
//                         `}
//                      >
//                         <span className="leading-relaxed">{msg.content}</span>
                        
//                         {/* TIMESTAMP & STATUS ICONS */}
//                         <div className={`text-[10px] flex items-center justify-end gap-1 float-right mt-2 ml-3 select-none ${msg.isSelf ? 'text-white/70' : 'opacity-50'}`}>
//                            <span>{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                           
//                            {/* THE STATUS LOGIC */}
//                            {msg.isSelf && (
//                               <span className="ml-0.5">
//                                  {msg.status === 'sending' && <Clock size={12} className="animate-pulse" />}
//                                  {msg.status === 'sent' && <Check size={14} />}
//                                  {msg.status === 'delivered' && <CheckCheck size={14} />} 
//                                  {msg.status === 'read' && <CheckCheck size={14} className="text-blue-200" style={{ filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.5))' }} />} 
//                               </span>
//                            )}
//                         </div>
//                      </div>
//                   </div>
//                ))}
//                <div ref={scrollRef} />
//             </div>

//             {/* INPUT AREA */}
//             <div className={`p-3 md:p-4 border-t relative ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
               
//                {/* Emoji Picker Popover */}
//                <AnimatePresence>
//                  {showEmojiPicker && (
//                    <motion.div 
//                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
//                      className="absolute bottom-20 left-4 z-50 shadow-2xl rounded-2xl"
//                      ref={emojiRef}
//                    >
//                      <EmojiPicker 
//                         // theme={isDark ? 'dark' : 'light'} 
//                         onEmojiClick={handleAddEmoji}
//                         lazyLoadEmojis={true}
//                      />
//                    </motion.div>
//                  )}
//                </AnimatePresence>

//                <div className="max-w-4xl mx-auto flex gap-2 md:gap-3 items-end">
//                   {/* Emoji Button */}
//                   <button 
//                     onClick={() => setShowEmojiPicker(!showEmojiPicker)}
//                     className={`p-3 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
//                   >
//                     <Smile size={20} />
//                   </button>

//                   <textarea 
//                      rows={1}
//                      value={inputMsg}
//                      onChange={(e) => setInputMsg(e.target.value)}
//                     //  onKeyDown={(e) => {
//                     //     if (e.key === 'Enter' && !e.shiftKey) {
//                     //         e.preventDefault();
//                     //         handleSendMessage();
//                     //     }
//                     //  }}
//                      placeholder="Type a message..." 
//                      className={`flex-1 border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm resize-none scrollbar-hide
//                        ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}
//                      `} 
//                   />
//                   <button 
//                     onClick={handleSendMessage}
//                     className="p-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/30 hover:bg-primary-dark transition-transform active:scale-95 mb-0.5"
//                   >
//                     <Send size={18} />
//                   </button>
//                </div>
//             </div>
//           </>
//         ) : (
//           <div className="hidden md:flex flex-1 flex-col items-center justify-center opacity-40 space-y-4">
//              <div className="w-20 h-20 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center"><MessageSquare size={32} /></div>
//              <p className="text-xl font-bold">Select a contact</p>
//           </div>
//         )}
//       </main>

//       {/* Agreement Drawer (Retained - Just Hidden for Brevity in Code Block) */}
//       <AnimatePresence>
//         {isAgreementPanelOpen && (
//            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className={`fixed inset-y-0 right-0 z-50 w-full md:w-[85%] max-w-7xl shadow-2xl flex flex-col border-l ${isDark ? 'bg-[#0f172a] border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
//              <div className={`h-16 flex items-center justify-between px-6 border-b shrink-0 ${isDark ? 'border-slate-800 bg-[#1e293b]' : 'border-slate-200 bg-white'}`}>
//                 <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Contract Management</h3>
//                 <button onClick={() => toggleAgreementPanel(false)} className="p-2"><X size={20} /></button>
//              </div>
//              <div className="flex-1 p-8 flex items-center justify-center opacity-50">Drafting Studio is Ready</div>
//            </motion.div>
//         )}
//       </AnimatePresence>
//     </div>
//   );
// }

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api';
import { useAppStore } from '../store';
import { useSocket } from '../context/SocketContext';

import Sidebar from '../components/dashboard/Sidebar';
import ChatArea from '../components/dashboard/ChatArea';
import AgreementDrawer from '../components/dashboard/AgreementDrawer';

// ... (Interfaces are correct in your uploaded file) ...
// Ensure you keep interfaces FileData, Message, Contact, PendingMessage

interface FileData {
  url?: string;
  name: string;
  mimeType: string;
  size: number;
  localFile?: File; 
}

interface Message {
  _id?: string;
  tempId?: string;
  sender: string;
  content: string;
  messageType?: 'text' | 'file';
  fileData?: FileData;
  timestamp: string;
  isSelf: boolean;
  status?: 'pending' | 'sent' | 'uploading' | 'failed';
  uploadProgress?: number;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  status: 'online' | 'offline' | 'busy';
  lastMessage?: string;
  lastMessageTime?: string;
}

interface PendingMessage {
  tempId: string;
  recipientId: string;
  content: string;
  timestamp: string;
}

export default function Dashboard() {
  const { currentUser, selectedChatUser, theme } = useAppStore();
  const { socket, onlineUsers } = useSocket();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [recentContacts, setRecentContacts] = useState<Contact[]>([]);
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [inputMsg, setInputMsg] = useState('');

  // --- PAGINATION STATES ---
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const isProcessingQueue = useRef(false);
  const uploadControllers = useRef<Record<string, AbortController>>({});
  const activeChatIdRef = useRef<string | undefined>(undefined);
  
  useEffect(() => {
    activeChatIdRef.current = selectedChatUser?.id;
  }, [selectedChatUser]);

  // ... (getQueue, saveQueue, processQueue - Keep exact logic from your file) ...
  const getQueue = useCallback((): PendingMessage[] => {
    try {
        const raw = localStorage.getItem('s_queue');
        if (!raw) return [];
        return JSON.parse(atob(raw));
    } catch (e) { return []; }
  }, []);

  const saveQueue = useCallback((queue: PendingMessage[]) => {
    localStorage.setItem('s_queue', btoa(JSON.stringify(queue)));
  }, []);

  const processQueue = useCallback(async (): Promise<void> => {
    if (!currentUser || isProcessingQueue.current) return;
    const queue = getQueue();
    if (queue.length === 0) return;

    isProcessingQueue.current = true;
    saveQueue([]); 
    const failedItems: PendingMessage[] = [];

    for (const item of queue) {
      try {
        const res = await api.post('/chat/send', {
          sender: currentUser.id,
          recipient: item.recipientId,
          content: item.content,
          tempId: item.tempId
        });
        socket?.emit("sendMessage", { recipientId: item.recipientId, message: item.content });
        
        if (activeChatIdRef.current === item.recipientId) {
            setMessages(prev => prev.map(m => 
                m.tempId === item.tempId ? { ...m, status: 'sent', _id: res.data.data._id } : m
            ));
        }
      } catch (err) {
        failedItems.push(item);
      }
    }
    if (failedItems.length > 0) {
        const currentQueue = getQueue();
        saveQueue([...failedItems, ...currentQueue]); 
    }
    isProcessingQueue.current = false;
  }, [currentUser, socket, getQueue, saveQueue]);

  // --- DATA FETCHING ---
  const fetchRecentContacts = useCallback(async () => {
    try {
        const res = await api.get('/chat/recent-contacts');
        setRecentContacts(res.data.contacts);
    } catch (e) {}
  }, []);

  // UPDATED fetchHistory (with pagination)
  const fetchHistory = useCallback(async (skipCount = 0) => {
    if (!selectedChatUser || !currentUser) return;
    
    const targetUserId = selectedChatUser.id;
    setIsLoadingHistory(true);

    try {
      const res = await api.get(`/chat/history`, {
        params: { 
            user1: currentUser.id, 
            user2: selectedChatUser.id,
            limit: 10,
            skip: skipCount
        }
      });
      
      if (activeChatIdRef.current !== targetUserId) return;

      const serverMessages: Message[] = res.data.messages.map((m: any) => ({
        _id: m._id,
        sender: m.sender,
        content: m.content || '',
        messageType: m.messageType || 'text',
        fileData: m.fileData,
        timestamp: m.timestamp,
        isSelf: m.sender === currentUser.id,
        status: m.status || 'sent'
      }));

      // Set Has More
      setHasMore(res.data.hasMore);

      if (skipCount === 0) {
          // INITIAL LOAD
          const queue = getQueue();
          const myPending: Message[] = queue
            .filter(q => q.recipientId === selectedChatUser.id)
            .map(q => ({
              tempId: q.tempId,
              sender: currentUser.id,
              content: q.content,
              timestamp: q.timestamp,
              isSelf: true,
              status: 'pending' as const
            }));

          setMessages(prev => {
             const recentSent = prev.filter(m => 
                 m.isSelf && (m.status === 'sent' || m.status === 'uploading') && 
                 !serverMessages.some(sm => sm._id === m._id || (sm.tempId && sm.tempId === m.tempId))
             );
             
             const allMsgs = [...serverMessages, ...myPending, ...recentSent].sort((a, b) => 
                 new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
             );
             
             return allMsgs.filter((v, i, a) => 
                 a.findIndex(t => (t._id && t._id === v._id) || (t.tempId && t.tempId === v.tempId)) === i
             );
          });
      } else {
          // APPEND OLDER MESSAGES TO TOP
          setMessages(prev => [...serverMessages, ...prev]);
      }

    } catch (err) { console.error("Fetch history failed", err); }
    finally { setIsLoadingHistory(false); }
  }, [selectedChatUser, currentUser, getQueue]);

  // Load More Handler
  const handleLoadMore = () => {
      // Approximate skip count by filtering out pending
      const currentCount = messages.filter(m => m.status !== 'pending').length;
      fetchHistory(currentCount);
  };

  // ... (Effects are mostly same, just updating initial fetch call) ...

  useEffect(() => {
    if (!currentUser) return;
    fetchRecentContacts();
    processQueue();
    const syncData = async () => {
        await processQueue(); 
        fetchRecentContacts();
        if (selectedChatUser) fetchHistory(0);
    };
    window.addEventListener('online', syncData);
    if (socket) socket.on("connect", syncData);
    return () => {
        window.removeEventListener('online', syncData);
        socket?.off("connect", syncData);
    };
  }, [currentUser, socket, selectedChatUser, fetchHistory, fetchRecentContacts, processQueue]);

  useEffect(() => {
    if (selectedChatUser) { 
        setMessages([]); 
        setHasMore(false);
        fetchHistory(0); // Fetch first page
    } else { 
        setMessages([]); 
    }
  }, [selectedChatUser, fetchHistory]); 

  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = (newMsg: any) => {
      const isForCurrentChat = newMsg.senderId === selectedChatUser?.id || newMsg.senderId === currentUser?.id;
      const isActuallyActive = activeChatIdRef.current === newMsg.senderId || (newMsg.senderId === currentUser?.id && activeChatIdRef.current === selectedChatUser?.id);

      if (isForCurrentChat && isActuallyActive) {
        setMessages(prev => {
            const exists = prev.some(m => (m._id && m._id === newMsg._id) || (m.content === newMsg.message && m.timestamp === newMsg.timestamp));
            if (exists) return prev; 
            return [...prev, {
                _id: newMsg._id,
                sender: newMsg.senderId,
                content: newMsg.message || '',
                messageType: newMsg.messageType || 'text',
                fileData: newMsg.fileData,
                timestamp: newMsg.timestamp,
                isSelf: newMsg.senderId === currentUser?.id,
                status: 'sent'
            }];
        });
      }
      fetchRecentContacts();
    };
    socket.on("newMessage", handleNewMessage);
    return () => { socket.off("newMessage", handleNewMessage); };
  }, [socket, selectedChatUser, currentUser, fetchRecentContacts]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 0) {
        setIsSearching(true);
        try {
          const res = await api.get(`/users/search?query=${searchQuery}`);
          setSearchResults(res.data.users);
        } catch (err) {} finally { setIsSearching(false); }
      } else { setSearchResults([]); }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSendMessage = async (fileData?: any, tempId?: string) => {
    if ((!inputMsg.trim() && !fileData) || !selectedChatUser || !currentUser) return;
    
    const finalTempId = tempId || Date.now().toString();
    const content = inputMsg;
    if(!fileData) setInputMsg(""); 

    const optimisticMsg: Message = {
        _id: finalTempId,
        tempId: finalTempId,
        sender: currentUser.id,
        content: content,
        messageType: fileData ? 'file' : 'text',
        fileData: fileData ? { ...fileData, url: fileData.url || '' } : undefined,
        timestamp: new Date().toISOString(),
        isSelf: true,
        status: fileData ? 'uploading' : 'pending',
        uploadProgress: 0
    };
    setMessages(prev => [...prev, optimisticMsg]);

    if (fileData) {
        const controller = new AbortController();
        uploadControllers.current[finalTempId] = controller;
        const formData = new FormData();
        formData.append('file', fileData.localFile);
        
        try {
            const uploadRes = await api.post('/chat/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                signal: controller.signal,
                onUploadProgress: (p) => {
                    const percent = Math.round((p.loaded * 100) / (p.total || fileData.size));
                    setMessages(prev => prev.map(m => m.tempId === finalTempId ? { ...m, uploadProgress: percent } : m));
                }
            });

            const finalFileData = uploadRes.data;
            const res = await api.post('/chat/send', {
                sender: currentUser.id, recipient: selectedChatUser.id,
                content: content, messageType: 'file', fileData: finalFileData, tempId: finalTempId
            });

            socket?.emit("sendMessage", { 
                recipientId: selectedChatUser.id, message: content, messageType: 'file', fileData: finalFileData 
            });

            setMessages(prev => prev.map(m => 
                m.tempId === finalTempId ? { ...m, status: 'sent', _id: res.data.data._id, fileData: finalFileData } : m
            ));
        } catch (err: any) {
            if (err.name === 'Canceled') {
                setMessages(prev => prev.filter(m => m.tempId !== finalTempId));
            } else {
                setMessages(prev => prev.map(m => m.tempId === finalTempId ? { ...m, status: 'failed' } : m));
            }
        } finally { delete uploadControllers.current[finalTempId]; }

    } else {
        try {
            const res = await api.post('/chat/send', {
                sender: currentUser.id, recipient: selectedChatUser.id, content, tempId: finalTempId
            });
            socket?.emit("sendMessage", { recipientId: selectedChatUser.id, message: content });
            setMessages(prev => prev.map(m => 
                m.tempId === finalTempId ? { ...m, status: 'sent', _id: res.data.data._id } : m
            ));
            fetchRecentContacts();
        } catch (err) {
            const queue = getQueue();
            queue.push({ tempId: finalTempId, recipientId: selectedChatUser.id, content, timestamp: optimisticMsg.timestamp });
            saveQueue(queue);
        }
    }
  };

  const handleCancelUpload = (tempId: string) => {
      if (uploadControllers.current[tempId]) {
          uploadControllers.current[tempId].abort();
      }
  };

  return (
    <div className={`flex h-screen w-full overflow-hidden font-sans relative transition-colors duration-300
      ${theme === 'dark' ? 'bg-[rgb(var(--bg-dark))] text-slate-200' : 'bg-[rgb(var(--bg-light))] text-slate-800'}
    `}>
      <Sidebar 
        onlineUsers={onlineUsers}
        recentContacts={recentContacts}
        searchResults={searchResults}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isSearching={isSearching}
      />
      <ChatArea 
        messages={messages}
        inputMsg={inputMsg}
        setInputMsg={setInputMsg}
        onSendMessage={handleSendMessage}
        onlineUsers={onlineUsers}
        onCancelUpload={handleCancelUpload}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
        isLoadingHistory={isLoadingHistory}
      />
      <AgreementDrawer />
    </div>
  );
}