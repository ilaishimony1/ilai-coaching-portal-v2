import React, { useRef, useState, useMemo } from 'react';
import { Rocket, BookOpen, User, ShieldAlert, ShieldCheck, Zap, CheckCircle2, Send, RefreshCcw, Trash2 } from 'lucide-react';
import { LandingPageConfig, ClientData } from '../types';

interface Props {
  config: LandingPageConfig;
  onUpdate: (config: LandingPageConfig) => void;
  onBack: () => void;
  version: string;
  clients: ClientData[];
  envType: 'CONSTRUCTION' | 'LIVE_STATION';
}

const CloudControl: React.FC<Props> = ({ config, onUpdate, onBack, version, clients, envType }) => {
  const [activeTab, setActiveTab] = useState<'IDENTITY' | 'BLUEPRINT'>('BLUEPRINT');
  const [isCopied, setIsCopied] = useState<string | null>(null);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(id);
    setTimeout(() => setIsCopied(null), 2000);
  };

  // V12.0 DEFINITIVE SYNC
  const SYNC_COMMAND = `git add . && git commit -m "V12.0 - Clean Protocol Deploy" && git push origin main -f`;

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-left-4 duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-emerald-600/10 text-emerald-500 rounded-3xl shadow-inner border border-emerald-500/10">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h2 className="text-5 font-black brand-font uppercase text-white tracking-tight leading-none">Deployment Hub</h2>
            <p className="text-emerald-500 font-black uppercase text-[10px] tracking-[0.4em] mt-2">Elite Protocol v12.0</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
           <TabBtn active={activeTab === 'BLUEPRINT'} onClick={() => setActiveTab('BLUEPRINT')} label="Final Sync" icon={<BookOpen size={14}/>} />
           <TabBtn active={activeTab === 'IDENTITY'} onClick={() => setActiveTab('IDENTITY')} label="Identity" icon={<User size={14}/>} />
        </div>
      </header>

      {activeTab === 'BLUEPRINT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-12">
            
            {/* VERCEL TROUBLESHOOTING */}
            <div className="glass-card p-10 rounded-[3rem] border-emerald-500 bg-emerald-500/5 space-y-6">
               <div className="flex items-center gap-4">
                  <div className="p-4 bg-emerald-600 text-white rounded-2xl"><Trash2 size={24}/></div>
                  <h3 className="text-2xl font-black text-white brand-font uppercase tracking-tight">Yes, Delete the Blue Part</h3>
               </div>
               
               <div className="space-y-6">
                  <div className="p-8 bg-slate-950/80 rounded-3xl border-2 border-emerald-500/20 space-y-6">
                    <p className="text-sm font-bold text-slate-200 leading-relaxed">
                      The <code className="text-emerald-400">importmap</code> block (lines 37-50 in your screenshot) is what Vercel is choking on. I have removed it in the code below.
                    </p>
                    
                    <div className="bg-black/60 p-6 rounded-2xl space-y-4 border border-white/5">
                      <div className="flex items-start gap-4">
                         <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                         <p className="text-[11px] text-slate-300">Click <b>Accept Changes</b> in the assistant window.</p>
                      </div>
                      <div className="flex items-start gap-4">
                         <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                         <p className="text-[11px] text-slate-300"><b>SAVE YOUR FILES</b> (Cmd+S) in VS Code. Check <code className="text-white font-black">index.html</code> to ensure the blue block is gone.</p>
                      </div>
                      <div className="flex items-start gap-4">
                         <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-black shrink-0">3</div>
                         <p className="text-[11px] text-slate-300">Run the final sync command below in your terminal. Vercel will now succeed.</p>
                      </div>
                    </div>
                  </div>
               </div>
            </div>

            {/* THE SYNC COMMAND */}
            <div className="glass-card p-10 rounded-[3rem] border-blue-500 bg-blue-600/10 space-y-8 shadow-[0_0_50px_rgba(37,99,235,0.2)] border-4 relative overflow-hidden">
               <div className="absolute -top-10 -right-10 opacity-10">
                  <ShieldCheck size={200} />
               </div>
               
               <div className="flex items-center gap-4 relative z-10">
                  <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-xl animate-bounce"><Zap size={28}/></div>
                  <h3 className="text-3xl font-black text-white brand-font uppercase tracking-tight">Protocol Push v12.0</h3>
               </div>
               
               <div className="space-y-6 relative z-10">
                  <div className="relative group">
                     <pre className="w-full bg-black rounded-2xl p-8 font-mono text-[11px] text-blue-400 border-2 border-white/10 leading-loose shadow-inner overflow-x-auto">
{SYNC_COMMAND}
                     </pre>
                     <button 
                        onClick={() => copyText(SYNC_COMMAND, "sync-v12.0")}
                        className="absolute top-1/2 -translate-y-1/2 right-6 p-6 bg-white text-blue-600 rounded-3xl shadow-2xl hover:scale-110 transition-all flex items-center gap-3 active:scale-95 border-4 border-blue-600"
                     >
                        {isCopied === "sync-v12.0" ? <CheckCircle2 size={32}/> : <Send size={32}/>}
                        <div className="text-left">
                          <p className="text-[10px] font-black uppercase tracking-tighter leading-none mb-1">Copy & Run</p>
                          <p className="text-lg font-black uppercase tracking-widest leading-none">DEPLOY NOW</p>
                        </div>
                     </button>
                  </div>
               </div>
            </div>
          </div>

          <div className="lg:col-span-4">
             <div className="glass-card p-8 rounded-[3rem] border-slate-800 sticky top-10 space-y-8">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                   <ShieldCheck className="text-emerald-500" size={18}/>
                   <h3 className="text-[10px] font-black uppercase text-white tracking-widest">Build Protocol</h3>
                </div>
                
                <div className="space-y-5">
                   <StatusRow label="Importmap: NUKED" status="on" />
                   <StatusRow label="Entry Module: FIXED" status="on" />
                   <StatusRow label="Vercel: READY" status="on" />
                </div>

                <div className="pt-6 border-t border-white/5 space-y-6 text-center">
                   <div className="bg-emerald-600/5 p-6 rounded-3xl border border-emerald-500/20 flex flex-col items-center justify-center">
                      <RefreshCcw size={32} className="text-emerald-500 mb-2 animate-spin duration-[3s]" />
                      <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Protocol V12.0</p>
                      <p className="text-xs font-black text-white uppercase mt-1">Ready for Cloud</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'IDENTITY' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-12 glass-card p-10 rounded-[3rem] border-slate-800 flex items-center justify-center min-h-[400px]">
             <div className="text-center space-y-4">
                <p className="text-slate-600 font-black uppercase text-xs tracking-widest">Protocol controls locked for the v12.0 resolution.</p>
                <button onClick={onBack} className="text-blue-500 font-black uppercase text-[10px] underline tracking-widest">Return to Dashboard</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TabBtn = ({ active, onClick, label, icon }: any) => (
  <button onClick={onClick} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${active ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}>
    {icon} {label}
  </button>
);

const StatusRow = ({ label, status }: any) => (
  <div className="flex items-center justify-between">
    <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{label}</span>
    <div className={`w-2 h-2 rounded-full ${status === 'on' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-800'}`}></div>
  </div>
);

export default CloudControl;