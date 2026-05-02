import React, { useMemo } from 'react';
import { Users, UserPlus, Palette, Settings2, RefreshCw, ChevronRight, Inbox, AlertCircle, Database, Cpu, Shield, Clock } from 'lucide-react';
import { ClientSummary, ClientData } from '../types';
import { useApp } from '../AppContext';

interface Props {
  clients: ClientSummary[];
  fullClients: ClientData[];
  onOpenPortal: (id: string) => void;
  onEditPortal: (id: string) => void;
  onArchiveClient: (id: string) => void;
  onAddClient: () => void;
  onOpenBranding: () => void;
  version: string;
  isMasterNode: boolean;
}

const AdminDashboard: React.FC<Props> = ({
  clients, onOpenPortal, onEditPortal, onArchiveClient, onAddClient, onOpenBranding
}) => {
  const { cloudSync, cloudError, lastServerUpdate } = useApp();

  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => a.name.localeCompare(b.name));
  }, [clients]);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-top-4 duration-700 pb-20">
      <header className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4 bg-slate-900/40 border border-slate-800/60 p-4 pr-8 rounded-3xl backdrop-blur-xl">
            <div className={`p-3 rounded-2xl ${cloudSync.isSyncing ? 'bg-amber-500/10 text-amber-500' : (cloudError ? 'bg-red-500/10 text-red-500' : 'bg-blue-600/10 text-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.2)]')}`}>
              <Database size={24} className={cloudSync.isSyncing ? 'animate-spin' : ''} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${cloudError ? 'text-red-500' : 'text-blue-500'}`}>
                  Server: {cloudSync.isSyncing ? 'Syncing...' : (cloudError ? 'Disconnected' : 'Live')}
                </p>
                <div className={`w-1.5 h-1.5 rounded-full ${cloudSync.isSyncing ? 'bg-amber-500 animate-pulse' : (cloudError ? 'bg-red-500' : 'bg-emerald-500')}`}></div>
              </div>
              <div className="flex items-center gap-3 mt-1">
                {lastServerUpdate ? (
                  <div className="flex items-center gap-1 text-slate-500">
                    <Clock size={10} />
                    <span className="text-[8px] font-black uppercase tracking-tighter">Last Sync: {lastServerUpdate.toLocaleTimeString()}</span>
                  </div>
                ) : (
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Awaiting Neural Link...</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={cloudSync.forceSync}
              disabled={cloudSync.isSyncing}
              className="flex items-center gap-2 px-5 py-3 bg-slate-900/60 border border-slate-800 rounded-2xl text-[9px] font-black uppercase text-slate-400 hover:text-blue-400 transition-all group disabled:opacity-50"
            >
              <RefreshCw size={12} className={cloudSync.isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
              Manual Cloud Push
            </button>
            <button onClick={onAddClient} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black text-xs tracking-widest uppercase flex items-center gap-3 shadow-2xl transition-all active:scale-95">
              <UserPlus size={18} /> Add Client
            </button>
          </div>
        </div>

        <div className="flex justify-between items-end border-b border-white/5 pb-8">
          <div>
            <h2 className="text-7xl font-black brand-font uppercase text-white tracking-tighter leading-none">Command Center</h2>
            <p className="text-blue-500/60 font-black uppercase tracking-[0.6em] text-[10px] mt-3 ml-1 flex items-center gap-3">
              <Cpu size={12} /> Management Terminal
            </p>
          </div>
          <button onClick={onOpenBranding} className="p-4 bg-slate-950 border border-slate-900 rounded-2xl text-slate-700 hover:text-white transition-all group">
            <Palette size={20} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </header>

      {cloudError && (
        <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-3xl flex items-start gap-4 animate-in slide-in-from-left-4 duration-500">
          <AlertCircle className="text-red-500 shrink-0" size={24} />
          <div className="flex-1">
            <p className="text-red-500 text-xs font-black uppercase tracking-widest">Connection Interrupted</p>
            <p className="text-slate-400 text-[11px] mt-1 leading-relaxed font-bold">{cloudError}</p>
            <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">Re-Initialize Session</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
        <StatCard label="Active Athletes" value={clients.length.toString()} icon={<Users className="text-blue-400" />} />
      </div>

      <div className="space-y-6 pt-8">
        <div className="flex items-center justify-between px-4">
          <h3 className="text-[11px] font-black uppercase text-slate-600 tracking-[0.4em]">Current Roster</h3>
          <div className="flex items-center gap-2 text-blue-500/40 bg-blue-500/5 px-4 py-1.5 rounded-full border border-blue-500/10">
            <Shield size={10} />
            <span className="text-[8px] font-black uppercase tracking-widest">Protocol Sync Secured</span>
          </div>
        </div>

        <div className="grid gap-6">
          {sortedClients.length === 0 ? (
            <div className="py-24 text-center border-2 border-dashed border-slate-900 rounded-[4rem] bg-slate-950/20">
              <Inbox className="mx-auto text-slate-800 mb-6" size={56} />
              <p className="text-slate-700 font-black uppercase text-sm tracking-widest">Roster Empty</p>
            </div>
          ) : (
            sortedClients.map(clientSummary => (
              <div key={clientSummary.id} className="glass-card p-8 rounded-[2.5rem] border-slate-800/50 flex items-center justify-between group hover:border-blue-500/40 transition-all shadow-xl bg-slate-950/20">
                <div className="flex items-center gap-8">
                  <div className="w-20 h-20 rounded-3xl bg-slate-900 border-2 border-slate-800 overflow-hidden relative shadow-inner">
                    {clientSummary.avatar
                      ? <img src={clientSummary.avatar} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-slate-700 font-black italic text-2xl">IS</div>
                    }
                  </div>
                  <div>
                    <h4 className="text-3xl font-black text-white brand-font tracking-tight">
                      {clientSummary.name}
                    </h4>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-lg">
                        <span className="text-[9px] text-red-500 uppercase font-black tracking-[0.1em]">{clientSummary.programLength || '3'} Month Protocol</span>
                      </div>
                      <div className="w-1 h-1 rounded-full bg-slate-800"></div>
                      <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${clientSummary.programEndDate && new Date(clientSummary.programEndDate) < new Date() ? 'text-red-500' : 'text-slate-500'}`}>
                        Ends: {clientSummary.programEndDate ? new Date(clientSummary.programEndDate).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => onEditPortal(clientSummary.id)} className="p-5 bg-slate-950 rounded-2xl text-slate-600 hover:text-blue-400 transition-colors border border-white/5 group-hover:bg-slate-900 group-hover:border-blue-500/20" title="Edit Protocol">
                    <Settings2 size={24} />
                  </button>
                  <button onClick={() => onOpenPortal(clientSummary.id)} className="px-10 py-5 bg-blue-600 rounded-2xl text-white font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 hover:bg-blue-500 transition-all shadow-2xl active:scale-95 group/btn">
                    Open Portal <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, highlight }: any) => (
  <div className={`glass-card p-10 rounded-[3rem] border-slate-800/60 flex flex-col gap-6 shadow-2xl relative overflow-hidden transition-all duration-500 ${highlight ? 'border-blue-500/40 bg-blue-600/5' : 'bg-slate-950/20'}`}>
    <div className={`w-fit p-4 bg-slate-950 rounded-2xl border border-slate-800 z-10 ${highlight ? 'border-blue-500/40 shadow-[0_0_40px_rgba(37,99,235,0.1)]' : ''}`}>{icon}</div>
    <div className="z-10">
      <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mb-1">{label}</p>
      <p className={`text-6xl font-black brand-font leading-none ${highlight ? 'text-white' : 'text-slate-500'}`}>{value}</p>
    </div>
    {highlight && <div className="absolute inset-0 bg-blue-600/5 animate-pulse pointer-events-none"></div>}
  </div>
);

export default AdminDashboard;