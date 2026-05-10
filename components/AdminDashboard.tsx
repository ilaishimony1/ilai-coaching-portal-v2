import React, { useMemo, useState, useCallback } from 'react';
import { Users, UserPlus, Palette, Settings2, RefreshCw, ChevronRight, Inbox, AlertCircle, Database, Cpu, Shield, Clock, GripVertical, ClipboardList, Dumbbell, Archive, Library, AlertTriangle, CheckCircle2 } from 'lucide-react';
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

// Returns progress 0–1, and a status string
const getProgramStatus = (startDate?: string, endDate?: string) => {
  if (!startDate || !endDate) return { progress: 0, status: 'none' as const };
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  const total = end - start;
  if (total <= 0) return { progress: 1, status: 'expired' as const };
  const elapsed = now - start;
  const progress = Math.min(Math.max(elapsed / total, 0), 1);
  const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 0) return { progress: 1, status: 'expired' as const };
  if (daysLeft <= 14) return { progress, status: 'critical' as const };
  if (progress >= 0.5) return { progress, status: 'warning' as const };
  return { progress, status: 'good' as const };
};

const statusStyles = {
  none:     { bar: 'bg-slate-700',    text: 'text-slate-500',   label: 'text-slate-600',   badge: 'bg-slate-800 border-slate-700 text-slate-500' },
  good:     { bar: 'bg-emerald-500',  text: 'text-emerald-400', label: 'text-emerald-600', badge: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' },
  warning:  { bar: 'bg-amber-500',    text: 'text-amber-400',   label: 'text-amber-600',   badge: 'bg-amber-500/10 border-amber-500/30 text-amber-400' },
  critical: { bar: 'bg-red-500',      text: 'text-red-400',     label: 'text-red-600',     badge: 'bg-red-500/10 border-red-500/30 text-red-400' },
  expired:  { bar: 'bg-red-700',      text: 'text-red-500',     label: 'text-red-700',     badge: 'bg-red-500/10 border-red-500/30 text-red-500' },
};

const AdminDashboard: React.FC<Props> = ({
  clients, fullClients, onOpenPortal, onEditPortal, onArchiveClient, onAddClient, onOpenBranding
}) => {
  const { cloudSync, cloudError, lastServerUpdate, checkIns, workoutLogs, archivedClients, savedWorkouts, unreadCheckInsCount, unreadWorkoutLogsCount } = useApp();

  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const checkInsThisWeek = useMemo(() => checkIns.filter(c => new Date(c.submittedAt).getTime() > oneWeekAgo).length, [checkIns]);
  const logsThisWeek = useMemo(() => workoutLogs.filter(l => new Date(l.loggedAt).getTime() > oneWeekAgo).length, [workoutLogs]);
  const totalUnread = unreadCheckInsCount + unreadWorkoutLogsCount;

  // Clients ending within 14 days, sorted by soonest first
  const endingSoon = useMemo(() => {
    const now = Date.now();
    return clients
      .filter(c => {
        if (!c.programEndDate) return false;
        const daysLeft = Math.ceil((new Date(c.programEndDate).getTime() - now) / (1000 * 60 * 60 * 24));
        return daysLeft >= 0 && daysLeft <= 14;
      })
      .map(c => ({
        id: c.id,
        name: c.name.split(' ')[0], // first name only
        daysLeft: Math.ceil((new Date(c.programEndDate!).getTime() - now) / (1000 * 60 * 60 * 24)),
      }))
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [clients]);

  // Drag-to-reorder state — starts from localStorage if available, else alphabetical
  const initialOrder = useMemo(() => {
    const saved = localStorage.getItem('ilai_client_order');
    if (saved) {
      try { return JSON.parse(saved) as string[]; } catch {}
    }
    return [...clients].sort((a, b) => a.name.localeCompare(b.name)).map(c => c.id);
  }, []);
  const [order, setOrder] = useState<string[]>(initialOrder);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Keep order in sync if clients list changes (new client added etc.)
  const orderedClients = useMemo(() => {
    const clientMap = new Map(clients.map(c => [c.id, c]));
    const known = order.filter(id => clientMap.has(id)).map(id => clientMap.get(id)!);
    const newOnes = clients.filter(c => !order.includes(c.id));
    return [...known, ...newOnes];
  }, [clients, order]);

  const handleDragStart = useCallback((id: string) => {
    setDraggedId(id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (id !== draggedId) setDragOverId(id);
  }, [draggedId]);

  const handleDrop = useCallback((targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    setOrder(prev => {
      const next = [...prev];
      const fromIdx = next.indexOf(draggedId);
      const toIdx = next.indexOf(targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, draggedId);
      localStorage.setItem('ilai_client_order', JSON.stringify(next));
      return next;
    });
    setDraggedId(null);
    setDragOverId(null);
  }, [draggedId]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverId(null);
  }, []);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-top-4 duration-700 pb-20">
      <header className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          {/* Sync status — compact on mobile */}
          <div className="flex items-center gap-3 bg-slate-900/40 border border-slate-800/60 p-3 md:p-4 pr-5 md:pr-8 rounded-2xl md:rounded-3xl backdrop-blur-xl">
            <div className={`p-2 md:p-3 rounded-xl md:rounded-2xl ${cloudSync.isSyncing ? 'bg-amber-500/10 text-amber-500' : (cloudError ? 'bg-red-500/10 text-red-500' : 'bg-blue-600/10 text-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.2)]')}`}>
              <Database size={18} className={cloudSync.isSyncing ? 'animate-spin' : ''} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${cloudError ? 'text-red-500' : 'text-blue-500'}`}>
                  {cloudSync.isSyncing ? 'Syncing…' : (cloudError ? 'Disconnected' : 'Live')}
                </p>
                <div className={`w-1.5 h-1.5 rounded-full ${cloudSync.isSyncing ? 'bg-amber-500 animate-pulse' : (cloudError ? 'bg-red-500' : 'bg-emerald-500')}`}></div>
              </div>
              {lastServerUpdate && (
                <div className="flex items-center gap-1 text-slate-500 mt-0.5">
                  <Clock size={9} />
                  <span className="text-[8px] font-black uppercase tracking-tighter">{lastServerUpdate.toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 md:gap-4 w-full md:w-auto">
            <button
              onClick={cloudSync.forceSync}
              disabled={cloudSync.isSyncing}
              className="flex items-center gap-2 px-4 py-2.5 md:px-5 md:py-3 bg-slate-900/60 border border-slate-800 rounded-xl md:rounded-2xl text-[9px] font-black uppercase text-slate-400 hover:text-blue-400 transition-all group disabled:opacity-50"
            >
              <RefreshCw size={12} className={cloudSync.isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
              <span className="hidden sm:inline">Manual Cloud Push</span>
              <span className="sm:hidden">Sync</span>
            </button>
            <button onClick={onAddClient} className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 md:px-8 md:py-4 rounded-xl md:rounded-2xl font-black text-xs tracking-widest uppercase flex items-center justify-center gap-2 md:gap-3 shadow-2xl transition-all active:scale-95">
              <UserPlus size={16} /> <span>Add Client</span>
            </button>
          </div>
        </div>

        <div className="flex justify-between items-end border-b border-white/5 pb-6 md:pb-8">
          <div>
            <h2 className="text-4xl md:text-7xl font-black brand-font uppercase text-white tracking-tighter leading-none">Command Center</h2>
            <p className="text-blue-500/60 font-black uppercase tracking-[0.4em] md:tracking-[0.6em] text-[10px] mt-2 md:mt-3 ml-1 flex items-center gap-2 md:gap-3">
              <Cpu size={10} /> Management Terminal
            </p>
          </div>
          <button onClick={onOpenBranding} className="p-3 md:p-4 bg-slate-950 border border-slate-900 rounded-xl md:rounded-2xl text-slate-700 hover:text-white transition-all group">
            <Palette size={18} className="group-hover:scale-110 transition-transform" />
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active Athletes" value={clients.length.toString()} icon={<Users className="text-blue-400" />} />
        <StatCard label="Workouts This Week" value={logsThisWeek.toString()} icon={<Dumbbell className="text-emerald-400" />} />
        <StatCard label="Unread Activity" value={totalUnread.toString()} icon={<ClipboardList className={totalUnread > 0 ? 'text-red-400' : 'text-slate-600'} />} alert={totalUnread > 0} />
        <StatCard label="In The Vault" value={archivedClients.length.toString()} icon={<Archive className="text-slate-500" />} />
        <EndingSoonCard clients={endingSoon} className="col-span-2 md:col-span-4" />
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
          {orderedClients.length === 0 ? (
            <div className="py-24 text-center border-2 border-dashed border-slate-900 rounded-[4rem] bg-slate-950/20">
              <Inbox className="mx-auto text-slate-800 mb-6" size={56} />
              <p className="text-slate-700 font-black uppercase text-sm tracking-widest">Roster Empty</p>
            </div>
          ) : (
            orderedClients.map(clientSummary => {
              const fullClient = fullClients.find(f => f.id === clientSummary.id);
              const { progress, status } = getProgramStatus(
                fullClient?.programStartDate ?? clientSummary.programStartDate,
                clientSummary.programEndDate
              );
              const styles = statusStyles[status];
              const daysLeft = clientSummary.programEndDate
                ? Math.ceil((new Date(clientSummary.programEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;
              const isDragging = draggedId === clientSummary.id;
              const isDragOver = dragOverId === clientSummary.id;

              return (
                <div
                  key={clientSummary.id}
                  draggable
                  onDragStart={() => handleDragStart(clientSummary.id)}
                  onDragOver={(e) => handleDragOver(e, clientSummary.id)}
                  onDrop={() => handleDrop(clientSummary.id)}
                  onDragEnd={handleDragEnd}
                  className={`glass-card p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border-slate-800/50 flex items-center justify-between group transition-all shadow-xl bg-slate-950/20
                    ${isDragging ? 'opacity-40 scale-[0.98]' : ''}
                    ${isDragOver ? 'border-blue-500/60 bg-blue-500/5 scale-[1.01]' : 'hover:border-blue-500/40'}
                  `}
                >
                  {/* Drag handle — hidden on mobile */}
                  <div className="hidden md:block mr-4 text-slate-800 group-hover:text-slate-600 cursor-grab active:cursor-grabbing transition-colors shrink-0">
                    <GripVertical size={20} />
                  </div>

                  <div className="flex items-center gap-4 md:gap-8 flex-1 min-w-0">
                    <div className="w-12 h-12 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-slate-900 border-2 border-slate-800 overflow-hidden relative shadow-inner shrink-0">
                      {clientSummary.avatar
                        ? <img src={clientSummary.avatar} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-slate-700 font-black italic text-sm md:text-2xl">IS</div>
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-lg md:text-3xl font-black text-white brand-font tracking-tight truncate">
                        {clientSummary.name}
                      </h4>
                      <div className="flex items-center gap-2 md:gap-4 mt-1 md:mt-2 flex-wrap">
                        <div className={`border px-2 py-0.5 md:px-3 md:py-1 rounded-lg ${styles.badge}`}>
                          <span className="text-[8px] md:text-[9px] uppercase font-black tracking-[0.1em]">
                            {clientSummary.programLength || '3'}M
                          </span>
                        </div>
                        <p className={`text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] ${styles.text}`}>
                          {daysLeft === null
                            ? 'No end date'
                            : daysLeft <= 0
                            ? 'Expired'
                            : `${daysLeft}d left`}
                        </p>
                      </div>

                      {/* Progress bar */}
                      {status !== 'none' && (
                        <div className="mt-2 md:mt-3 w-full max-w-[160px] md:max-w-[200px]">
                          <div className="h-1 md:h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${styles.bar}`}
                              style={{ width: `${Math.round(progress * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 md:gap-3 shrink-0 ml-2 md:ml-4">
                    <button
                      onClick={() => onEditPortal(clientSummary.id)}
                      className="p-3 md:p-5 bg-slate-950 rounded-xl md:rounded-2xl text-slate-600 hover:text-blue-400 transition-colors border border-white/5 group-hover:bg-slate-900 group-hover:border-blue-500/20"
                      title="Edit Protocol"
                    >
                      <Settings2 size={18} />
                    </button>
                    <button
                      onClick={() => onOpenPortal(clientSummary.id)}
                      className="px-4 py-3 md:px-10 md:py-5 bg-blue-600 rounded-xl md:rounded-2xl text-white font-black text-xs tracking-widest uppercase flex items-center justify-center gap-1 md:gap-3 hover:bg-blue-500 transition-all shadow-2xl active:scale-95 group/btn"
                    >
                      <span className="hidden sm:inline">Open Portal</span>
                      <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

const EndingSoonCard = ({ clients, className }: { clients: { id: string; name: string; daysLeft: number }[]; className?: string }) => (
  <div className={`glass-card p-5 md:p-7 rounded-[2rem] border-slate-800/60 bg-slate-950/20 shadow-2xl ${clients.length > 0 ? 'border-amber-500/20 bg-amber-500/5' : ''} ${className ?? ''}`}>
    <div className="flex items-center gap-3 mb-4">
      <div className={`p-2.5 rounded-xl border ${clients.length > 0 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-slate-950 border-slate-800 text-slate-600'}`}>
        {clients.length > 0 ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
      </div>
      <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Ending Soon — Next 14 Days</p>
    </div>
    {clients.length === 0 ? (
      <p className="text-sm font-black text-slate-700 uppercase tracking-widest">All clear ✓</p>
    ) : (
      <div className="flex flex-wrap gap-2">
        {clients.map(c => (
          <div key={c.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wide ${
            c.daysLeft <= 3
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : c.daysLeft <= 7
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-slate-900 border-slate-700 text-slate-300'
          }`}>
            {c.name}
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg ${
              c.daysLeft <= 3 ? 'bg-red-500/20 text-red-300' : c.daysLeft <= 7 ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-500'
            }`}>
              {c.daysLeft}d
            </span>
          </div>
        ))}
      </div>
    )}
  </div>
);

const StatCard = ({ label, value, icon, highlight, alert }: any) => (
  <div className={`glass-card p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border-slate-800/60 flex flex-col gap-4 md:gap-6 shadow-2xl relative overflow-hidden transition-all duration-500 ${alert ? 'border-red-500/30 bg-red-500/5' : highlight ? 'border-blue-500/40 bg-blue-600/5' : 'bg-slate-950/20'}`}>
    <div className={`w-fit p-3 md:p-4 bg-slate-950 rounded-2xl border border-slate-800 z-10 ${alert ? 'border-red-500/30' : highlight ? 'border-blue-500/40' : ''}`}>{icon}</div>
    <div className="z-10">
      <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-1">{label}</p>
      <p className={`text-4xl md:text-6xl font-black brand-font leading-none ${alert ? 'text-red-400' : highlight ? 'text-white' : 'text-slate-500'}`}>{value}</p>
    </div>
  </div>
);

export default AdminDashboard;