import { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker from 'emoji-picker-react';
import { ArrowLeft, FileText, Send, Smile, Clock, MessageSquare, ChevronDown, Paperclip, X, File as FileIcon, Download, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store';
import { api } from '../../lib/api'; 
import { SERVER_URL } from '../../config'; 
import ImageLightbox from './ImageLightbox';

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

interface ChatAreaProps {
  messages: Message[];
  inputMsg: string;
  setInputMsg: (msg: string) => void;
  onSendMessage: (fileData?: FileData, tempId?: string) => void;
  onlineUsers: Map<string, string>;
  onCancelUpload?: (tempId: string) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoadingHistory: boolean;
}

const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

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
  messages, inputMsg, setInputMsg, onSendMessage, onlineUsers, onCancelUpload,
  onLoadMore, hasMore, isLoadingHistory
}: ChatAreaProps) {
  
  const { selectedChatUser, setSelectedChatUser, isAgreementPanelOpen, toggleAgreementPanel, theme, timeFormat } = useAppStore();
  const isDark = theme === 'dark';
  
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<{src: string, name: string} | null>(null);
  const [downloading, setDownloading] = useState<Record<string, number>>({});
  
  const downloadControllers = useRef<Record<string, AbortController>>({});
  const emojiRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  // --- SCROLL POSITION REFS ---
  const prevScrollHeightRef = useRef<number>(0); 
  const lastMessageIdRef = useRef<string | null>(null);

  // --- MESSAGE GROUPING (For Sticky Dates) ---
  const messageGroups = useMemo(() => {
    const groups: { date: string; msgs: Message[] }[] = [];
    let currentGroup: { date: string; msgs: Message[] } | null = null;

    messages.forEach((msg) => {
      const date = getDateLabel(msg.timestamp);
      if (!currentGroup || currentGroup.date !== date) {
        currentGroup = { date, msgs: [] };
        groups.push(currentGroup);
      }
      currentGroup.msgs.push(msg);
    });
    return groups;
  }, [messages]);

  // --- DOWNLOAD LOGIC ---
  const handleDownload = async (msg: Message) => {
    if (!msg.fileData?.url || !msg._id) return;
    if (downloading[msg._id]) {
        downloadControllers.current[msg._id]?.abort();
        setDownloading(prev => { const n = {...prev}; delete n[msg._id!]; return n; });
        return;
    }
    const controller = new AbortController();
    downloadControllers.current[msg._id] = controller;
    setDownloading(prev => ({ ...prev, [msg._id!]: 1 })); 
    try {
        const fullUrl = msg.fileData.url.startsWith('http') || msg.fileData.url.startsWith('blob') 
            ? msg.fileData.url : `${SERVER_URL}${msg.fileData.url}`;
        const res = await api.get(fullUrl, {
            responseType: 'blob',
            signal: controller.signal,
            onDownloadProgress: (p) => {
                const percent = Math.round((p.loaded * 100) / (p.total || msg.fileData!.size));
                setDownloading(prev => ({ ...prev, [msg._id!]: percent }));
            }
        });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', msg.fileData.name);
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (err: any) {
        if (err.name !== 'Canceled' && err.code !== 'ERR_CANCELED') console.error("Download failed", err);
    } finally {
        setDownloading(prev => { const n = {...prev}; delete n[msg._id!]; return n; });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const tempId = Date.now().toString();
      const tempFileData: FileData = { name: file.name, mimeType: file.type, size: file.size, localFile: file, url: URL.createObjectURL(file) };
      onSendMessage(tempFileData, tempId);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- SCROLL HANDLER ---
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    
    // Show button if > 100px from bottom
    const isBottom = scrollHeight - scrollTop - clientHeight < 100;
    isAtBottomRef.current = isBottom;
    setShowScrollButton(!isBottom);
    if (isBottom) setHasNewMessage(false);
  };

  // --- SMART SCROLL LAYOUT EFFECT ---
  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const len = messages.length;
    const currentLastMsg = messages[len - 1];
    const currentLastId = currentLastMsg?._id || currentLastMsg?.tempId;
    const prevLastId = lastMessageIdRef.current;

    const container = containerRef.current;
    const currentScrollHeight = container.scrollHeight;
    const prevScrollHeight = prevScrollHeightRef.current;

    // CASE 1: History Loaded (Prepend)
    // We have messages, the last message is the same as before (so no new message at bottom),
    // BUT the total height increased. This implies content was added to the top.
    if (len > 0 && currentLastId === prevLastId && currentScrollHeight > prevScrollHeight) {
        const diff = currentScrollHeight - prevScrollHeight;
        // Adjust scrollTop by the difference to keep the visual position stable
        if (diff > 0) {
            container.scrollTop = container.scrollTop + diff;
        }
    }

    // CASE 2: New Message (Append) or Initial Load
    // The last message changed. This is either a new text sent/received or the very first load.
    else if (len > 0 && currentLastId !== prevLastId) {
        // Initial Load (prevLastId is null) -> Jump to bottom instantly
        if (!prevLastId) {
             scrollRef.current?.scrollIntoView({ behavior: "auto" });
        } 
        // New Message -> Smooth Scroll
        else {
            if (currentLastMsg.isSelf || isAtBottomRef.current) {
                scrollRef.current?.scrollIntoView({ behavior: "smooth" });
                setHasNewMessage(false);
            } else {
                setHasNewMessage(true);
            }
        }
    }

    // Update refs for the next render cycle
    prevScrollHeightRef.current = currentScrollHeight;
    lastMessageIdRef.current = currentLastId || null;

  }, [messages]);

  // Reset scroll refs when switching users
  useEffect(() => {
      lastMessageIdRef.current = null;
      prevScrollHeightRef.current = 0;
  }, [selectedChatUser]);

  const scrollToBottom = () => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    setHasNewMessage(false);
  };

  useEffect(() => {
    function handleClickOutside(event: any) {
        if (emojiRef.current && !emojiRef.current.contains(event.target)) { setShowEmojiPicker(false); }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddEmoji = (emojiObject: any) => setInputMsg(inputMsg + emojiObject.emoji);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); setShowEmojiPicker(false); onSendMessage();
    }
  };
  
  const formatMsgTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: timeFormat === '12h' });
  };

  if (!selectedChatUser) return <div className="hidden md:flex flex-1 flex-col items-center justify-center opacity-40 space-y-4 relative z-10"><MessageSquare size={32} /><p className="text-xl font-bold">Select a contact to begin</p></div>;

  return (
    <main className={`flex-1 flex flex-col min-w-0 relative z-10 transition-all ${isDark ? 'bg-[rgb(var(--bg-dark))]' : 'bg-[rgb(var(--bg-light))]'}`}>
        
        {lightboxSrc && <ImageLightbox src={lightboxSrc.src} fileName={lightboxSrc.name} onClose={() => setLightboxSrc(null)} />}

        <header className={`h-16 md:h-20 border-b flex items-center justify-between px-4 md:px-6 backdrop-blur-md sticky top-0 z-10 ${isDark ? 'border-slate-800 bg-[rgb(var(--bg-dark))]/90' : 'border-slate-200 bg-white/90'}`}>
          <div className="flex items-center gap-3">
             <button onClick={() => setSelectedChatUser(null)} className="md:hidden p-2 -ml-2 opacity-60"><ArrowLeft size={20} /></button>
             <div>
                <h2 className={`font-bold text-sm md:text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedChatUser.name}</h2>
                <p className="text-[10px] md:text-xs text-primary flex items-center gap-1 font-medium">
                   {onlineUsers.has(selectedChatUser.id) ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/> Online</> : <><span className="w-1.5 h-1.5 rounded-full bg-slate-400"/> Offline</>}
                </p>
             </div>
          </div>
          <button onClick={() => toggleAgreementPanel(!isAgreementPanelOpen)} className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all border shadow-sm ${isAgreementPanelOpen ? 'bg-primary text-white border-primary' : isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}>
              <FileText size={16} /><span>Agreements</span>
          </button>
        </header>

        <div className="flex-1 relative overflow-hidden flex flex-col">
            <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 bg-pattern scrollbar-hide">
               
               {/* --- LOAD PREVIOUS BUTTON --- */}
               {hasMore && (
                   <div className="flex justify-center mb-6">
                       <button 
                         onClick={onLoadMore}
                         disabled={isLoadingHistory}
                         className={`text-xs px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2 transition-all active:scale-95 border
                            ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}
                         `}
                       >
                           {isLoadingHistory ? <Loader2 size={12} className="animate-spin"/> : <Clock size={12} />}
                           {isLoadingHistory ? 'Loading...' : 'Load previous messages'}
                       </button>
                   </div>
               )}

               {/* --- MESSAGE GROUPS --- */}
               {messageGroups.map((group) => (
                 <div key={group.date} className="relative pb-2">
                    
                    {/* Sticky Date Header */}
                    <div className="sticky top-2 z-10 flex justify-center pb-4 pt-2 pointer-events-none">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm backdrop-blur-md border 
                            ${isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-white/80 border-slate-200 text-slate-600'}
                        `}>
                            {group.date}
                        </span>
                    </div>

                    {/* Messages in Group */}
                    {group.msgs.map((msg, idx) => {
                        const prevMsg = group.msgs[idx - 1];
                        const nextMsg = group.msgs[idx + 1];
                        
                        const isSameSenderAsPrev = prevMsg && prevMsg.sender === msg.sender;
                        const isSameSenderAsNext = nextMsg && nextMsg.sender === msg.sender;

                        let borderRadiusClass = 'rounded-xl';
                        if (msg.isSelf) {
                            if (isSameSenderAsPrev && isSameSenderAsNext) borderRadiusClass = 'rounded-l-xl rounded-r-sm'; 
                            else if (isSameSenderAsPrev) borderRadiusClass = 'rounded-l-xl rounded-tr-sm rounded-br-xl';
                            else if (isSameSenderAsNext) borderRadiusClass = 'rounded-l-xl rounded-tr-xl rounded-br-sm';
                            else borderRadiusClass = 'rounded-xl rounded-tr-none';
                        } else {
                            if (isSameSenderAsPrev && isSameSenderAsNext) borderRadiusClass = 'rounded-r-xl rounded-l-sm';
                            else if (isSameSenderAsPrev) borderRadiusClass = 'rounded-r-xl rounded-tl-sm rounded-bl-xl';
                            else if (isSameSenderAsNext) borderRadiusClass = 'rounded-r-xl rounded-tl-xl rounded-bl-sm';
                            else borderRadiusClass = 'rounded-xl rounded-tl-none';
                        }
                        
                        const isImage = msg.messageType === 'file' && msg.fileData?.mimeType.startsWith('image/');
                        const isUploading = msg.status === 'uploading';
                        const isDownloading = msg._id && downloading[msg._id];
                        const progress = isUploading ? (msg.uploadProgress || 0) : (isDownloading || 0);

                        return (
                            <div key={msg._id || msg.tempId} className="w-full">
                                <div className={`flex w-full ${isSameSenderAsNext ? 'mb-[2px]' : 'mb-2'} ${msg.isSelf ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`relative shadow-sm border ${msg.isSelf ? 'bg-primary border-primary text-white' : (isDark ? 'bg-[#1e293b] border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900')} ${borderRadiusClass} ${msg.messageType === 'file' ? 'p-0 max-w-[75%]' : 'px-2 pt-1 pb-1.5 max-w-[85%] md:max-w-[65%]'}`}>
                                        
                                        {/* IMAGE */}
                                        {isImage && (
                                            <div className="relative group cursor-pointer" onClick={() => !isUploading && setLightboxSrc({ src: msg.fileData?.url?.startsWith('blob') ? msg.fileData.url : `${SERVER_URL}${msg.fileData?.url}`, name: msg.fileData?.name || 'Image' })}>
                                                <img src={msg.fileData?.url?.startsWith('blob') ? msg.fileData.url : `${SERVER_URL}${msg.fileData?.url}`} alt="attachment" className={`object-cover w-64 h-64 sm:h-72 sm:w-72 ${isUploading || isDownloading ? 'brightness-50 blur-[2px]' : ''} ${borderRadiusClass}`} />
                                                {(isUploading) && (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="relative w-12 h-12 flex items-center justify-center bg-black/40 rounded-full backdrop-blur-sm">
                                                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                                                <path className="text-white/20" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                                                <path className="text-white transition-all duration-300" strokeDasharray={`${progress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                                            </svg>
                                                            <button onClick={(e) => { e.stopPropagation(); if(onCancelUpload && msg.tempId) onCancelUpload(msg.tempId); }} className="absolute inset-0 flex items-center justify-center text-white"><X size={16} /></button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* FILE */}
                                        {msg.messageType === 'file' && !isImage && (
                                            <div className="flex items-center gap-3 p-3 min-w-[220px]">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isDark ? 'bg-white/10' : 'bg-black/5'}`}>
                                                    <FileIcon size={20} className={msg.isSelf ? 'text-white' : 'text-primary'} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="truncate text-sm font-medium">{msg.fileData?.name}</div>
                                                    <div className="text-xs opacity-70">{formatSize(msg.fileData?.size || 0)} • {msg.fileData?.mimeType.split('/')[1]?.toUpperCase()}</div>
                                                </div>
                                                <div>
                                                    {isUploading || isDownloading ? (
                                                        <button onClick={() => { if(isUploading && onCancelUpload && msg.tempId) onCancelUpload(msg.tempId); if(isDownloading && msg._id) handleDownload(msg); }} className="p-2 hover:bg-black/10 rounded-full relative">
                                                            <svg className="w-6 h-6 -rotate-90" viewBox="0 0 36 36">
                                                                <path className="text-current opacity-30" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                                                <path className="text-current" strokeDasharray={`${progress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                                            </svg>
                                                            <X size={10} className="absolute inset-0 m-auto" />
                                                        </button>
                                                    ) : (<button onClick={() => handleDownload(msg)} className="p-2 hover:bg-black/10 rounded-full"><Download size={20} /></button>)}
                                                </div>
                                            </div>
                                        )}

                                        {/* TEXT */}
                                        <div className={`relative ${msg.messageType === 'file' ? 'px-3 pb-2 pt-1' : ''}`}>
                                            <span className="leading-snug inline-block break-words whitespace-pre-wrap w-full text-sm">
                                                {msg.content}
                                                <span className={`float-right mt-0.5 ml-4 text-[10px] flex items-center gap-0.5 select-none align-bottom ${msg.isSelf ? 'text-white/70' : 'opacity-50'}`}>
                                                    <span className="whitespace-nowrap translate-y-[2px]">{formatMsgTime(msg.timestamp)}</span>
                                                    {msg.isSelf && msg.status === 'pending' && <Clock size={10} className="animate-pulse text-yellow-300 inline-block ml-0.5 translate-y-[1px]" />}
                                                    {msg.isSelf && msg.status === 'uploading' && <span className="text-[9px] ml-0.5">{progress}%</span>}
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                 </div>
               ))}
               
               <div ref={scrollRef} />

               {/* --- FLOATING SCROLL BUTTON (Repositioned to bottom-20) --- */}
               <AnimatePresence>
                 {showScrollButton && (
                   <motion.button 
                     initial={{ opacity: 0, scale: 0.8 }} 
                     animate={{ 
                        opacity: 1, 
                        scale: hasNewMessage ? [1, 1.1, 1] : 1, 
                        transition: hasNewMessage ? { repeat: Infinity, duration: 1.5 } : {} 
                     }} 
                     exit={{ opacity: 0, scale: 0.8 }} 
                     onClick={scrollToBottom} 
                     className={`
                        absolute right-4 bottom-20 z-30 
                        w-10 h-10 md:w-12 md:h-12 flex items-center justify-center 
                        rounded-2xl shadow-xl border transition-colors duration-300 
                        ${hasNewMessage ? 'bg-primary border-primary text-white' : isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}
                     `}
                   >
                     <ChevronDown size={24} />
                     {hasNewMessage && <span className="absolute inset-0 rounded-2xl bg-white/20 animate-pulse"></span>}
                   </motion.button>
                 )}
               </AnimatePresence>
            </div>
            
            {/* Input Bar */}
            <div className={`p-3 md:p-4 border-t relative ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
               <AnimatePresence>
                 {showEmojiPicker && (
                   <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-20 left-4 z-50 shadow-2xl rounded-2xl" ref={emojiRef}>
                     <EmojiPicker onEmojiClick={handleAddEmoji} lazyLoadEmojis={true} />
                   </motion.div>
                 )}
               </AnimatePresence>
               <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
               <div className="max-w-4xl mx-auto flex gap-2 md:gap-3 items-end">
                  <button onClick={() => fileInputRef.current?.click()} className={`p-3 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}><Paperclip size={20} /></button>
                  <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-3 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}><Smile size={20} /></button>
                  <textarea rows={1} value={inputMsg} onChange={(e) => setInputMsg(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a message..." className={`flex-1 border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm resize-none scrollbar-hide ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
                  <button onClick={() => onSendMessage()} className="p-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/30 hover:bg-primary-dark transition-transform active:scale-95 mb-0.5"><Send size={18} /></button>
               </div>
            </div>
        </div>
    </main>
  );
}