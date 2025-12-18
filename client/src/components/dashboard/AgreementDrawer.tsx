import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileCheck, X, Plus, Download, UserCheck, Send, Calendar } from 'lucide-react';
import { useAppStore } from '../../store';

export default function AgreementDrawer() {
  const { selectedChatUser, isAgreementPanelOpen, toggleAgreementPanel, theme } = useAppStore();
  const isDark = theme === 'dark';
  
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftContent, setDraftContent] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const draftId = useMemo(() => Math.floor(1000 + Math.random() * 9000), [isDrafting]);

  return (
    <AnimatePresence>
        {isAgreementPanelOpen && (
           <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => toggleAgreementPanel(false)}
            />
            
            <motion.div 
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={`fixed inset-y-0 right-0 z-50 w-full md:w-[85%] max-w-7xl shadow-2xl flex flex-col border-l
                ${isDark ? 'bg-[#0f172a] border-slate-700' : 'bg-slate-50 border-slate-200'}
              `}
            >
              {/* Header */}
              <div className={`h-14 md:h-16 flex items-center justify-between px-4 md:px-6 border-b shrink-0
                 ${isDark ? 'border-slate-800 bg-[#1e293b]' : 'border-slate-200 bg-white'}
              `}>
                 <div className="flex items-center gap-3">
                    <div className="p-1.5 md:p-2 bg-primary/10 rounded-lg text-primary"><FileCheck size={18} /></div>
                    <h3 className={`font-bold text-base md:text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>
                      {isDrafting ? 'Drafting Studio' : 'Contract Management'}
                    </h3>
                 </div>
                 <button onClick={() => toggleAgreementPanel(false)} className="p-2 -mr-2 opacity-50 hover:opacity-100"><X size={20} /></button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden flex flex-col relative">
                 {!isDrafting ? (
                   /* LIST VIEW */
                   <div className="p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6 md:space-y-8 overflow-y-auto">
                      <button 
                        onClick={() => setIsDrafting(true)}
                        className={`w-full py-8 md:py-12 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-3 md:gap-4 transition-all group
                           ${isDark ? 'border-slate-700 hover:border-primary hover:bg-slate-800/50' : 'border-slate-300 hover:border-primary hover:bg-blue-50'}
                        `}
                      >
                         <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform">
                            <Plus size={24} className="md:w-8 md:h-8" />
                         </div>
                         <div className="text-center">
                           <span className="block text-base md:text-lg font-bold group-hover:text-primary transition-colors">Create New Agreement</span>
                           <span className="text-xs md:text-sm opacity-60">Draft a secure proposal for {selectedChatUser?.name}</span>
                         </div>
                      </button>
                   </div>
                 ) : (
                   /* DRAFTING EDITOR */
                   <div className="flex flex-col h-full">
                      <div className={`px-4 py-3 md:px-6 md:py-4 border-b flex flex-col md:flex-row md:items-center gap-3 md:gap-6 shrink-0
                          ${isDark ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200'}
                      `}>
                          <div className="flex gap-3 overflow-x-auto pb-1 md:pb-0">
                            <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full border shrink-0 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-300'}`}>
                               <UserCheck size={12} className="text-primary"/>
                               <span className="text-[10px] md:text-xs font-bold opacity-50 uppercase">To:</span>
                               <span className="text-xs md:text-sm font-semibold whitespace-nowrap">{selectedChatUser?.name}</span>
                            </div>
                            <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full border shrink-0 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-300'}`}>
                               <span className="text-[10px] md:text-xs font-bold opacity-50 uppercase">Ref:</span>
                               <span className="text-xs md:text-sm font-mono opacity-80">DRAFT-{draftId}</span>
                            </div>
                          </div>
                          <input 
                             type="text" 
                             value={draftTitle}
                             onChange={(e) => setDraftTitle(e.target.value)}
                             className="flex-1 bg-transparent border-none text-base md:text-lg font-bold focus:outline-none placeholder:opacity-30"
                             placeholder="Agreement Title..."
                          />
                      </div>

                      <div className={`flex-1 overflow-y-auto p-3 md:p-8 ${isDark ? 'bg-[#0b1121]' : 'bg-slate-100'}`}>
                        <div className={`max-w-4xl mx-auto min-h-full shadow-lg rounded-xl relative flex flex-col ${isDark ? 'bg-[#1e293b] text-slate-300' : 'bg-white text-slate-800'}`}>
                           <div className="px-4 py-3 md:px-8 md:py-4 border-b border-dashed border-opacity-20 flex justify-between opacity-50 text-[10px] md:text-xs font-mono">
                              <span>MARKDOWN SUPPORTED</span>
                              <span>{new Date().toLocaleDateString()}</span>
                           </div>
                           <textarea 
                             className="flex-1 w-full p-4 md:p-12 bg-transparent resize-none focus:outline-none text-sm md:text-lg leading-loose font-serif placeholder:opacity-30"
                             placeholder="Start typing the legal terms here..."
                             value={draftContent}
                             onChange={(e) => setDraftContent(e.target.value)}
                             spellCheck={false}
                           />
                        </div>
                      </div>

                      <div className={`p-3 md:p-4 border-t flex justify-end gap-3 md:gap-4 px-4 md:px-8 shrink-0 ${isDark ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200'}`}>
                         <button onClick={() => setIsDrafting(false)} className="px-4 py-2 md:px-6 md:py-2.5 rounded-xl font-medium text-xs md:text-sm hover:opacity-80 transition">Discard</button>
                         <button className="px-4 py-2 md:px-8 md:py-2.5 rounded-xl bg-primary text-white font-bold text-xs md:text-sm shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all flex items-center gap-2">
                            <Send size={14} /> <span>Send Proposal</span>
                         </button>
                      </div>
                   </div>
                 )}
              </div>
            </motion.div>
           </>
        )}
    </AnimatePresence>
  );
}