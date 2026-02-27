import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileCheck, X, Plus, UserCheck, Send, ShieldCheck, Clock,
  CheckCircle, Edit3, Loader2, AlertCircle, RefreshCw, Eye, ArrowLeft, Lock
} from 'lucide-react';
import { useAppStore } from '../../store';
import { api } from '../../lib/api';
import { useSocket } from '../../context/SocketContext';
import { decryptPrivateKeyClient, signContentClient } from '../../lib/cryptoClient';

// Define Prop Interface
interface AgreementDrawerProps {
  onAgreementMessage?: (msg: any, isUpdate?: boolean) => void;
}

export default function AgreementDrawer({ onAgreementMessage }: AgreementDrawerProps) {
  const { selectedChatUser, isAgreementPanelOpen, toggleAgreementPanel, theme, currentUser } = useAppStore();
  const { socket } = useSocket();
  const isDark = theme === 'dark';
  
  const [isDrafting, setIsDrafting] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(true); 
  const [isEditingId, setIsEditingId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  
  const [agreements, setAgreements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [isSigning, setIsSigning] = useState(false);
  const [sealingPassword, setSealingPassword] = useState('');
  const [fetchingIPFS, setFetchingIPFS] = useState(false);

  const lastSynced = useRef<string | null>(null);

  const fetchAgreements = async (forceFull = false) => {
    if (!selectedChatUser) return;
    setLoading(true);
    try {
      const endpoint = `/agreements/chat/${selectedChatUser.id}`;
      
      // Determine if we do a Full Fetch or Delta Sync
      const params = (lastSynced.current && !forceFull) ? { since: lastSynced.current } : {};
      
      const res = await api.get(endpoint, { params });
      const incoming = res.data.agreements;

      if (forceFull || !lastSynced.current) {
          // Initial Load: Replace everything
          setAgreements(incoming);
      } else if (incoming.length > 0) {
          // Delta Sync: Merge updates
          setAgreements(prev => {
              const map = new Map(prev.map(a => [a._id, a]));
              incoming.forEach((a: any) => map.set(a._id, a)); // Update or Add
              // Convert back to array and Sort by UpdatedAt (Newest first)
              return Array.from(map.values()).sort((a: any, b: any) => 
                  new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
              );
          });
      }
      
      // Update Sync Timestamp
      lastSynced.current = new Date().toISOString();

    } catch (err) { 
        console.error("Sync error", err); 
    } finally { 
        setLoading(false); 
    }
  };

  useEffect(() => {
    if (isAgreementPanelOpen) {
      lastSynced.current = null;
      fetchAgreements(true);
    };
  }, [isAgreementPanelOpen, selectedChatUser]);

  const handleNewAgreement = () => {
    setIsEditingId(null);
    setDraftTitle('');
    setDraftContent('');
    setIsReadOnly(false); 
    setIsDrafting(true);
  };

  const handleViewAgreement = async (ag: any) => {
    setIsEditingId(ag._id);
    setDraftTitle(ag.title);
    if(ag.status === 'active' || ag.status === 'archived'){
      setFetchingIPFS(true);
      try {
        const res = await api.get(`/agreements/${ag._id}/content`);
        setDraftContent(res.data.content);
      } catch (error) {
        setDraftContent("Error loading from IPFS");
      } finally {
        setFetchingIPFS(false);
      }
    } else {
      setDraftContent(ag.content);
    }
    setIsReadOnly(true); 
    setIsDrafting(true);
  };

  const handleSendProposal = async () => {
    if (!draftTitle.trim() || !draftContent.trim() || !selectedChatUser || !currentUser) return;
    setActionLoading('send');

    let tempId: string | null = null;
    if (!isEditingId && onAgreementMessage) {
        tempId = Date.now().toString();
        onAgreementMessage({
            _id: tempId,
            tempId: tempId,
            sender: currentUser.id,
            content: `Agreement Proposal: ${draftTitle}`,
            messageType: 'agreement_proposal',
            timestamp: new Date().toISOString(),
            isSelf: true,
            status: 'pending' // Shows Clock 
        }, false); // false = Add new
    }

    try {
      if(isEditingId && currentAg?.status === 'active'){
        const res = await api.post(`/agreements/${isEditingId}/amend`, { 
          content: draftContent 
        });

        if (tempId && onAgreementMessage && res.data.systemMessage) {
            onAgreementMessage({
                ...res.data.systemMessage,
                tempId: tempId,
                isSelf: true,
                status: 'sent' // Updates Clock to Tick ✅
            }, true); // true = Update existing
        }
        
        if (socket && res.data.systemMessage) {
          socket.emit("sendMessage", {
            recipientId: selectedChatUser.id,
            message: res.data.systemMessage.content,
            messageType: 'agreement_proposal'
          });
        }
      } else if (isEditingId) {
        await api.put(`/agreements/${isEditingId}/update`, { title: draftTitle, content: draftContent });
      } else {
        // Create new proposal
        const res = await api.post('/agreements/create', { recipientId: selectedChatUser.id, title: draftTitle, content: draftContent });
        
        // --- 2. UPDATE UI: Success (Show Tick) ---
        if (tempId && onAgreementMessage && res.data.systemMessage) {
            onAgreementMessage({
                ...res.data.systemMessage,
                tempId: tempId,
                isSelf: true,
                status: 'sent' // Updates Clock to Tick ✅
            }, true); // true = Update existing
        }

        // Notify Recipient
        if (socket && res.data.systemMessage) {
            socket.emit("sendMessage", {
                recipientId: selectedChatUser.id,
                message: res.data.systemMessage.content,
                messageType: 'agreement_proposal' 
            });
        }
      }
      setIsDrafting(false);
      fetchAgreements();
    } catch (err: any) { 
        console.error(err);
        // --- 3. ERROR HANDLING ---
        if (tempId && onAgreementMessage) {
            onAgreementMessage({ tempId, status: 'failed' }, true);
        }
        const errMsg = err.response?.data?.message || "Failed to submit version. The agreement may have already been take over by other party.";
        alert(`⚠️ Action Failed: ${errMsg}`);
    }
    finally { setActionLoading(null); }
  };

  const handleAccept = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setActionLoading(id);
    try {
      await api.post(`/agreements/${id}/accept`);
      fetchAgreements();
    } catch (err) { console.error(err); }
    finally { setActionLoading(null); }
  };

  const handleRecall = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if(!window.confirm("Recall this proposal for corrections?")) return;
    setActionLoading(id);
    try {
      const res = await api.post(`/agreements/${id}/recall`);
      fetchAgreements();

      const updatedAgreement = res.data.agreement;
      if (updatedAgreement) {
          setIsEditingId(updatedAgreement._id);
          setDraftTitle(updatedAgreement.title);
          setDraftContent(updatedAgreement.content);
          setIsReadOnly(false); // Enable editing immediately
          setIsDrafting(true);  // Open the Drafting Studio
      }
    } catch (err: any) {
      // --- HANDLE COLLISION ---
      if (err.response && err.response.status === 409) {
          alert("Update Conflict: The other party has already recalled or updated this agreement.");
          fetchAgreements(); // Force refresh to show new state
      } else {
          console.error(err);
          alert("Recall failed");
      }
    } finally { 
      setActionLoading(null); 
    }
  };

  const handleSign = async () => {
    if (!sealingPassword.trim() || !isEditingId) return;
    setActionLoading('sign');
    try {
      const vaultRes = await api.get('/auth/vault');
      const { encryptedPrivateKey, iv, salt, authTag } = vaultRes.data;

      const privateKeyPem = decryptPrivateKeyClient(
        encryptedPrivateKey,
        sealingPassword,
        iv,
        salt,
        authTag
      );
      const signature = signContentClient(privateKeyPem, draftContent);
      await api.post(`/agreements/${isEditingId}/sign`, { signature });

      setIsSigning(false);
      setSealingPassword('');
      fetchAgreements(); // Force reload to show "Active" status
    } catch (err: any) {
      console.log(err);
      alert(err.response?.data?.message || "Signing failed");
    } finally {
      setActionLoading(null);
    }
  };

  const currentAg = agreements.find(a => a._id === isEditingId);

  const hasUserSigned = useMemo(() => {
    return currentAg?.signatures.some((s: any) => s.signerId === currentUser?.id);
  }, [currentUser, currentAg]);

  return (
    <AnimatePresence>
        {isAgreementPanelOpen && (
           <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => toggleAgreementPanel(false)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className={`fixed inset-y-0 right-0 z-50 w-full md:w-[85%] max-w-7xl shadow-2xl flex flex-col border-l ${isDark ? 'bg-[#0f172a] border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              
              {/* Header with Reload */}
              <div className={`h-14 md:h-16 flex items-center justify-between px-4 md:px-6 border-b shrink-0 ${isDark ? 'border-slate-800 bg-[#1e293b]' : 'border-slate-200 bg-white'}`}>
                 <div className="flex items-center gap-3">
                    {isDrafting && <button onClick={() => setIsDrafting(false)} className="p-2 hover:bg-black/5 rounded-lg md:hidden"><ArrowLeft size={20}/></button>}
                    <div className="p-1.5 bg-primary/10 rounded-lg text-primary"><FileCheck size={18} /></div>
                    <h3 className={`font-bold text-base md:text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>
                      {isDrafting ? (isReadOnly ? 'Review Mode' : 'Drafting Studio') : 'Contract Management'}
                    </h3>
                 </div>
                 <div className="flex items-center gap-2">
                    {!isDrafting && (
                      <button onClick={() => fetchAgreements()} className={`p-2 rounded-lg transition-all ${loading ? 'animate-spin' : ''} ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                        <RefreshCw size={18} />
                      </button>
                    )}
                    <button onClick={() => toggleAgreementPanel(false)} className="p-2 -mr-2 opacity-50 hover:opacity-100"><X size={20} /></button>
                 </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col relative">
                 {!isDrafting ? (
                   /* LIST VIEW */
                   <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6 overflow-y-auto scrollbar-hide">
                      <button onClick={handleNewAgreement} className={`w-full py-8 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-3 transition-all group ${isDark ? 'border-slate-700 hover:border-primary hover:bg-slate-800/50' : 'border-slate-300 hover:border-primary hover:bg-blue-50'}`}>
                         <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><Plus size={24} /></div>
                         <div className="text-center">
                           <span className="block text-base font-bold group-hover:text-primary transition-colors">Create New Agreement</span>
                           <span className="text-xs opacity-60">Propose new terms to {selectedChatUser?.name}</span>
                         </div>
                      </button>

                      <div className="space-y-4">
                        {loading ? <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary" size={32}/></div> : agreements.map((ag) => (
                          <div key={ag._id} onClick={() => handleViewAgreement(ag)} className={`p-5 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer group transition-all ${isDark ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'}`}>
                            <div className="flex-1 min-w-0">
                               <div className="flex items-center gap-3 mb-1">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${ag.status === 'active' ? 'bg-emerald-500/20 text-emerald-500' : ag.status === 'pending_signature' ? 'bg-amber-500/20 text-amber-500' : 'bg-primary/20 text-primary'}`}>{ag.status.replace('_', ' ')}</span>
                                  <span className="text-xs opacity-40 font-mono">#{ag.agreementId}</span>
                                  <span className="px-2 py-0.5 rounded bg-slate-500/10 text-slate-500 text-[10px] font-mono font-bold">
                                    v{ag.version}.0
                                  </span>
                                  {/* {ag.recallCount > 0 && <span className="text-[10px] text-rose-400 flex items-center gap-1"><RotateCcw size={10}/> Recalled {ag.recallCount}x</span>} */}
                               </div>
                               <h4 className="font-bold text-lg mb-1 truncate group-hover:text-primary transition-colors">{ag.title}</h4>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                               {ag.status === 'proposed' && ag.currentTurn === currentUser?.id ? (
                                 <button onClick={(e) => handleAccept(e, ag._id)} className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20">
                                      {actionLoading === ag._id ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle size={14}/>} Accept
                                 </button>
                               ) : ag.status === 'pending_signature' ? (
                                 <button onClick={(e) => handleRecall(e, ag._id)} className="px-3 py-1.5 rounded-lg border border-rose-500/50 text-rose-500 text-[10px] font-bold hover:bg-rose-500/10">Recall Error</button>
                               ) : <div className="p-2 opacity-20 group-hover:opacity-100 transition-opacity"><Eye size={18}/></div>}
                            </div>
                          </div>
                        ))}
                      </div>
                   </div>
                 ) : (
                   /* EDITOR */
                   <div className="flex flex-col h-full bg-inherit">
                      {fetchingIPFS && <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center"><Loader2 className="animate-spin" /></div>}
                      <div className={`px-4 py-3 md:px-6 border-b flex items-center justify-between gap-4 shrink-0 ${isDark ? 'bg-[#0f172a]' : 'bg-slate-50'}`}>
                          <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shrink-0 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-300'}`}>
                               <UserCheck size={12} className="text-primary"/>
                               <span className="text-[10px] font-bold opacity-50 uppercase tracking-tighter">Party :</span>
                               <span className="text-xs font-semibold">{selectedChatUser?.name}</span>
                            </div>
                            {isEditingId && (
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shrink-0 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-300'}`}>
                                   <span className={`w-2 h-2 rounded-full ${currentAg?.status === 'active' ? 'bg-emerald-500' : 'bg-primary'}`}/>
                                   <span className="text-xs font-semibold uppercase">{currentAg?.status.replace('_', ' ')}</span>
                                </div>
                            )}
                          </div>
                      </div>

                      <div className={`flex-1 overflow-y-auto p-4 md:p-8 ${isDark ? 'bg-[#0b1121]' : 'bg-slate-100'}`}>
                        <div className={`max-w-4xl mx-auto min-h-full shadow-lg rounded-2xl flex flex-col ${isDark ? 'bg-[#1e293b] text-slate-300' : 'bg-white text-slate-800'}`}>
                          <div className="px-6 py-4 border-b border-dashed border-opacity-10 flex justify-between items-center opacity-40 text-[10px] font-mono tracking-widest">
                              <span className="truncate">#{currentAg.agreementId}</span>
                              {isReadOnly && <span className="flex items-center gap-1 shrink-0"><AlertCircle size={10}/> REVIEW MODE</span>}
                          </div>
                          
                          <div className="p-4 md:p-10 flex-1 flex flex-col gap-4">
                              <input 
                                readOnly={isReadOnly}
                                value={draftTitle} 
                                onChange={(e) => setDraftTitle(e.target.value)} 
                                className={`w-full bg-transparent border-none text-xl md:text-3xl font-black focus:outline-none transition-opacity ${isReadOnly ? 'opacity-70' : 'opacity-100'}`} 
                                placeholder="Agreement Title..." 
                              />
                              
                              <textarea 
                                readOnly={isReadOnly}
                                className={`w-full flex-1 text-justify pr-2 bg-transparent resize-none focus:outline-none text-base md:text-xl leading-relaxed font-serif ${isReadOnly ? 'opacity-80' : 'opacity-100'}`} 
                                placeholder="Draft the legal terms here..." 
                                value={draftContent} 
                                onChange={(e) => setDraftContent(e.target.value)} 
                                spellCheck={false} 
                              />
                          </div>
                        </div>
                      </div>

                      <div className={`p-4 border-t flex items-center justify-between md:justify-end gap-4 shrink-0 safe-bottom ${isDark ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200'}`}>
                         <button onClick={() => setIsDrafting(false)} className="px-6 py-2 rounded-xl text-sm font-bold opacity-60">Back</button>
                         
                         <div className="flex gap-2">
                            {isReadOnly && currentAg?.status === 'proposed' && currentAg?.currentTurn === currentUser?.id && (
                               <button onClick={() => setIsReadOnly(false)} className="px-6 py-2.5 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center gap-2 hover:bg-primary/20 transition">
                                  <Edit3 size={16}/> Modify Terms
                               </button>
                            )}

                            {isReadOnly && currentAg?.status === 'active' && (
                              <button 
                                  onClick={() => setIsReadOnly(false)}
                                  className="px-6 py-2.5 rounded-xl bg-blue-500 text-white font-bold text-xs flex items-center gap-2"
                              >
                                  <Plus size={16}/> Add Version
                              </button>
                            )}

                            {!isReadOnly && currentAg?.status !== 'proposed' && (
                               <button disabled={actionLoading === 'send'} onClick={handleSendProposal} className="px-6 md:px-10 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-xl shadow-primary/30 flex items-center gap-2 active:scale-95 transition-all">
                                  {actionLoading === 'send' ? <Loader2 className="animate-spin" size={14}/> : <Send size={14} />} 
                                  {currentAg?.status === 'active' ? `Submit Version ${currentAg.version + 1}` : 'Send Proposal'}
                               </button>
                            )}

                            {!isReadOnly && currentAg?.status === 'proposed' && (
                               <button disabled={actionLoading === 'send'} onClick={handleSendProposal} className="px-6 md:px-10 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-xl shadow-primary/30 flex items-center gap-2 active:scale-95 transition-all">
                                  {actionLoading === 'send' ? <Loader2 className="animate-spin" size={14}/> : <Send size={14} />} 
                                  {isEditingId && 'Resubmit Proposal'}
                               </button>
                            )}

                            {currentAg?.status === 'pending_signature' && !hasUserSigned && (
                              <button 
                                onClick={() => setIsSigning(true)} 
                                className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center gap-2 active:scale-95 transition-all"
                              >
                                <ShieldCheck size={16}/> Sign & Seal
                              </button>
                            )}
                            {hasUserSigned && currentAg?.status === 'pending_signature' && (
                                <span className="text-xs font-bold text-amber-500 flex items-center gap-1 italic">
                                    <Clock size={14}/> Awaiting counter-party signature...
                                </span>
                            )}
                         </div>
                      </div>
                   </div>
                 )}
              </div>
            </motion.div>
           </>
        )}
        {isSigning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className={`w-full max-w-sm p-6 rounded-2xl shadow-2xl ${isDark ? 'bg-[#1e293b]' : 'bg-white'}`}>
              <div className="flex justify-center mb-4 text-emerald-500"><Lock size={48}/></div>
              <h3 className="text-center text-xl font-bold mb-2">Sealing Ceremony</h3>
              <p className="text-center text-sm opacity-60 mb-6">Enter your sealing password to digitally sign this agreement.</p>
              
              <input 
                type="password" 
                placeholder="Sealing Password"
                value={sealingPassword}
                onChange={(e) => setSealingPassword(e.target.value)}
                className={`w-full p-3 rounded-xl mb-4 text-center font-bold tracking-widest ${isDark ? 'bg-black/20 text-white' : 'bg-slate-100 text-slate-900'} focus:outline-none focus:ring-2 focus:ring-emerald-500`}
              />
              
              <div className="flex gap-3">
                <button onClick={() => { setIsSigning(false); setSealingPassword(''); }} className="flex-1 py-3 rounded-xl font-bold opacity-60 hover:opacity-100 transition">Cancel</button>
                <button 
                  onClick={handleSign} 
                  disabled={actionLoading === 'sign'} 
                  className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/30 flex justify-center gap-2"
                >
                  {actionLoading === 'sign' ? <Loader2 className="animate-spin"/> : <ShieldCheck size={18}/>} Sign Now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
    </AnimatePresence>
  );
}