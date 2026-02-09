
import React, { useState } from 'react';
import { User, Lock, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { LandingPageConfig } from '../types';
import BrandLogo from './BrandLogo';

interface Props {
  onLogin: (u: string, p: string) => boolean;
  config: LandingPageConfig;
  version: string;
}

const LoginPage: React.FC<Props> = ({ onLogin, config, version }) => {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCapsLock, setIsCapsLock] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkCapsLock = (e: any) => {
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      setIsCapsLock(true);
    } else {
      setIsCapsLock(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
   try {
  const success = await onLogin(u, p);

  if (!success) {
    setError("Username or password are incorrect. Please try again.");
  }
} catch (err) {
  setError("Username or password are incorrect. Please try again.");
}

  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        
        {/* Logo Section */}
        <div className="text-center flex flex-col items-center pt-8">
          {config.logoUrl ? (
            <div 
              className="w-full max-w-[650px] mb-8 animate-in zoom-in duration-700 relative flex flex-col items-center justify-center"
            >
              <BrandLogo src={config.logoUrl} size="lg" />
            </div>
          ) : (
            <div className="mb-10">
              <BrandLogo />
            </div>
          )}
        </div>
        
        {/* Login Form Container */}
        <form onSubmit={handleFormSubmit} className="glass-card p-10 rounded-[3rem] border-white/5 shadow-2xl space-y-6 relative overflow-hidden mx-auto max-w-md w-full">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in duration-300">
              <AlertCircle className="text-red-500 shrink-0" size={18} />
              <p className="text-red-500 text-[10px] font-black uppercase tracking-widest">{error}</p>
            </div>
          )}

          <div className="relative">
            <input 
              value={u} 
              onChange={e => { setU(e.target.value); if(error) setError(null); }} 
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 font-bold text-white outline-none focus:ring-2 ring-blue-500 transition-all" 
              placeholder="Athlete Username" 
            />
            <User className="absolute left-4 top-4 text-slate-600" />
          </div>

          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              value={p} 
              onChange={e => { setP(e.target.value); if(error) setError(null); }}
              onKeyDown={checkCapsLock}
              onKeyUp={checkCapsLock}
              onFocus={checkCapsLock}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-20 py-4 font-bold text-white outline-none focus:ring-2 ring-blue-500 transition-all" 
              placeholder="Secure Password" 
            />
            <Lock className="absolute left-4 top-4 text-slate-600" />
            
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
              {isCapsLock && (
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center animate-pulse">
                  <span className="text-[10px] font-black text-amber-500">C</span>
                </div>
              )}
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-600 hover:text-blue-400 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button type="submit" className="w-full py-5 rounded-2xl text-white font-black text-xs tracking-widest uppercase flex items-center justify-center gap-4 transition-all shadow-xl hover:brightness-110 active:scale-95" style={{backgroundColor: config.accentColor}}>
            LOG IN <ArrowRight size={18} />
          </button>
        </form>

        <div className="text-center pt-8">
           <p className="text-[8px] text-slate-700 font-bold uppercase tracking-[0.5em]">Terminal V{version} // Secured Connection</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
