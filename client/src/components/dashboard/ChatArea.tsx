import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker from 'emoji-picker-react';
import { ArrowLeft, FileText, Send, Smile, Clock, MessageSquare } from 'lucide-react';
import { useAppStore } from '../../store';

interface Message {
  _id?: string;
  tempId?: string;
  sender: string;
  content: string;
  timestamp: string;
  isSelf: boolean;
  status?: 'pending' | 'sent';
}

interface ChatAreaProps {
  messages: Message[];
  inputMsg: string;
  setInputMsg: (msg: string) => void;
  onSendMessage: () => void;
  onlineUsers: Map<string, string>;
}

const getDateLabel = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function ChatArea({ 
  messages, inputMsg, setInputMsg, onSendMessage, onlineUsers 
}: ChatAreaProps) {
  
  const { selectedChatUser, setSelectedChatUser, isAgreementPanelOpen, toggleAgreementPanel, theme } = useAppStore();
  const isDark = theme === 'dark';
  
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    function handleClickOutside(event: any) {
        if (emojiRef.current && !emojiRef.current.contains(event.target)) {
            setShowEmojiPicker(false);
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddEmoji = (emojiObject: any) => {
    setInputMsg(inputMsg + emojiObject.emoji);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        setShowEmojiPicker(false);
        onSendMessage();
    }
  };

  if (!selectedChatUser) {
    return (
        <div className={`hidden md:flex flex-1 flex-col items-center justify-center opacity-40 space-y-4 relative z-10 transition-all
            ${isDark ? 'bg-[rgb(var(--bg-dark))]' : 'bg-[rgb(var(--bg-light))]'}
        `}>
            <div className="w-20 h-20 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center rotate-3"><MessageSquare size={32} /></div>
            <p className="text-xl font-bold">Select a contact to begin</p>
        </div>
    );
  }

  return (
    <main className={`flex-1 flex flex-col min-w-0 relative z-10 transition-all ${isDark ? 'bg-[rgb(var(--bg-dark))]' : 'bg-[rgb(var(--bg-light))]'}`}>
        {/* Header */}
        <header className={`h-16 md:h-20 border-b flex items-center justify-between px-4 md:px-6 backdrop-blur-md sticky top-0 z-10
           ${isDark ? 'border-slate-800 bg-[rgb(var(--bg-dark))]/90' : 'border-slate-200 bg-white/90'}
        `}>
          <div className="flex items-center gap-3">
             <button onClick={() => setSelectedChatUser(null)} className="md:hidden p-2 -ml-2 opacity-60"><ArrowLeft size={20} /></button>
             <div>
                <h2 className={`font-bold text-sm md:text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedChatUser.name}</h2>
                <p className="text-[10px] md:text-xs text-primary flex items-center gap-1 font-medium">
                   {onlineUsers.has(selectedChatUser.id) 
                     ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/> Online</>
                     : <><span className="w-1.5 h-1.5 rounded-full bg-slate-400"/> Offline</>
                   }
                </p>
             </div>
          </div>
          
          <button 
              onClick={() => toggleAgreementPanel(!isAgreementPanelOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all border shadow-sm
                ${isAgreementPanelOpen 
                    ? 'bg-primary text-white border-primary' 
                    : isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}
              `}
          >
              <FileText size={16} />
              <span>Agreements</span>
          </button>
        </header>

        {/* MESSAGES LIST */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-pattern scrollbar-hide">
           {messages.map((msg, idx) => {
              const prevMsg = messages[idx - 1];
              const showDate = !prevMsg || getDateLabel(prevMsg.timestamp) !== getDateLabel(msg.timestamp);

              return (
                <div key={msg._id || msg.tempId} className="w-full">
                    {/* Date Header */}
                    {showDate && (
                        <div className="flex justify-center my-4 opacity-50">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
                                {getDateLabel(msg.timestamp)}
                            </span>
                        </div>
                    )}

                    {/* Message Row */}
                    <div className={`flex w-full mb-1 ${msg.isSelf ? 'justify-end' : 'justify-start'}`}>
                        <div 
                            className={`
                                relative px-3 py-2 
                                max-w-[85%] md:max-w-[65%] 
                                rounded-xl shadow-sm text-sm 
                                break-words whitespace-pre-wrap
                                ${msg.isSelf 
                                    ? 'bg-primary text-white rounded-tr-none' 
                                    : (isDark ? 'bg-[#1e293b] text-slate-100' : 'bg-white text-slate-900') + ' rounded-tl-none border border-black/5 dark:border-white/10'
                                }
                            `}
                        >
                            {/* TEXT CONTENT */}
                            <span className="leading-relaxed inline-block break-words w-full">
                                {msg.content}
                                
                                {/* SMART TIMESTAMP (Floats right inside the text flow) */}
                                <span className={`
                                    float-right mt-1 ml-2 text-[10px] flex items-center gap-1 select-none align-bottom
                                    ${msg.isSelf ? 'text-white/70' : 'opacity-50'}
                                `}>
                                    <span className="whitespace-nowrap">
                                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                    {msg.isSelf && msg.status === 'pending' && (
                                        <Clock size={12} className="animate-pulse text-yellow-300 inline-block" />
                                    )}
                                </span>
                            </span>
                        </div>
                    </div>
                </div>
              );
           })}
           <div ref={scrollRef} />
        </div>

        {/* INPUT BAR */}
        <div className={`p-3 md:p-4 border-t relative ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
           <AnimatePresence>
             {showEmojiPicker && (
               <motion.div 
                 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                 className="absolute bottom-20 left-4 z-50 shadow-2xl rounded-2xl"
                 ref={emojiRef}
               >
                 <EmojiPicker 
                    // theme={isDark ? 'dark' : 'light'} 
                    onEmojiClick={handleAddEmoji}
                    lazyLoadEmojis={true}
                 />
               </motion.div>
             )}
           </AnimatePresence>

           <div className="max-w-4xl mx-auto flex gap-2 md:gap-3 items-end">
              <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-3 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                <Smile size={20} />
              </button>

              <textarea 
                 rows={1}
                 value={inputMsg}
                 onChange={(e) => setInputMsg(e.target.value)}
                 onKeyDown={handleKeyDown}
                 placeholder="Type a message..." 
                 className={`flex-1 border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm resize-none scrollbar-hide
                   ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}
                 `} 
              />
              <button onClick={onSendMessage} className="p-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/30 hover:bg-primary-dark transition-transform active:scale-95 mb-0.5">
                <Send size={18} />
              </button>
           </div>
        </div>
    </main>
  );
}