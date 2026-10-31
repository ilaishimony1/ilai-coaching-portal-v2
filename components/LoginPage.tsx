
import React, { useState } from 'react';
import { User, Lock, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { LandingPageConfig } from '../types';

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
    <div className="min-h-screen bg-page text-ink flex flex-col justify-center px-6 py-10">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-7">
        {/* The approved see-through logo. The handstand figure is the Y of Shimony. */}
        <img
          src="/logo-clear.png"
          alt="Ilai Shimony, 1:1 online coaching"
          className="w-[290px] max-w-full h-auto self-center"
        />

        <form onSubmit={handleFormSubmit} className="flex flex-col gap-3.5 bg-card border border-edge rounded-3xl p-[22px]">
          <h1 className="text-[22px] font-extrabold">Log in</h1>

          {error && (
            <div className="bg-alert/10 border border-alert/40 p-3 rounded-[14px] flex items-center gap-2.5">
              <AlertCircle className="text-alert shrink-0" size={18} />
              <p className="text-alert text-sm font-semibold">{error}</p>
            </div>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-muted">Username</span>
            <span className="flex items-center gap-2.5 h-[52px] rounded-[14px] border-[1.5px] border-edge bg-field px-3.5 text-muted focus-within:border-accent transition-colors">
              <User size={18} className="shrink-0" />
              <input
                value={u}
                onChange={e => { setU(e.target.value); if(error) setError(null); }}
                autoCapitalize="none"
                autoCorrect="off"
                className="flex-1 min-w-0 bg-transparent border-0 text-ink text-base font-semibold outline-none"
                placeholder="Your username"
              />
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-muted">Password</span>
            <span className="flex items-center gap-2.5 h-[52px] rounded-[14px] border-[1.5px] border-edge bg-field pl-3.5 pr-1.5 text-muted focus-within:border-accent transition-colors">
              <Lock size={18} className="shrink-0" />
              <input
                type={showPassword ? "text" : "password"}
                value={p}
                onChange={e => { setP(e.target.value); if(error) setError(null); }}
                onKeyDown={checkCapsLock}
                onKeyUp={checkCapsLock}
                onFocus={checkCapsLock}
                className="flex-1 min-w-0 bg-transparent border-0 text-ink text-base font-semibold outline-none"
                placeholder="Your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="w-11 h-11 flex items-center justify-center text-muted hover:text-ink transition-colors shrink-0"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </span>
            {isCapsLock && <span className="text-[13px] font-semibold text-warn">Caps Lock is on</span>}
          </label>

          <button type="submit" className="mt-1 h-[54px] rounded-[14px] bg-accent text-onaccent text-[17px] font-extrabold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
            Log in <ArrowRight size={18} strokeWidth={2.5} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
