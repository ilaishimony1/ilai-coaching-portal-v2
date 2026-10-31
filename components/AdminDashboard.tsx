import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Plus, Palette, SlidersHorizontal, RefreshCw, ChevronRight, Inbox, AlertCircle, GripVertical, StickyNote, X } from 'lucide-react';
import { textDir } from './ui';
import { ClientSummary, ClientData } from '../types';
import { getBillingCycle, formatBillingDate, getMonthsActive, BillingCycle } from '../billing';
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
// Monthly members never expire — they just approach their next payment.
const getMonthlyStatus = (cycle: BillingCycle | null) => {
  if (!cycle) return { progress: 0, status: 'none' as const };
  return { progress: cycle.progress, status: cycle.daysUntil <= 3 ? 'warning' as const : 'good' as const };
};

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
  none:     { bar: 'bg-tick',   text: 'text-muted' },
  good:     { bar: 'bg-accent', text: 'text-muted' },
  warning:  { bar: 'bg-warn',   text: 'text-warn' },
  critical: { bar: 'bg-alert',  text: 'text-alert' },
  expired:  { bar: 'bg-alert',  text: 'text-alert' },
};

const AdminDashboard: React.FC<Props> = ({
  clients, fullClients, onOpenPortal, onEditPortal, onArchiveClient, onAddClient, onOpenBranding
}) => {
  const { cloudSync, cloudError, lastServerUpdate, checkIns, workoutLogs, archivedClients, savedWorkouts, unreadCheckInsCount, unreadWorkoutLogsCount, syncService } = useApp();

  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const checkInsThisWeek = useMemo(() => checkIns.filter(c => new Date(c.submittedAt).getTime() > oneWeekAgo).length, [checkIns]);
  const logsThisWeek = useMemo(() => workoutLogs.filter(l => new Date(l.loggedAt).getTime() > oneWeekAgo).length, [workoutLogs]);
  const totalUnread = unreadCheckInsCount + unreadWorkoutLogsCount;

  // Clients ending within 14 days, sorted by soonest first
  const endingSoon = useMemo(() => {
    const now = Date.now();
    return clients
      .filter(c => {
        if (c.billingType === 'monthly') return false;
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

  // Coach notes modal
  const [notesClient, setNotesClient] = useState<ClientData | null>(null);
  const [notesText, setNotesText] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const notesSavedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notesSaved, setNotesSaved] = useState(false);

  const openNotes = (client: ClientData) => {
    setNotesClient(client);
    setNotesText(client.coachNotes || '');
    setNotesSaved(false);
  };

  const saveNotes = async () => {
    if (!notesClient) return;
    setNotesSaving(true);
    await syncService.updateDocument('clients', notesClient.id, { coachNotes: notesText });
    setNotesSaving(false);
    setNotesSaved(true);
    if (notesSavedTimer.current) clearTimeout(notesSavedTimer.current);
    notesSavedTimer.current = setTimeout(() => setNotesSaved(false), 2000);
  };

  const statusText = cloudSync.isSyncing ? 'Syncing…' : (cloudError ? 'Disconnected' : 'Live');
  const statusColor = cloudSync.isSyncing ? 'text-warn' : (cloudError ? 'text-alert' : 'text-muted');
  const statusDot = cloudSync.isSyncing ? 'bg-warn animate-pulse' : (cloudError ? 'bg-alert' : 'bg-done');

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-3.5 pb-20 text-ink">
      <header className="flex justify-between items-center gap-3">
        <h1 className="text-2xl font-extrabold text-ink">Your clients</h1>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 text-[13px] font-bold ${statusColor}`}>
            <span className={`w-2 h-2 rounded-full ${statusDot}`} />
            {statusText}
            {lastServerUpdate && (
              <span className="text-xs font-medium text-muted">· {lastServerUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </span>
          <button
            onClick={onOpenBranding}
            aria-label="Branding"
            className="w-11 h-11 rounded-xl border border-edge bg-card text-muted hover:text-ink flex items-center justify-center shrink-0"
          >
            <Palette size={18} />
          </button>
        </div>
      </header>

      <div className="flex gap-2">
        <button
          onClick={cloudSync.forceSync}
          disabled={cloudSync.isSyncing}
          className="h-[46px] px-3.5 rounded-xl border border-edge bg-card text-muted hover:text-ink font-bold text-[15px] flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={16} className={cloudSync.isSyncing ? 'animate-spin' : ''} />
          Sync
        </button>
        <button
          onClick={onAddClient}
          className="flex-1 h-[46px] rounded-xl bg-accent text-onaccent font-extrabold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          <Plus size={18} strokeWidth={2.5} /> Add client
        </button>
      </div>

      {cloudError && (
        <div className="p-4 bg-card border border-alert rounded-2xl flex items-start gap-3">
          <AlertCircle className="text-alert shrink-0" size={20} />
          <div className="flex-1 min-w-0">
            <p className="text-alert text-[15px] font-bold">Lost the connection</p>
            <p className="text-muted text-[13px] mt-1 leading-relaxed break-words">{cloudError}</p>
            <button onClick={() => window.location.reload()} className="mt-3 h-11 px-4 bg-alert text-onaccent rounded-xl text-sm font-extrabold">Reload</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard label="Active athletes" value={Math.max(0, clients.length - 2).toString()} />
        <StatCard label="Workouts this week" value={logsThisWeek.toString()} />
        <StatCard label="Unread" value={totalUnread.toString()} alert={totalUnread > 0} />
        <StatCard label="Archived" value={archivedClients.length.toString()} />
      </div>
      <EndingSoonCard clients={endingSoon} />

      <h2 className="text-base font-extrabold text-ink pt-1.5">Current clients</h2>

      <div className="flex flex-col gap-3">
        {orderedClients.length === 0 ? (
          <div className="py-16 text-center border-[1.5px] border-dashed border-tick rounded-2xl">
            <Inbox className="mx-auto text-muted mb-3" size={36} />
            <p className="text-muted font-semibold text-[15px]">No clients yet</p>
          </div>
        ) : (
          orderedClients.map(clientSummary => {
            const fullClient = fullClients.find(f => f.id === clientSummary.id);
            const isMonthly = (fullClient?.billingType ?? clientSummary.billingType) === 'monthly';
            const startDate = fullClient?.programStartDate ?? clientSummary.programStartDate;
            const cycle = isMonthly
              ? getBillingCycle(fullClient?.billingAnchorDate ?? clientSummary.billingAnchorDate)
              : null;
            const { progress, status } = isMonthly
              ? getMonthlyStatus(cycle)
              : getProgramStatus(startDate, clientSummary.programEndDate);
            const styles = statusStyles[status];
            const monthsActive = isMonthly ? getMonthsActive(startDate) : null;
            const daysLeft = clientSummary.programEndDate
              ? Math.ceil((new Date(clientSummary.programEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null;
            const isDragging = draggedId === clientSummary.id;
            const isDragOver = dragOverId === clientSummary.id;
            const hasNotes = !!fullClient?.coachNotes;
            const firstName = clientSummary.name.split(' ')[0] || 'Client';
            const programMonths = clientSummary.programLength || '3';

            return (
              <div
                key={clientSummary.id}
                draggable
                onDragStart={() => handleDragStart(clientSummary.id)}
                onDragOver={(e) => handleDragOver(e, clientSummary.id)}
                onDrop={() => handleDrop(clientSummary.id)}
                onDragEnd={handleDragEnd}
                className={`flex flex-col gap-3 bg-card border rounded-[18px] p-3.5 group transition-all
                  ${isDragging ? 'opacity-40' : ''}
                  ${isDragOver ? 'border-accent' : 'border-edge'}
                `}
              >
                <div className="flex items-center gap-3">
                  {/* Drag handle — desktop only */}
                  <div className="hidden md:block text-tick group-hover:text-muted cursor-grab active:cursor-grabbing shrink-0">
                    <GripVertical size={20} />
                  </div>
                  <div className="w-12 h-12 rounded-[14px] bg-raised overflow-hidden shrink-0 flex items-center justify-center text-accent text-xl font-extrabold">
                    {clientSummary.avatar
                      ? <img src={clientSummary.avatar} className="w-full h-full object-cover" alt="" />
                      : (clientSummary.name[0] || '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <span className="text-lg font-extrabold text-ink truncate">{clientSummary.name}</span>
                    <span className="flex items-center gap-2 text-[13px] text-muted flex-wrap">
                      <span className="font-bold text-accent bg-raised px-2 py-0.5 rounded-md">
                        {isMonthly ? 'Monthly' : `${programMonths} month${programMonths === '1' ? '' : 's'}`}
                      </span>
                      <span className={styles.text}>
                        {isMonthly
                          ? !cycle
                            ? 'No payment date'
                            : cycle.daysUntil <= 0
                            ? 'Renews today'
                            : cycle.daysUntil === 1
                            ? 'Renews tomorrow'
                            : `Renews ${formatBillingDate(cycle.next)}`
                          : daysLeft === null
                          ? 'No end date'
                          : daysLeft <= 0
                          ? 'Ended'
                          : `${daysLeft} days left`}
                        {isMonthly && monthsActive !== null && monthsActive > 0 && (
                          <span> · {monthsActive} mo in</span>
                        )}
                      </span>
                    </span>
                  </div>
                </div>

                {status !== 'none' && (
                  <div className="h-1.5 rounded-full bg-field overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${styles.bar}`}
                      style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => openNotes(fullClient || { ...clientSummary, goals: [], schedule: [], workouts: [] })}
                    aria-label="Coach notes"
                    title="Coach notes"
                    className={`relative w-11 h-11 rounded-xl border border-edge bg-card flex items-center justify-center shrink-0 ${hasNotes ? 'text-warn' : 'text-muted hover:text-ink'}`}
                  >
                    <StickyNote size={18} />
                    {hasNotes && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-warn" />}
                  </button>
                  <button
                    onClick={() => onEditPortal(clientSummary.id)}
                    aria-label="Edit program"
                    title="Edit program"
                    className="w-11 h-11 rounded-xl border border-edge bg-card text-muted hover:text-ink flex items-center justify-center shrink-0"
                  >
                    <SlidersHorizontal size={18} />
                  </button>
                  <button
                    onClick={() => onOpenPortal(clientSummary.id)}
                    className="flex-1 min-w-0 h-11 rounded-xl bg-accent text-onaccent text-[15px] font-extrabold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
                  >
                    <span className="truncate">Open {firstName}'s page</span>
                    <ChevronRight size={16} strokeWidth={2.5} className="shrink-0" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Coach notes */}
      {notesClient && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6">
          <div className="absolute inset-0 bg-black/70" onClick={() => setNotesClient(null)} />
          <div
            className="relative w-full max-w-lg bg-card border border-edge rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line">
              <div className="flex items-center gap-3 min-w-0">
                <StickyNote size={18} className="text-warn shrink-0" />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-muted">Private notes · only you see these</p>
                  <h3 className="text-lg font-extrabold text-ink truncate">{notesClient.name}</h3>
                </div>
              </div>
              <button onClick={() => setNotesClient(null)} aria-label="Close" className="w-11 h-11 rounded-xl border border-edge bg-raised text-muted hover:text-ink flex items-center justify-center shrink-0">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4">
              <textarea
                value={notesText}
                onChange={e => setNotesText(e.target.value)}
                placeholder="Injuries, goals, reminders, renewal dates…"
                rows={8}
                {...textDir(notesText)}
                className="w-full bg-field border-[1.5px] border-edge rounded-2xl px-4 py-3 text-[15px] text-ink font-medium resize-none focus:outline-none focus:border-accent leading-relaxed"
                autoFocus
              />
            </div>
            <div className="px-5 pb-5 flex items-center justify-between gap-3">
              <span className={`text-[13px] font-semibold ${notesSaved ? 'text-done' : 'text-muted'}`}>
                {notesSaved ? 'Saved ✓' : `${notesText.length} characters`}
              </span>
              <button
                onClick={saveNotes}
                disabled={notesSaving}
                className="h-11 px-5 bg-warn text-onaccent font-extrabold text-[15px] rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                {notesSaving ? 'Saving…' : 'Save notes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const EndingSoonCard = ({ clients }: { clients: { id: string; name: string; daysLeft: number }[] }) => (
  <div className="flex justify-between items-center gap-2.5 bg-card rounded-[14px] px-3.5 py-3 flex-wrap">
    <span className="text-sm font-semibold text-muted">Ending in the next 14 days</span>
    {clients.length === 0 ? (
      <span className="text-sm font-bold text-done">All clear</span>
    ) : (
      <div className="flex flex-wrap gap-1.5">
        {clients.map(c => (
          <span key={c.id} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-raised text-[13px] font-bold ${
            c.daysLeft <= 3 ? 'text-alert' : c.daysLeft <= 7 ? 'text-warn' : 'text-ink'
          }`}>
            {c.name}
            <span className="font-semibold text-muted">{c.daysLeft === 1 ? '1 day' : `${c.daysLeft} days`}</span>
          </span>
        ))}
      </div>
    )}
  </div>
);

const StatCard = ({ label, value, alert }: { label: string; value: string; alert?: boolean }) => (
  <div className="flex flex-col gap-1 bg-card rounded-[14px] px-3.5 py-3">
    <span className="text-[13px] font-semibold text-muted">{label}</span>
    <span className={`text-[30px] font-extrabold leading-tight ${alert ? 'text-alert' : 'text-ink'}`}>{value}</span>
  </div>
);

export default AdminDashboard;
