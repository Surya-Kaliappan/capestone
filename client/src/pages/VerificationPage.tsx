import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  CheckCircle, XCircle, ShieldCheck, FileText, 
  Calendar, Search, Lock, Server, Sun, Moon, FileDown,
  Fingerprint, Hash, Globe, Cpu, User, Mail, X, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SERVER_URL } from '../config';

// --- Interfaces ---
interface SignatureProof {
  signerId: string;
  name: string;
  email?: string;
  signedAt: string;
  valid: boolean;
  error?: string;
}

interface VerificationResult {
  success: boolean;
  agreementId: string;
  version: number;
  isContentTamperFree: boolean;
  content: string;
  signatures: SignatureProof[];
  blockchainTimestamp: {
    seconds: { low: number };
  };
}

export default function VerificationPage() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState('');
  const [selectedSigner, setSelectedSigner] = useState<SignatureProof | null>(null);
  
  // Theme State - Default to dark for "Crypto" vibe
  const [isDark, setIsDark] = useState(true);

  const agreementId = window.location.pathname.split('/verify/')[1];
  console.log(result);
  // --- THEME LOGIC: Direct DOM Manipulation ---
  useEffect(() => {
    // Check system preference or previous session on mount
    const root = window.document.documentElement;
    if (root.classList.contains('dark')) {
      setIsDark(true);
    } else {
      root.classList.add('dark'); // Default to dark on load
      setIsDark(true);
    }
  }, []);

  const toggleTheme = () => {
    const root = window.document.documentElement;
    if (root.classList.contains('dark')) {
      root.classList.remove('dark');
      setIsDark(false);
    } else {
      root.classList.add('dark');
      setIsDark(true);
    }
  };

  useEffect(() => {
    if (!agreementId) {
        setLoading(false);
        return;
    }

    const verifyAgreement = async () => {
      try {
        const res = await api.get(`agreements/verify/${agreementId}`);
        setResult(res.data);
      } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.message || "Verification Failed. This agreement may not exist or has been tampered with.");
      } finally {
        setLoading(false);
      }
    };

    verifyAgreement();
  }, [agreementId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const input = (e.target as any).search.value;
    if(input) window.location.href = `/verify/${input}`;
  };

  const handleDownload = async () => {
    try {
      // Direct browser download triggers
      window.open(`${SERVER_URL || 'http://localhost:3000'}/api/agreements/verify/${agreementId}/download`, '_blank');
    } catch (err) {
      alert("Failed to download report");
    }
  };

  // --- 1. LOADING STATE ---
  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-300 ${isDark ? 'bg-[#0f172a] text-white' : 'bg-slate-50 text-slate-900'}`}>
        <motion.div 
           initial={{ opacity: 0, scale: 0.9 }} 
           animate={{ opacity: 1, scale: 1 }} 
           transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
        >
           <Fingerprint size={64} className="text-emerald-500 mb-6" />
        </motion.div>
        <h2 className="text-xl md:text-2xl font-mono font-bold mb-2 text-center">Authenticating Ledger...</h2>
        <div className="flex flex-col gap-2 text-xs md:text-sm opacity-50 font-mono text-center">
            <span className="flex items-center gap-2 justify-center"><Cpu size={14}/> Verifying Cryptographic Proofs</span>
            <span className="flex items-center gap-2 justify-center"><Globe size={14}/> Connecting to Decentralized Network</span>
        </div>
      </div>
    );
  }

  // --- 2. LANDING / SEARCH STATE ---
  if (!agreementId) {
      return (
          <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300 ${isDark ? 'bg-[#020617]' : 'bg-slate-100'}`}>
              <button onClick={toggleTheme} className={`absolute top-4 right-4 p-3 rounded-full shadow-lg z-50 transition-all ${isDark ? 'bg-slate-800 text-yellow-400 border border-slate-700' : 'bg-white text-slate-800 border border-slate-200'}`}>
                  {isDark ? <Sun size={20}/> : <Moon size={20}/>}
              </button>

              <div className="absolute top-0 left-0 w-64 h-64 md:w-96 md:h-96 bg-indigo-600/20 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2"/>
              <div className="absolute bottom-0 right-0 w-64 h-64 md:w-96 md:h-96 bg-emerald-600/10 rounded-full blur-[80px] translate-x-1/2 translate-y-1/2"/>

              <motion.form 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                onSubmit={handleSearch} 
                className={`w-full max-w-lg backdrop-blur-xl border p-6 md:p-10 rounded-3xl shadow-2xl relative z-10 ${isDark ? 'bg-[#0f172a]/80 border-slate-800' : 'bg-white/80 border-white'}`}
              >
                  <div className="flex justify-center mb-6 md:mb-8">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                        <ShieldCheck size={32} className="md:w-10 md:h-10"/>
                    </div>
                  </div>
                  
                  <h1 className={`text-2xl md:text-4xl font-black text-center mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>Public Verification</h1>
                  <p className={`text-center mb-8 text-xs md:text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Access the immutable truth. Enter a unique Agreement ID to retrieve its forensic proof from the Hyperledger Fabric network.
                  </p>
                  
                  <div className={`relative flex rounded-xl overflow-hidden shadow-inner ${isDark ? 'bg-[#0f172a] border border-slate-700' : 'bg-slate-50 border border-slate-300'}`}>
                      <input 
                        name="search" 
                        placeholder="Paste ID (e.g., AG-176...)" 
                        className={`flex-1 bg-transparent border-none px-4 py-3 md:px-6 md:py-4 placeholder:text-slate-500 focus:outline-none font-mono text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}
                      />
                      <button className={`px-4 md:px-6 font-bold transition flex items-center gap-2 ${isDark ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
                         <Search size={18}/>
                      </button>
                  </div>
              </motion.form>
          </div>
      )
  }

  // --- 3. ERROR STATE ---
  if (error || !result) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${isDark ? 'bg-[#0f172a]' : 'bg-slate-100'}`}>
        <div className={`max-w-md w-full border border-red-500/30 p-6 md:p-8 rounded-3xl text-center shadow-2xl ${isDark ? 'bg-[#1e293b]' : 'bg-white'}`}>
           <div className="w-12 h-12 md:w-16 md:h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 text-red-500 animate-pulse">
             <Activity size={24} className="md:w-8 md:h-8" />
           </div>
           <h1 className={`text-xl md:text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Verification Failed</h1>
           <p className={`mb-6 md:mb-8 text-sm leading-relaxed ${isDark ? 'text-red-300' : 'text-red-600'}`}>{error}</p>
           <button 
             onClick={() => window.location.href = '/verify/'} 
             className={`w-full py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 text-sm md:text-base ${isDark ? 'bg-white text-[#0f172a] hover:bg-slate-200' : 'bg-slate-900 text-white hover:bg-slate-700'}`}
           >
             <Search size={16}/> Verify Another ID
           </button>
        </div>
      </div>
    );
  }

  // --- 4. SUCCESS REPORT STATE ---
  return (
    <div className={`min-h-screen font-sans selection:bg-emerald-500/30 transition-colors duration-300 pb-20 ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* FLOATING TOGGLE */}
      <button onClick={toggleTheme} className={`fixed top-4 right-4 p-2.5 rounded-full shadow-lg z-50 transition-all ${isDark ? 'bg-slate-800 text-yellow-400 border border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50'}`}>
          {isDark ? <Sun size={18}/> : <Moon size={18}/>}
      </button>

      {/* HEADER */}
      <header className={`pt-12 pb-24 px-4 md:px-8 relative overflow-hidden ${isDark ? 'bg-[#0f172a] border-b border-slate-800' : 'bg-white border-b border-slate-200'}`}>
         {/* Decorative Grid */}
         <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `radial-gradient(${isDark ? '#fff' : '#000'} 1px, transparent 1px)`, backgroundSize: '24px 24px' }}></div>
         
         <div className="max-w-7xl mx-auto relative z-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-3 text-emerald-500 font-mono text-[10px] md:text-xs tracking-widest uppercase">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Verified On-Chain Record
                    </div>
                    <h1 className={`text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter mb-3 leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Agreement Autopsy
                    </h1>
                    <p className={`max-w-xl text-xs md:text-sm lg:text-base leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        This document is retrieved from the decentralized ledger. 
                        Its content hash, timestamps, and signatures are cryptographically authenticated.
                    </p>
                </div>

                <div className={`flex flex-col md:items-end gap-1 p-3 rounded-xl border w-fit md:w-auto ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-100/50 border-slate-200'}`}>
                        <div className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            <Calendar size={12}/> Validated At
                        </div>
                        <div className="font-mono text-sm md:text-lg font-bold">{new Date().toLocaleString()}</div>
                </div>

                {/* DOWNLOAD BUTTON */}
                <button 
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 transition-all text-sm md:text-base"
                >
                    <FileDown size={18} /> Download Official PDF
                </button>
            </div>
         </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 -mt-16 relative z-20">
         
         {/* --- DATA GRID --- */}
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 mb-8 md:mb-12">
            
            {/* 1. AGREEMENT ID (Wide) */}
            <motion.div 
                initial={{ y: 20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                transition={{ delay: 0.1 }}
                className={`col-span-1 md:col-span-5 p-6 md:p-8 rounded-3xl shadow-xl border flex flex-col justify-center ${isDark ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-100'}`}
            >
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Agreement ID</div>
                <div className={`text-xl md:text-2xl font-mono font-bold break-all ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {result.agreementId}
                </div>
            </motion.div>

            {/* INTEGRITY STATUS */}
            <motion.div 
                initial={{ y: 20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                transition={{ delay: 0.2 }}
                className={`col-span-1 md:col-span-4 p-6 md:p-8 rounded-3xl shadow-xl border flex flex-col justify-center text-white relative overflow-hidden ${result.isContentTamperFree ? 'bg-emerald-500 border-emerald-400' : 'bg-red-500 border-red-400'}`}
            >
                <div className="absolute -right-4 -bottom-4 opacity-20">
                    {result.isContentTamperFree ? <ShieldCheck size={120}/> : <XCircle size={120}/>}
                </div>
                <div className="relative z-10">
                    <div className="text-xs font-bold opacity-80 uppercase tracking-wider mb-2">Integrity Check</div>
                    <div className="text-2xl font-bold flex items-center gap-2">
                        {result.isContentTamperFree ? 'PASSED' : 'FAILED'}
                        {result.isContentTamperFree ? <CheckCircle className="fill-white text-emerald-500" size={28}/> : <XCircle className="fill-white text-red-500" size={28}/>}
                    </div>
                    <div className="text-sm mt-2 opacity-90 leading-tight">
                        {result.isContentTamperFree 
                            ? 'Hashes match ledger record.' 
                            : 'CRITICAL: Content hash mismatch.'}
                    </div>
                </div>
            </motion.div>

            {/* TIMESTAMP */}
            <motion.div 
                initial={{ y: 20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                transition={{ delay: 0.3 }}
                className="col-span-1 md:col-span-3 bg-blue-600 p-6 md:p-8 rounded-3xl shadow-xl border border-blue-500 text-white flex flex-col justify-center"
            >
                <div className="text-xs font-bold opacity-70 uppercase tracking-wider mb-2">Sealed On</div>
                <div className="text-lg font-bold flex items-center gap-2">
                    <Calendar size={20}/>
                    {new Date(result.blockchainTimestamp.seconds.low * 1000).toLocaleDateString()}
                </div>
                <div className="text-sm opacity-70 font-mono mt-1">
                    {new Date(result.blockchainTimestamp.seconds.low * 1000).toLocaleTimeString()}
                </div>
            </motion.div>
         </div>

         {/* --- SIGNATURES --- */}
         <div className="mb-8 md:mb-12">
            <h3 className={`font-bold text-lg md:text-2xl mb-4 md:mb-6 flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <div className="p-1.5 md:p-2 rounded-lg bg-emerald-500 text-white"><User size={16} className="md:w-5 md:h-5"/></div>
                Digital Signatures <span className="text-sm md:text-base opacity-50 font-normal">({result.signatures.length} Parties)</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <AnimatePresence>
                {result.signatures.map((sig, i) => (
                    <motion.div 
                        key={sig.signerId} 
                        initial={{ x: -20, opacity: 0 }} 
                        animate={{ x: 0, opacity: 1 }} 
                        transition={{ delay: 0.3 + (i * 0.1) }} 
                        onClick={() => setSelectedSigner(sig)}
                        className={`p-5 md:p-6 rounded-2xl shadow-md border cursor-pointer hover:scale-[1.01] transition-all group relative overflow-hidden ${isDark ? 'bg-[#1e293b] border-slate-700 hover:border-emerald-500/50' : 'bg-white border-slate-200 hover:border-emerald-500/50'}`}
                    >
                        <div className={`absolute top-0 left-0 w-1 h-full ${sig.valid ? 'bg-emerald-500' : 'bg-red-500'}`}/>
                        
                        <div className="flex items-start justify-between mb-4">
                             <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                                <div className={`w-10 h-10 md:w-14 md:h-14 rounded-2xl flex items-center justify-center text-lg md:text-xl font-bold shadow-inner flex-shrink-0 ${isDark ? 'bg-slate-800 text-emerald-500' : 'bg-slate-100 text-emerald-600'}`}>
                                    {sig.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <h4 className={`font-bold text-base md:text-lg truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{sig.name}</h4>
                                    <div className="flex items-center gap-1 text-[10px] md:text-xs text-slate-500 font-mono mt-1">
                                        <Hash size={10}/> <span className="truncate">{sig.signerId}</span>
                                    </div>
                                </div>
                             </div>
                             <div className={`p-1.5 md:p-2 rounded-full flex-shrink-0 ${sig.valid ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                 {sig.valid ? <CheckCircle size={16} className="md:w-5 md:h-5"/> : <XCircle size={16} className="md:w-5 md:h-5"/>}
                             </div>
                        </div>
                        
                        <div className={`pt-3 md:pt-4 border-t flex justify-between items-center text-xs md:text-sm ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                            <span className="text-slate-400 flex items-center gap-1.5 font-mono text-[10px] md:text-xs">
                                <Lock size={12}/> ECDSA
                            </span>
                            <span className={`px-2 py-1 md:px-3 rounded-lg text-[10px] md:text-xs font-bold ${isDark ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                                View Details &rarr;
                            </span>
                        </div>
                    </motion.div>
                ))}
                </AnimatePresence>
            </div>
         </div>

         {/* --- AWESOME CONTENT VIEWER --- */}
         <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className={`rounded-3xl shadow-2xl border overflow-hidden relative ${isDark ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-200'}`}
         >
             {/* Header Bar */}
             <div className={`px-4 md:px-10 py-4 md:py-5 border-b flex flex-wrap items-center justify-between gap-3 ${isDark ? 'bg-[#0f172a] border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                 <div className="flex items-center gap-3">
                     <div className="p-1.5 md:p-2 bg-blue-500 rounded-lg text-white shadow-lg shadow-blue-500/30"><FileText size={16} className="md:w-5 md:h-5"/></div>
                     <div>
                         <div className={`font-bold text-sm md:text-base leading-none ${isDark ? 'text-white' : 'text-slate-800'}`}>Decrypted Agreement</div>
                         <div className="text-[10px] md:text-xs opacity-50 mt-1 font-mono">Source: IPFS</div>
                     </div>
                 </div>
                 <div className={`flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-bold px-2 py-1 md:px-3 md:py-1.5 rounded-lg border uppercase tracking-wider ${isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                    <Lock size={10} className="md:w-3 md:h-3"/> Encrypted
                 </div>
             </div>
             
             {/* Content Area with Optimized Spacing */}
             <div className={`p-5 md:p-12 relative ${isDark ? 'bg-[#1e293b]' : 'bg-[#fffdf5]'}`}>
                 {/* Watermark Pattern */}
                 <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}>
                 </div>
                 
                 {/* The Text - break-words handles wrapping, whitespace-pre-wrap preserves formatting */}
                 <div className={`max-w-4xl mx-auto font-serif text-sm md:text-lg leading-relaxed whitespace-pre-wrap break-words relative z-10 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                     {result.content}
                 </div>
                 
                 {/* Footer Seal */}
                 <div className="mt-8 pt-6 border-t border-dashed border-slate-300/20 text-center relative z-10">
                    <div className="inline-flex flex-col items-center gap-1 opacity-40">
                        <Server size={14}/>
                        <span className="text-[10px] font-mono tracking-widest uppercase">End of Document</span>
                    </div>
                 </div> 
             </div>
         </motion.div>
         
         {/* --- FOOTER LINKS --- */}
         <div className="mt-12 md:mt-20 text-center">
             <button onClick={() => window.location.href = '/verify/'} className={`group inline-flex items-center gap-2 md:gap-3 px-6 py-3 md:px-8 md:py-4 rounded-full font-bold text-sm md:text-base transition-all shadow-lg hover:shadow-xl ${isDark ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-slate-800 hover:bg-slate-50'}`}>
                <Search size={16} className="group-hover:scale-110 transition-transform"/> Check Another Agreement
             </button>
         </div>

      </main>

      {/* --- SIGNER DETAILS POPUP MODAL --- */}
      <AnimatePresence>
        {selectedSigner && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedSigner(null)}
          >
            <motion.div 
               initial={{ scale: 0.9, y: 20 }} 
               animate={{ scale: 1, y: 0 }} 
               exit={{ scale: 0.9, y: 20 }}
               onClick={(e) => e.stopPropagation()}
               className={`w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative ${isDark ? 'bg-[#0f172a] border border-slate-700' : 'bg-white'}`}
            >
               {/* Modal Header */}
               <div className="h-24 md:h-32 bg-gradient-to-r from-emerald-600 to-blue-600 relative">
                  <button onClick={() => setSelectedSigner(null)} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition z-10">
                    <X size={18}/>
                  </button>
                  <div className="absolute -bottom-8 md:-bottom-10 left-6 md:left-8">
                      <div className={`w-20 h-20 md:w-24 md:h-24 rounded-3xl flex items-center justify-center text-3xl md:text-4xl font-bold border-4 shadow-xl ${isDark ? 'bg-[#0f172a] border-[#0f172a] text-white' : 'bg-white border-white text-slate-800'}`}>
                         {selectedSigner.name.charAt(0)}
                      </div>
                  </div>
               </div>
               
               {/* Modal Body */}
               <div className="pt-12 px-6 md:px-8 pb-8">
                   <div className="flex items-center justify-between mb-1">
                        <h2 className={`text-xl md:text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedSigner.name}</h2>
                        {selectedSigner.valid && (
                            <motion.div 
                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                className="bg-emerald-500 text-white p-1 rounded-full shadow-lg"
                            >
                                <CheckCircle size={20}/>
                            </motion.div>
                        )}
                   </div>
                   <div className="flex items-center gap-2 text-xs md:text-sm text-slate-500 mb-6">
                      <CheckCircle size={14} className="text-emerald-500"/> Verified Signatory
                   </div>
                   
                   <div className="space-y-3 md:space-y-4">
                       {selectedSigner.email && (
                         <div className={`p-3 md:p-4 rounded-2xl flex items-center gap-3 md:gap-4 ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><Mail size={18}/></div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-bold opacity-50 uppercase">Email Address</div>
                                <div className={`truncate font-medium text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{selectedSigner.email}</div>
                            </div>
                         </div>
                       )}

                       <div className={`p-3 md:p-4 rounded-2xl flex items-center gap-3 md:gap-4 ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                            <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg"><Fingerprint size={18}/></div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-bold opacity-50 uppercase">Digital Identity (ID)</div>
                                <div className={`break-all font-mono text-[10px] md:text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{selectedSigner.signerId}</div>
                            </div>
                       </div>
                       
                       <div className={`p-3 md:p-4 rounded-2xl flex items-center gap-3 md:gap-4 ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg"><Calendar size={18}/></div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-bold opacity-50 uppercase">Signed Timestamp</div>
                                <div className={`font-medium text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                    {new Date(selectedSigner.signedAt).toLocaleString()}
                                </div>
                            </div>
                       </div>
                   </div>
                   
                   <div className="mt-6 md:mt-8 pt-6 border-t border-dashed border-slate-500/20 text-center">
                       <span className={`px-4 py-2 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider ${selectedSigner.valid ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                           {selectedSigner.valid ? 'Cryptographically Valid' : 'Invalid Signature'}
                       </span>
                   </div>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}