import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api';
import { useAppStore } from '../store';
import { useSocket } from '../context/SocketContext';

import Sidebar from '../components/dashboard/Sidebar';
import ChatArea from '../components/dashboard/ChatArea';
import AgreementDrawer from '../components/dashboard/AgreementDrawer';

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

  // Pagination & Queue Refs
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const isProcessingQueue = useRef(false);
  const uploadControllers = useRef<Record<string, AbortController>>({});
  const activeChatIdRef = useRef<string | undefined>(undefined);
  
  useEffect(() => {
    activeChatIdRef.current = selectedChatUser?.id;
  }, [selectedChatUser]);

  // --- QUEUE HELPERS ---
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
        socket?.emit("sendMessage", { 
            recipientId: item.recipientId, 
            message: item.content,
            timestamp: new Date().toISOString() // Ensure UTC in socket
        });
        
        if (activeChatIdRef.current === item.recipientId) {
            setMessages(prev => prev.map(m => 
                m.tempId === item.tempId ? { 
                    ...m, 
                    status: 'sent', 
                    _id: res.data.data._id,
                    timestamp: res.data.data.timestamp // Sync with server time
                } : m
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

  const fetchHistory = useCallback(async (skipCount = 0) => {
    if (!selectedChatUser || !currentUser) return;
    
    const targetUserId = selectedChatUser.id;
    setIsLoadingHistory(true);

    try {
      const res = await api.get(`/chat/history`, {
        params: { 
            user1: currentUser.id, 
            user2: selectedChatUser.id,
            limit: 50,
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
        timestamp: m.timestamp, // Server should return ISO string
        isSelf: m.sender === currentUser.id,
        status: m.status || 'sent'
      }));

      setHasMore(res.data.hasMore);

      if (skipCount === 0) {
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
          setMessages(prev => [...serverMessages, ...prev]);
      }

    } catch (err) { console.error("Fetch history failed", err); }
    finally { setIsLoadingHistory(false); }
  }, [selectedChatUser, currentUser, getQueue]);

  // Handler for Load More
  const handleLoadMore = () => {
      const currentCount = messages.filter(m => m.status !== 'pending').length;
      fetchHistory(currentCount);
  };

  // --- EFFECTS ---
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
        fetchHistory(0); 
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

  // --- SEND HANDLER ---
  const handleSendMessage = async (fileData?: any, tempId?: string) => {
    if ((!inputMsg.trim() && !fileData) || !selectedChatUser || !currentUser) return;
    
    const finalTempId = tempId || Date.now().toString();
    const content = inputMsg;
    if(!fileData) setInputMsg(""); 

    // OPTIMISTIC MESSAGE
    const optimisticMsg: Message = {
        _id: finalTempId,
        tempId: finalTempId,
        sender: currentUser.id,
        content: content,
        messageType: fileData ? 'file' : 'text',
        fileData: fileData ? { ...fileData, url: fileData.url || '' } : undefined,
        timestamp: new Date().toISOString(), // Use ISO 'Z' format
        isSelf: true,
        status: fileData ? 'uploading' : 'pending',
        uploadProgress: 0
    };
    setMessages(prev => [...prev, optimisticMsg]);

    if (fileData) {
        // FILE UPLOAD LOGIC
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
                recipientId: selectedChatUser.id, message: content, messageType: 'file', fileData: finalFileData,
                timestamp: res.data.data.timestamp // Sync time
            });

            setMessages(prev => prev.map(m => 
                m.tempId === finalTempId ? { 
                    ...m, status: 'sent', _id: res.data.data._id, fileData: finalFileData,
                    timestamp: res.data.data.timestamp // FORCE SYNC WITH SERVER TIME
                } : m
            ));
        } catch (err: any) {
            if (err.name === 'Canceled') {
                setMessages(prev => prev.filter(m => m.tempId !== finalTempId));
            } else {
                setMessages(prev => prev.map(m => m.tempId === finalTempId ? { ...m, status: 'failed' } : m));
            }
        } finally { delete uploadControllers.current[finalTempId]; }

    } else {
        // TEXT MESSAGE LOGIC
        try {
            const res = await api.post('/chat/send', {
                sender: currentUser.id, recipient: selectedChatUser.id, content, tempId: finalTempId
            });
            socket?.emit("sendMessage", { 
                recipientId: selectedChatUser.id, message: content,
                timestamp: res.data.data.timestamp // Sync time
            });
            setMessages(prev => prev.map(m => 
                m.tempId === finalTempId ? { 
                    ...m, status: 'sent', _id: res.data.data._id,
                    timestamp: res.data.data.timestamp // FORCE SYNC WITH SERVER TIME
                } : m
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