
import React, { useState } from 'react';
import { RotateCcw, X, User, ShieldAlert, Archive, ChevronRight } from 'lucide-react';
import { ClientData } from '../types';

interface Props {
  clients: ClientData[];
  onRestore: (clientId: string) => void;
  onDelete: (clientId: string) => void;
  onOpenPortal: (clientId: string) => void;
}

const ArchivedDashboard: React.FC<Props> = ({ clients, onRestore, onDelete, onOpenPortal }) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-5xl font-black brand-font uppercase text-white tracking-tight leading-none">The Vault</h2>
          <p className="text-amber-500 font-bold uppercase text-[10px] tracking-[0.4em] mt-2 flex items-center gap-2">
            <ShieldAlert size={14} /> Archived Athletes & Protocols
          </p>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3">
          <Archive className="text-amber-500" />
          <span className="text-xs font-black uppercase text-white">{clients.length} Records Contained</span>
        </div>
      </header>

      {clients.length === 0 ? (
        <div className="py-32 text-center border-2 border-dashed border-slate-900 rounded-[4rem] bg-slate-950/20">
          <Archive className="mx-auto text-slate-800 mb-6" size={64} />
          <h4 className="text-xl font-black text-slate-700 uppercase brand-font">Vault Empty</h4>
          <p className="text-slate-800 font-bold uppercase text-[9px] tracking-widest mt-2">No archived protocols found in storage.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {clients.map(client => (
            <div key={client.id} className="glass-card p-8 rounded-[2.5rem] border-slate-800 grayscale hover:grayscale-0 transition-all duration-500 group relative overflow-hidden">
              {/* Deletion Confirmation Overlay - Styled like Video Gallery, Positioned Top */}
              {deletingId === client.id && (
                <div className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-start pt-16 p-6 animate-in fade-in duration-300">
                  <p className="text-white font-black brand-font uppercase text-sm mb-10 tracking-tight text-center">Erase Athlete Protocol?</p>
                  <div className="flex gap-4 w-full max-w-[200px]">
                    <button onClick={() => setDeletingId(null)} className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all">No</button>
                    <button onClick={() => { onDelete(client.id); setDeletingId(null); }} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 transition-all">Yes</button>
                  </div>
                </div>
              )}

              {/* Background Glow */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/5 blur-[50px] group-hover:bg-amber-500/10 transition-all"></div>
              
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-24 h-24 rounded-3xl bg-slate-900 border-2 border-white/5 overflow-hidden shadow-2xl transition-transform group-hover:scale-105">
                  {client.avatar ? (
                    <img src={client.avatar} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl font-black italic text-slate-700">IS</div>
                  )}
                </div>
                
                <div>
                  <h4 className="text-2xl font-black text-white uppercase brand-font tracking-tight">{client.name}</h4>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Dormant Protocol</p>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full pt-4">
                  <button 
                    onClick={() => onRestore(client.id)} 
                    className="flex flex-col items-center gap-2 p-4 bg-emerald-600/5 border border-emerald-500/20 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all group/btn"
                  >
                    <RotateCcw size={20} className="text-emerald-500 group-hover/btn:text-white" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Restore</span>
                  </button>
                  <button 
                    onClick={() => setDeletingId(client.id)} 
                    className="flex flex-col items-center gap-2 p-4 bg-red-600/5 border border-red-500/20 rounded-2xl hover:bg-red-600 hover:text-white transition-all group/btn"
                  >
                    <X size={20} className="text-red-500 group-hover/btn:text-white" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Erase</span>
                  </button>
                </div>

                <button 
                  onClick={() => onOpenPortal(client.id)}
                  className="w-full py-4 bg-slate-900 border border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  View Blueprint <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ArchivedDashboard;
