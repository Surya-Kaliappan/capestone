import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  CheckCircle, XCircle, ShieldCheck, FileText, 
  Calendar, Search, Lock, Server, Sun, Moon, FileDown,
  Fingerprint, Hash, Globe, Cpu, User, Mail, X, Activity,
  AlertTriangle, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SERVER_URL } from '../config';

// Interfaces (unchanged)
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
  parentId?: string;
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
  const [isDark, setIsDark] = useState(true);

  const agreementId = window.location.pathname.split('/verify/')[1]?.trim();

  // Theme logic (unchanged)
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'light') {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    } else if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    document.documentElement.classList.toggle('dark', newDark);
    localStorage.setItem('theme', newDark ? 'dark' : 'light');
  };

  // Fetch verification result (unchanged)
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
        setError(err.response?.data?.message || "Verification Failed. This agreement may not exist or has been tampered with.");
      } finally {
        setLoading(false);
      }
    };

    verifyAgreement();
  }, [agreementId]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = (e.currentTarget.elements.namedItem('search') as HTMLInputElement)?.value?.trim();
    if (input) window.location.href = `/verify/${input}`;
  };

  const handleDownload = () => {
    if (!agreementId) return;
    const url = `${SERVER_URL || 'http://localhost:3000'}/api/agreements/verify/${agreementId}/download`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // LOADING (unchanged)
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${isDark ? 'bg-gradient-to-br from-slate-950 to-slate-900' : 'bg-gradient-to-br from-slate-50 to-slate-100'}`}>
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="relative mx-auto mb-6">
            <Fingerprint className="w-14 h-14 md:w-16 md:h-16 text-emerald-500 animate-pulse" />
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold font-mono mb-4">Verifying Ledger...</h2>
          <div className="space-y-2 text-sm opacity-70 font-mono">
            <div className="flex items-center justify-center gap-2"><Cpu size={14} /> Checking proofs</div>
            <div className="flex items-center justify-center gap-2"><Globe size={14} /> Network query</div>
          </div>
        </motion.div>
      </div>
    );
  }

  // SEARCH SCREEN (unchanged)
  if (!agreementId) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 sm:p-6 relative ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <button onClick={toggleTheme} className={`fixed top-4 right-4 z-50 p-3 rounded-full shadow-xl ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-slate-100 border'}`}>
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -left-20 -top-40 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl" />
          <div className="absolute -right-20 -bottom-40 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl" />
        </div>

        <motion.form
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSearch}
          className={`w-full max-w-md sm:max-w-lg backdrop-blur-xl border rounded-3xl p-6 sm:p-10 shadow-2xl z-10 ${isDark ? 'bg-slate-900/70 border-slate-700' : 'bg-white/80 border-slate-200'}`}
        >
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-br from-emerald-600 to-indigo-600 rounded-2xl shadow-xl">
              <ShieldCheck size={36} className="text-white" />
            </div>
          </div>

          <h1 className={`text-3xl sm:text-4xl font-black text-center mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Verify Agreement
          </h1>

          <p className={`text-center mb-6 text-sm sm:text-base ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Enter Agreement ID to view blockchain proof
          </p>

          <div className={`flex flex-col sm:flex-row rounded-xl overflow-hidden border-2 focus-within:border-emerald-500 ${isDark ? 'bg-slate-950 border-slate-700' : 'bg-white border-slate-300'}`}>
            <input
              name="search"
              placeholder="AG-123456..."
              className={`flex-1 bg-transparent px-4 py-3.5 outline-none font-mono text-base ${isDark ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'}`}
              autoFocus
            />
            <button 
              type="submit"
              className="mt-3 sm:mt-0 px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-indigo-600 text-white font-semibold flex items-center justify-center gap-2 hover:brightness-110"
            >
              <Search size={18} /> Verify
            </button>
          </div>
        </motion.form>
      </div>
    );
  }

  // ERROR (unchanged)
  if (error || !result) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 sm:p-6 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className={`w-full max-w-md p-6 sm:p-8 rounded-3xl text-center border shadow-2xl ${isDark ? 'bg-slate-900 border-red-900/30' : 'bg-white border-red-200'}`}>
          <AlertTriangle className="w-14 h-14 mx-auto mb-6 text-red-500" />
          <h2 className="text-2xl font-bold mb-4">Verification Failed</h2>
          <p className={`mb-6 text-sm sm:text-base ${isDark ? 'text-red-300' : 'text-red-700'}`}>{error}</p>
          <button onClick={() => window.location.href = '/verify/'} className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}>
            <Search size={18} /> Try Another
          </button>
        </motion.div>
      </div>
    );
  }

  // SUCCESS VIEW
  const blockchainDate = result.blockchainTimestamp?.seconds?.low 
    ? new Date(result.blockchainTimestamp.seconds.low * 1000) 
    : new Date();

  return (
    <div className={`min-h-screen pb-16 sm:pb-20 ${isDark ? 'bg-gradient-to-b from-slate-950 to-slate-900 text-slate-100' : 'bg-gradient-to-b from-slate-50 to-white text-slate-900'}`}>
      {/* Theme Toggle */}
      <button onClick={toggleTheme} className={`fixed top-4 right-4 z-50 p-3 rounded-full shadow-2xl ${isDark ? 'bg-slate-800/90 hover:bg-slate-700' : 'bg-white/90 hover:bg-slate-50 border'}`}>
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Header (unchanged) */}
      <header className={`pt-14 pb-20 sm:pb-24 px-4 sm:px-8 relative overflow-hidden ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-white/80'}`}>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-4 text-emerald-500 font-mono text-xs uppercase tracking-widest">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-70" />
                  <span className="relative rounded-full h-3 w-3 bg-emerald-500" />
                </div>
                VERIFIED ON-CHAIN
              </div>

              <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                Agreement Autopsy
              </h1>

              <p className={`mt-4 text-sm sm:text-base ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Cryptographically verified document from the ledger.
              </p>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-4">
              <div className={`p-4 rounded-2xl border text-sm ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-white/70 border-slate-200'}`}>
                <div className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <Calendar size={14} /> Validated
                </div>
                <div className="font-mono font-semibold">
                  {new Date().toLocaleString('en-GB', { timeZone: 'UTC' })} UTC
                </div>
              </div>

              <button onClick={handleDownload} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-indigo-600 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all text-sm">
                <FileDown size={18} /> Download PDF
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 -mt-12 relative z-10">
        {/* Status cards – now with equal height & better balance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-12 lg:mb-16">
          {/* Left column: two cards that stretch to match right height */}
          <div className="flex flex-col gap-5 lg:gap-6 h-full">
            {/* Content Integrity */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className={`rounded-2xl p-5 lg:p-6 border shadow-xl flex items-start gap-5 lg:gap-6 flex-1 min-h-0 ${isDark ? 'bg-slate-900/70 border-slate-700' : 'bg-white/90 border-slate-200'}`}
              style={{
                background: isDark 
                  ? 'linear-gradient(to top, rgba(15, 23, 42, 0.7) 0%, rgba(9, 180, 23, 0.15) 100%)'  // slate-950 → subtle orange at bottom
                  : 'linear-gradient(to top, rgba(255, 255, 255, 0.9) 0%, rgba(9, 180, 23, 0.15) 100%)', // white → very light orange at bottom
              }}
            >
              <div className={`p-4 lg:p-5 rounded-2xl flex-shrink-0 ${result.isContentTamperFree ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                <Lock size={28} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg lg:text-xl mb-1 lg:mb-2">Content Integrity</h3>
                <p className={`text-base lg:text-lg leading-relaxed ${result.isContentTamperFree ? 'text-emerald-500' : 'text-red-400'}`}>
                  {result.isContentTamperFree ? 'Hash matches – Tamper-free' : 'Integrity check failed'}
                </p>
              </div>
            </motion.div>

            {/* Blockchain Record */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={`rounded-2xl p-5 lg:p-6 border shadow-xl flex items-start gap-5 lg:gap-6 flex-1 min-h-0 ${isDark ? 'bg-slate-900/70 border-slate-700' : 'bg-white/90 border-slate-200'}`}
              style={{
                background: isDark 
                  ? 'linear-gradient(to top, rgba(15, 23, 42, 0.7) 0%, rgba(52, 9, 180, 0.2) 100%)'  // slate-950 → subtle orange at bottom
                  : 'linear-gradient(to top, rgba(255, 255, 255, 0.9) 0%, rgba(52, 9, 180, 0.2) 100%)', // white → very light orange at bottom
              }}
            >
              <div className="p-4 lg:p-5 rounded-2xl flex-shrink-0 bg-indigo-500/20 text-indigo-400">
                <Server size={28} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg lg:text-xl mb-1 lg:mb-2">Blockchain Record</h3>
                <p className="text-base lg:text-lg leading-relaxed" style={{ color: 'rgba(20, 9, 180, 0.86)'}}>
                  Sealed {blockchainDate.toLocaleDateString('en-GB')}
                </p>
              </div>
            </motion.div>
          </div>

          {/* Right column – unchanged from your last approved version */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={`rounded-2xl border shadow-xl overflow-hidden flex flex-col ${isDark ? 'bg-slate-900/70 border-slate-700' : 'bg-white/90 border-slate-200'}`}
            style={{
              background: isDark 
                ? 'linear-gradient(to bottom, rgba(15, 23, 42, 0.7) 0%, rgba(180, 83, 9, 0.15) 100%)'  // slate-950 → subtle orange at bottom
                : 'linear-gradient(to top, rgba(255, 255, 255, 0.9) 0%, rgba(245, 158, 11, 0.12) 100%)', // white → very light orange at bottom
            }}
          >
            {/* Clean centered heading – no background, no border */}
            <div className="pt-4 px-5 md:px-6 text-center font-bold text-lg md:text-xl">
              Version & Agreement ID
            </div>

            {/* 3:1 content area – no divider line */}
            <div className="flex flex-1">
              {/* Left 3/4 – Agreement Details */}
              <div className="w-3/4 p-5 md:p-6 md:p-8 space-y-5 md:space-y-7 font-mono flex flex-col justify-center z-10">
                <div>
                  <div className={`text-sm md:text-base font-semibold uppercase opacity-70 mb-1 md:mb-2 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                    Agreement ID
                  </div>
                  <div className="break-all font-medium text-base md:text-l lg:text-xl font-black text-amber-500 tracking-tighter drop-shadow-md">
                    {result.agreementId}
                  </div>
                </div>

                {result.parentId && (
                  <div>
                    <div className={`text-sm md:text-base font-semibold uppercase opacity-70 mb-1 md:mb-2 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                      Parent Agreement ID
                    </div>
                    <div className="break-all font-medium text-base md:text-l lg:text-xl font-black text-amber-500 tracking-tighter drop-shadow-md">
                      {result.parentId}
                    </div>
                  </div>
                )}
              </div>

              {/* Right 1/4 – Version centered, blends into gradient */}
              <div className="w-1/4 flex items-center justify-center p-4 md:p-6 relative z-10">
                <div className="text-center">
                  <div className={`text-xs md:text-sm font-semibold uppercase opacity-70 mb-1 md:mb-2 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                    Version
                  </div>
                  <div className="text-5xl md:text-6xl lg:text-7xl font-black text-amber-500 tracking-tighter drop-shadow-md">
                    v{result.version}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Signatories */}
        <div className="mb-12 lg:mb-16">
        <h2 className="text-2xl lg:text-3xl font-bold mb-6 lg:mb-8 flex items-center gap-3">
          <User size={24} /> Signatories
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          <AnimatePresence>
            {result.signatures.map((sig, i) => (
              <motion.div
                key={sig.signerId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                onClick={() => setSelectedSigner(sig)}
                className={`group relative rounded-2xl lg:rounded-3xl border overflow-hidden shadow-xl cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 ${isDark ? 'bg-slate-900/80 border-slate-700 hover:border-emerald-600/60' : 'bg-white border-slate-200 hover:border-emerald-500/60'}`}
              >
                {/* Status indicator line */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 lg:w-2 ${sig.valid ? 'bg-emerald-500' : 'bg-red-500'}`} />

                <div className="p-5 lg:p-7">
                  <div className="flex items-start justify-between mb-5 lg:mb-6">
                    <div className="flex items-center gap-4 lg:gap-6 min-w-0 flex-1">
                      {/* Avatar – larger on desktop */}
                      <div className={`w-14 h-14 lg:w-20 lg:h-20 rounded-2xl lg:rounded-3xl flex items-center justify-center text-2xl lg:text-3xl font-bold shadow-inner flex-shrink-0 ${isDark ? 'bg-slate-800 text-emerald-400' : 'bg-slate-100 text-emerald-600'}`}>
                        {sig.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className={`font-bold text-lg lg:text-2xl truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {sig.name}
                        </h4>
                        <div className="text-xs lg:text-sm font-mono text-slate-500 mt-1.5 lg:mt-2 break-all leading-relaxed">
                          {sig.signerId}
                        </div>
                      </div>
                    </div>

                    {/* Validity badge */}
                    <div className={`p-2 lg:p-3 rounded-full flex-shrink-0 ${sig.valid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {sig.valid ? <CheckCircle size={20} /> : <XCircle size={20} />}
                    </div>
                  </div>

                  {/* Footer info row */}
                  <div className="flex flex-wrap justify-between items-center text-xs lg:text-sm pt-4 lg:pt-5 border-t border-slate-700/40 lg:border-slate-700/30">
                    <span className="flex items-center gap-1.5 lg:gap-2 font-mono">
                      <Calendar size={14} /> {new Date(sig.signedAt).toLocaleDateString()}
                    </span>
                    <span className="text-emerald-400 font-medium group-hover:underline flex items-center gap-1 lg:gap-2">
                      Details <ExternalLink size={14} />
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

        {/* Document Content – justified */}
        <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className={`rounded-3xl shadow-2xl border overflow-hidden relative ${isDark ? 'bg-slate-900/70 border-slate-700' : 'bg-white border-slate-200'}`}
         >
             {/* Header Bar */}
             <div className={`px-4 md:px-10 py-4 md:py-5 border-b flex flex-wrap items-center justify-between gap-3 ${isDark ? 'bg-[#0f172a] border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                 <div className="flex items-center gap-3">
                     <div className="p-1.5 md:p-2 bg-blue-500 rounded-lg text-white shadow-lg"><FileText size={32}/></div>
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
             <div className={`p-5 md:p-12 relative ${isDark ? 'bg-slate-950/40' : 'bg-white'}`}>
                 {/* Watermark Pattern */}
                 <div 
                    className={`absolute inset-0 pointer-events-none opacity-[0.04] sm:opacity-[0.05] ${isDark ? 'bg-gray-400/10' : 'bg-gray-900/5'}`} 
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='${isDark ? '%239C92AC' : '%231E293B'}' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                      backgroundSize: '60px 60px',
                    }}
                  />
                 
                 {/* The Text - break-words handles wrapping, whitespace-pre-wrap preserves formatting */}
                 <div className={`max-w-4xl mx-auto font-serif text-sm sm:text-base md:text-lg lg:text-xl leading-relaxed whitespace-pre-wrap text-justify ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    {result.content}
                  </div>
                 
                 {/* Footer Seal */}
                 <div className="mt-8 pt-6 border-dashed border-slate-300/20 text-center relative z-10">
                    <div className="inline-flex flex-col items-center gap-1 opacity-40">
                        <Server size={14}/>
                        <span className="text-[10px] font-mono tracking-widest uppercase">End of Document</span>
                    </div>
                 </div> 
             </div>
         </motion.div>

        <div className="mt-12 text-center">
          <button onClick={() => window.location.href = '/verify/'} className={`inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-base transition-all shadow-xl ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}>
            <Search size={18} /> Verify Another
          </button>
        </div>
      </main>

      {/* SIGNER MODAL (unchanged) */}
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
              onClick={e => e.stopPropagation()}
              className={`w-full max-w-lg rounded-3xl overflow-hidden relative ${isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white'}`}
            >
              <div className="h-28 bg-gradient-to-r from-emerald-600 to-blue-600 relative">
                <button onClick={() => setSelectedSigner(null)} className="absolute top-4 right-4 p-2.5 bg-black/30 hover:bg-black/50 rounded-full text-white">
                  <X size={20} />
                </button>
                <div className="absolute -bottom-10 left-6">
                  <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-bold border-4 shadow-xl ${isDark ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-white text-slate-900'}`}>
                    {selectedSigner.name.charAt(0)}
                  </div>
                </div>
              </div>

              <div className="pt-14 px-6 pb-8">
                <div className="flex items-center justify-between mb-2">
                  <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {selectedSigner.name}
                  </h2>
                  {selectedSigner.valid && (
                    <div className="bg-emerald-500/20 p-2 rounded-full">
                      <CheckCircle size={20} className="text-emerald-400" />
                    </div>
                  )}
                </div>

                <div className={`flex items-center gap-2 text-sm mb-6 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  <CheckCircle size={16} /> Verified Signatory
                </div>

                <div className="space-y-4">
                  {selectedSigner.email && (
                    <div className={`p-4 rounded-2xl flex items-center gap-4 ${isDark ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
                      <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
                        <Mail size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-bold uppercase opacity-60 mb-1">Email</div>
                        <div className="text-sm break-all">{selectedSigner.email}</div>
                      </div>
                    </div>
                  )}

                  <div className={`p-4 rounded-2xl flex items-center gap-4 ${isDark ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
                    <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400">
                      <Fingerprint size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold uppercase opacity-60 mb-1">Signer ID</div>
                      <div className="font-mono text-sm break-all">{selectedSigner.signerId}</div>
                    </div>
                  </div>

                  <div className={`p-4 rounded-2xl flex items-center gap-4 ${isDark ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
                    <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400">
                      <Calendar size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold uppercase opacity-60 mb-1">Signed At</div>
                      <div className="text-sm">
                        {new Date(selectedSigner.signedAt).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })} UTC
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 text-center">
                  <span className={`inline-flex px-6 py-2.5 rounded-full text-sm font-bold uppercase tracking-wider ${selectedSigner.valid ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                    {selectedSigner.valid ? 'Valid Signature' : 'Invalid Signature'}
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