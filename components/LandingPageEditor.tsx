
import React, { useRef } from 'react';
import { Save, ChevronLeft, Upload, X, Image as ImageIcon, Camera, User } from 'lucide-react';
import { LandingPageConfig } from '../types';

interface Props {
  config: LandingPageConfig;
  onUpdate: (config: LandingPageConfig) => void;
  onBack: () => void;
}

const LandingPageEditor: React.FC<Props> = ({ config, onUpdate, onBack }) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => onUpdate({ ...config, logoUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => onUpdate({ ...config, coachAvatar: reader.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-left-4 duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black brand-font uppercase text-white tracking-tight">Portal Branding</h2>
          <p className="text-blue-500 font-black uppercase text-[10px] tracking-[0.4em] mt-2">Visual Identity Settings</p>
        </div>
        <button onClick={onBack} className="text-slate-500 hover:text-white flex items-center gap-2 uppercase font-black text-[10px] tracking-widest transition-colors">
          <ChevronLeft size={16}/> Back
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 glass-card p-10 rounded-[3rem] border-slate-800 space-y-10 shadow-2xl">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Logo Upload Section */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Portal Logo (Lock Screen)</label>
              <div className="flex flex-col gap-4">
                {config.logoUrl ? (
                  <div className="relative w-full aspect-square bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden group">
                    <img src={config.logoUrl} alt="Portal Logo" className="max-w-[80%] max-h-[80%] object-contain" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      <button onClick={() => logoInputRef.current?.click()} className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"><Upload size={20} /></button>
                      <button onClick={() => onUpdate({ ...config, logoUrl: undefined })} className="p-3 bg-red-500/20 hover:bg-red-500/40 rounded-full text-red-500 transition-colors"><X size={20} /></button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => logoInputRef.current?.click()} className="w-full aspect-square border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-3 text-slate-600 hover:text-blue-500 hover:border-blue-500/40 transition-all group">
                    <ImageIcon size={32} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-center px-4">Upload Logo</span>
                  </button>
                )}
                <input type="file" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
              </div>
            </div>

            {/* Coach Avatar Section */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Coach Profile Photo</label>
              <div className="flex flex-col gap-4">
                <div 
                  onClick={() => avatarInputRef.current?.click()}
                  className="relative w-full aspect-square rounded-[3rem] bg-slate-950 border-2 border-dashed border-slate-800 overflow-hidden group cursor-pointer hover:border-blue-500/50 transition-all flex items-center justify-center"
                >
                  {config.coachAvatar ? (
                    <img src={config.coachAvatar} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-700">
                      <User size={40} strokeWidth={1} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Set Avatar</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity backdrop-blur-[2px]">
                    <Camera className="text-white w-8 h-8 mb-1" />
                    <span className="text-[8px] font-black uppercase text-white tracking-widest">Update Headshot</span>
                  </div>
                  {config.coachAvatar && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onUpdate({ ...config, coachAvatar: undefined }); }}
                      className="absolute top-4 right-4 p-2 bg-red-500/80 text-white rounded-xl hover:bg-red-500 transition-all z-10"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <input type="file" ref={avatarInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Portal Title</label>
            <input 
              value={config.title} 
              onChange={e => onUpdate({...config, title: e.target.value})} 
              className="w-full bg-slate-950 border border-slate-800 p-6 rounded-[1.5rem] text-white font-black uppercase text-xl outline-none focus:ring-2 ring-blue-600 transition-all brand-font" 
            />
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Accent Color</label>
            <div className="flex gap-6 items-center">
              <input 
                type="color" 
                value={config.accentColor} 
                onChange={e => onUpdate({...config, accentColor: e.target.value})} 
                className="w-24 h-24 bg-slate-950 border-4 border-slate-800 rounded-[2rem] p-0 cursor-pointer overflow-hidden outline-none transition-transform hover:scale-105" 
              />
              <p className="text-sm text-slate-400 font-medium">Global interface accent color.</p>
            </div>
          </div>

          <button onClick={onBack} className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-4 transition-all">
            <Save size={18}/> PUBLISH BRANDING
          </button>
        </div>
        
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-card p-8 rounded-[3rem] border-slate-800/50">
            <h3 className="text-xl font-black brand-font uppercase text-white mb-6">Identity Preview</h3>
            <div className="space-y-8">
              <div className="flex items-center gap-4 p-4 bg-slate-950/50 rounded-2xl border border-white/5">
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center overflow-hidden">
                   {config.coachAvatar ? <img src={config.coachAvatar} className="w-full h-full object-cover" /> : <User className="text-white" />}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Command Profile</p>
                  <p className="text-sm font-black text-white uppercase mt-1">Ilai Shimon Verified</p>
                </div>
              </div>
              <div className="p-6 bg-slate-900/40 rounded-3xl border-l-4 border-blue-600 italic">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800">
                    {config.coachAvatar && <img src={config.coachAvatar} className="w-full h-full object-cover" />}
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">Coach Directives</span>
                </div>
                <p className="text-xs text-slate-400">"This is how your notes will appear to your athletes with your profile identity attached."</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPageEditor;
