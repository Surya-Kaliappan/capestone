import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store';
import { api } from '../lib/api';
import { generateIdentityClient, encryptPrivateKeyClient } from '../lib/cryptoClient';
import { ShieldCheck, Lock, Mail, User, ArrowRight, Loader2 } from 'lucide-react';

// Configure Axios Base URL
// const api = axios.create({
//   baseURL: 'http://localhost:3000/api',
//   withCredentials: true, // Crucial for Cookies
// });

export default function Auth() {
  const { setCurrentUser } = useAppStore();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [sealingPassword, setSealingPassword] = useState('');

  const signUpProcess = () => {
    const {publicKeyPem, privateKeyPem} = generateIdentityClient();
    const encryptedDetails = encryptPrivateKeyClient(privateKeyPem, sealingPassword);

    return {
      email,
      password, // Login password
      name,
      clientIdentity: {
        publicKey: publicKeyPem,
        encryptedPrivateKey: encryptedDetails.encryptedData,
        iv: encryptedDetails.iv,
        salt: encryptedDetails.salt,
        authTag: encryptedDetails.authTag
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/signup';
      const payload = isLogin 
        ? { email, password } 
        : signUpProcess();

      const res = await api.post(endpoint, payload);
      
      // Success! Save user to store
      setCurrentUser(res.data.user);

    } catch (err: any) {
      console.log(err);
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#1e293b]/60 backdrop-blur-xl border border-slate-700 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-8 pb-0 text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-500/20 mb-6">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {isLogin ? 'Welcome Back' : 'Create Identity'}
          </h1>
          <p className="text-slate-400 text-sm">
            {isLogin ? 'Access your secure agreement vault.' : 'Set up your blockchain-secured account.'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex p-2 bg-slate-900/50 mx-8 mt-6 rounded-xl border border-slate-700/50">
          <button 
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${isLogin ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Login
          </button>
          <button 
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${!isLogin ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Register
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          
          {/* Name (Signup Only) */}
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Full Name</label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-3.5 text-slate-500" />
                <input 
                  type="text" 
                  value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email Address</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-3.5 text-slate-500" />
              <input 
                type="email" 
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                placeholder="name@company.com"
                required
              />
            </div>
          </div>

          {/* Login Password */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Login Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-3.5 text-slate-500" />
              <input 
                type="password" 
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {/* Sealing Password (Signup Only) */}
          {!isLogin && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="pt-2">
               <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-blue-400">
                    <ShieldCheck size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Sealing Password</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    This password encrypts your <span className="text-white font-semibold">Blockchain Private Key</span>. We cannot recover this if you forget it.
                  </p>
                  <input 
                    type="password" 
                    value={sealingPassword} onChange={(e) => setSealingPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 text-sm"
                    placeholder="Set a strong sealing password"
                    required
                  />
               </div>
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-medium text-center">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button 
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4"
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : (
               <>
                 {isLogin ? 'Sign In' : 'Create Account'}
                 <ArrowRight size={18} />
               </>
            )}
          </button>

        </form>
      </motion.div>
    </div>
  );
}