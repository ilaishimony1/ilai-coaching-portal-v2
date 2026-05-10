import React, { useState, useMemo } from 'react';
import { ClipboardList, Dumbbell, ChevronDown, ChevronUp, CheckCheck, Inbox, User, X, Info } from 'lucide-react';
import { WeeklyCheckIn, WorkoutLog, Workout } from '../types';
import { useApp } from '../AppContext';

const CHECKIN_FIELDS: { key: keyof WeeklyCheckIn; label: string }[] = [
  { key: 'programWeek',       label: 'Current Program Week' },
  { key: 'sessionsCompleted', label: 'Sessions Completed' },
  { key: 'followedProgram',   label: 'Followed Program as Prescribed?' },
  { key: 'smallWin',          label: 'Small Win This Week' },
  { key: 'mostImprovement',   label: 'Most Improvement' },
  { key: 'biggestChallenge',  label: 'Biggest Challenge' },
  { key: 'mostLimiting',      label: 'Most Limiting Factor' },
  { key: 'dontUnderstand',    label: "Doesn't Fully Understand" },
  { key: 'clearOnWork',       label: 'Clear on What to Work On' },
  { key: 'focusNextWeek',     label: 'Focus for Next Week' },
  { key: 'anythingElse',      label: 'Anything Else' },
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

type Tab = 'ALL' | 'REVIEWS' | 'WORKOUTS' | 'CLIENT';

type FeedItem =
  | { kind: 'checkin'; data: WeeklyCheckIn; date: number }
  | { kind: 'workout'; data: WorkoutLog;    date: number };

const CoachCheckIns: React.FC = () => {
  const { checkIns, markCheckInRead, workoutLogs, markWorkoutLogRead, clients } = useApp();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('ALL');
  const [filterClient, setFilterClient] = useState<string>('ALL');
  const [previewWorkout, setPreviewWorkout] = useState<{ workout: Workout; clientName: string } | null>(null);

  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [
      ...checkIns.map(c => ({ kind: 'checkin' as const, data: c, date: new Date(c.submittedAt).getTime() })),
      ...workoutLogs.map(l => ({ kind: 'workout' as const, data: l, date: new Date(l.loggedAt).getTime() })),
    ];
    return items.sort((a, b) => b.date - a.date);
  }, [checkIns, workoutLogs]);

  const filtered = useMemo(() => {
    let list = feed;
    if (tab === 'REVIEWS')  list = list.filter(i => i.kind === 'checkin');
    if (tab === 'WORKOUTS') list = list.filter(i => i.kind === 'workout');
    if (tab === 'CLIENT' || filterClient !== 'ALL') list = list.filter(i => i.data.clientId === filterClient);
    return list;
  }, [feed, tab, filterClient]);

  const totalUnread = useMemo(() =>
    feed.filter(i => !i.data.readByCoach).length,
  [feed]);

  // unread count per client (for +1 badge)
  const unreadPerClient = useMemo(() => {
    const map: Record<string, number> = {};
    feed.filter(i => !i.data.readByCoach).forEach(i => {
      map[i.data.clientId] = (map[i.data.clientId] || 0) + 1;
    });
    return map;
  }, [feed]);

  const clientsInFeed = useMemo(() => {
    const ids = new Set(feed.map(i => i.data.clientId));
    return clients.filter(c => ids.has(c.id));
  }, [feed, clients]);

  const handleExpand = async (item: FeedItem) => {
    const id = item.data.id;
    const isOpening = expandedId !== id;
    setExpandedId(isOpening ? id : null);
    if (isOpening && !item.data.readByCoach) {
      if (item.kind === 'checkin') await markCheckInRead(id);
      else await markWorkoutLogRead(id);
    }
  };

  const tabCounts = useMemo(() => ({
    ALL:      feed.filter(i => !i.data.readByCoach).length,
    REVIEWS:  feed.filter(i => i.kind === 'checkin' && !i.data.readByCoach).length,
    WORKOUTS: feed.filter(i => i.kind === 'workout' && !i.data.readByCoach).length,
  }), [feed]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-top-4 duration-700">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 border-b border-white/5 pb-6 md:pb-8">
        <div>
          <h2 className="text-4xl md:text-7xl font-black brand-font uppercase text-white tracking-tighter leading-none">Check-Ins</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] md:tracking-[0.5em] text-slate-600 mt-2 md:mt-3 ml-1">Client Activity Feed</p>
        </div>
        {totalUnread > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 bg-red-500/10 border border-red-500/30 rounded-xl md:rounded-2xl">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-[10px] md:text-[11px] font-black uppercase tracking-widest">
              {totalUnread} unread
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-3">
        {(['ALL', 'REVIEWS', 'WORKOUTS'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setFilterClient('ALL'); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              tab === t ? 'bg-blue-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-white'
            }`}
          >
            {t === 'REVIEWS'  && <ClipboardList size={12} />}
            {t === 'WORKOUTS' && <Dumbbell size={12} />}
            {t === 'ALL' ? 'All' : t === 'REVIEWS' ? 'Weekly Reviews' : 'Workouts'}
            {tabCounts[t] > 0 && (
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${tab === t ? 'bg-white/20 text-white' : 'bg-red-500 text-white'}`}>
                {tabCounts[t]}
              </span>
            )}
          </button>
        ))}
        <button
          onClick={() => { setTab('CLIENT'); setFilterClient('ALL'); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
            tab === 'CLIENT' ? 'bg-blue-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-white'
          }`}
        >
          <User size={12} />
          By Client
        </button>
      </div>

      {/* By Client picker */}
      {tab === 'CLIENT' && (
        <div className="space-y-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Select a client</p>
          <div className="flex gap-2 flex-wrap">
            {clientsInFeed.map(c => (
              <button
                key={c.id}
                onClick={() => setFilterClient(c.id)}
                className={`relative flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filterClient === c.id
                    ? 'bg-blue-600 text-white border border-blue-500'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600'
                }`}
              >
                {c.avatar
                  ? <img src={c.avatar} className="w-5 h-5 rounded-full object-cover" />
                  : <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[8px] font-black">{c.name[0]}</div>
                }
                {c.name.split(' ')[0]}
                {(unreadPerClient[c.id] || 0) > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-red-500 rounded-full text-[8px] font-black text-white flex items-center justify-center">
                    +{unreadPerClient[c.id]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Feed */}
      {filtered.length === 0 ? (
        <div className="py-24 text-center border-2 border-dashed border-slate-900 rounded-[4rem] bg-slate-950/20">
          <Inbox className="mx-auto text-slate-800 mb-6" size={56} />
          <p className="text-slate-700 font-black uppercase text-sm tracking-widest">Nothing here yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(item => {
            const id = item.data.id;
            const isOpen = expandedId === id;
            const unread = !item.data.readByCoach;
            const client = clients.find(c => c.id === item.data.clientId);
            const isReview = item.kind === 'checkin';
            const dateStr = formatDate(isReview ? (item.data as WeeklyCheckIn).submittedAt : (item.data as WorkoutLog).loggedAt);

            return (
              <div
                key={id}
                className={`glass-card rounded-[2rem] border-slate-800/50 overflow-hidden transition-all ${unread ? 'border-red-500/20' : ''}`}
              >
                <button
                  onClick={() => handleExpand(item)}
                  className="w-full px-4 py-4 md:px-8 md:py-6 flex items-center gap-3 md:gap-5 hover:bg-white/2 transition-colors group text-left"
                >
                  {/* Unread dot */}
                  <div className="w-2 shrink-0">
                    {unread && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                  </div>

                  {/* Type icon */}
                  <div className={`p-2.5 rounded-xl shrink-0 ${isReview ? 'bg-blue-600/10' : 'bg-slate-900 border border-slate-800'}`}>
                    {isReview
                      ? <ClipboardList size={16} className="text-blue-400" />
                      : <Dumbbell size={16} className="text-slate-400" />
                    }
                  </div>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0">
                    {client?.avatar
                      ? <img src={client.avatar} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><User size={14} className="text-slate-700" /></div>
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-black text-base ${unread ? 'text-white' : 'text-slate-300'}`}>
                        {item.data.clientName}
                      </span>
                      {unread && (
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-red-500 text-white rounded-lg">+1</span>
                      )}
                      {isReview ? (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border text-blue-400 bg-blue-500/10 border-blue-500/20">
                          Weekly Review
                        </span>
                      ) : (() => {
                        const log = item.data as WorkoutLog;
                        const workout = clients.find(c => c.id === log.clientId)?.workouts.find(w => w.name === log.workoutName);
                        return (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              if (workout) setPreviewWorkout({ workout, clientName: log.clientName });
                            }}
                            className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border text-slate-400 bg-slate-900 border-slate-700 hover:border-blue-500/50 hover:text-blue-400 transition-all"
                            title="View workout"
                          >
                            Workout {log.workoutName} ↗
                          </button>
                        );
                      })()}
                    </div>
                    <p className="text-[10px] font-bold text-slate-600 mt-1">{dateStr}</p>
                    {!isOpen && (
                      <p className="text-xs text-slate-500 font-medium mt-1 truncate">
                        {isReview
                          ? (item.data as WeeklyCheckIn).smallWin ? `"${(item.data as WeeklyCheckIn).smallWin}"` : ''
                          : (item.data as WorkoutLog).note
                        }
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!unread && <CheckCheck size={14} className="text-emerald-600" />}
                    {isOpen ? <ChevronUp size={16} className="text-slate-600" /> : <ChevronDown size={16} className="text-slate-600" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 md:px-8 md:pb-8 border-t border-white/5 pt-4 md:pt-6 animate-in fade-in duration-300">
                    {isReview ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {CHECKIN_FIELDS.map(field => (
                          <div key={field.key}>
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 mb-1">{field.label}</p>
                            <p className="text-sm font-medium text-slate-300 leading-relaxed">
                              {(item.data as WeeklyCheckIn)[field.key]
                                ? String((item.data as WeeklyCheckIn)[field.key])
                                : <span className="text-slate-700 italic">—</span>}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (() => {
                      const log = item.data as WorkoutLog;
                      const workout = clients.find(c => c.id === log.clientId)?.workouts.find(w => w.name === log.workoutName);

                      // Parse note into per-exercise map: "EXERCISE NAME: value"
                      const noteMap: Record<string, string> = {};
                      let generalNote = '';
                      log.note.split('\n').forEach(line => {
                        const colonIdx = line.indexOf(':');
                        if (colonIdx > 0) {
                          const key = line.slice(0, colonIdx).trim().toUpperCase();
                          const val = line.slice(colonIdx + 1).trim();
                          noteMap[key] = val;
                        } else if (line.trim()) {
                          generalNote += (generalNote ? ' ' : '') + line.trim();
                        }
                      });

                      return (
                        <div className="space-y-4">
                          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600">
                            Workout {log.workoutName} — {log.workoutTitle}
                          </p>

                          {workout ? (
                            <div className="space-y-1">
                              {/* Header row */}
                              <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-white/5 rounded-xl">
                                <div className="col-span-5 text-[8px] font-black uppercase text-slate-600 tracking-widest">Exercise</div>
                                <div className="col-span-3 text-[8px] font-black uppercase text-slate-600 tracking-widest">Prescribed</div>
                                <div className="col-span-4 text-[8px] font-black uppercase text-slate-600 tracking-widest">Logged</div>
                              </div>
                              {workout.exercises.map(ex => {
                                if (ex.category === 'header') return (
                                  <p key={ex.id} className="text-[9px] font-black uppercase tracking-widest text-slate-500 pt-3 pb-1 border-b border-white/5 px-4">{ex.name}</p>
                                );
                                const logged = noteMap[ex.name.toUpperCase()];
                                return (
                                  <div key={ex.id} className={`grid grid-cols-12 gap-2 px-4 py-3 rounded-xl ${logged ? 'bg-slate-900/60' : 'bg-slate-950/30'}`}>
                                    <div className="col-span-5 text-xs font-black text-white uppercase">{ex.name}</div>
                                    <div className="col-span-3 text-xs font-bold text-slate-500">{ex.sets}×{ex.reps || ex.duration}</div>
                                    <div className="col-span-4 text-xs font-bold">
                                      {logged
                                        ? <span className="text-emerald-400">{logged}</span>
                                        : <span className="text-slate-700 italic">not logged</span>
                                      }
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm font-medium text-slate-300 leading-relaxed whitespace-pre-line">{log.note}</p>
                          )}

                          {generalNote && (
                            <div className="pt-3 border-t border-white/5">
                              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 mb-1">Session Notes</p>
                              <p className="text-sm font-medium text-slate-400 leading-relaxed">{generalNote}</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {/* Workout preview modal */}
      {previewWorkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setPreviewWorkout(null)} />
          <div className="relative w-full max-w-2xl bg-[#0a0f1a] border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">

            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 md:px-8 md:py-6 border-b border-white/5 shrink-0">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-600 mb-1">{previewWorkout.clientName} · Sector {previewWorkout.workout.name}</p>
                <h3 className="text-2xl font-black brand-font uppercase text-white tracking-tight">{previewWorkout.workout.title}</h3>
              </div>
              <button onClick={() => setPreviewWorkout(null)} className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Exercise list */}
            <div className="overflow-y-auto px-5 py-4 md:px-8 md:py-6 space-y-2">
              {previewWorkout.workout.exercises.map(ex => {
                if (ex.category === 'header') {
                  return (
                    <p key={ex.id} className="text-xs font-black uppercase tracking-widest text-slate-500 pt-4 pb-1 border-b border-white/5">
                      {ex.name}
                    </p>
                  );
                }
                return (
                  <div key={ex.id} className="flex items-center justify-between px-4 py-3 bg-slate-950/60 border border-slate-800/50 rounded-2xl">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50 shrink-0" />
                      <span className="text-sm font-black text-white uppercase tracking-tight truncate">{ex.name}</span>
                      {ex.category === 'mobility' && (
                        <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest shrink-0">Mobility</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 shrink-0 ml-4">
                      <div className="text-right">
                        <span className="text-xs font-black text-blue-400">{ex.sets}</span>
                        <span className="text-slate-700 mx-1">×</span>
                        <span className="text-xs font-black text-white">{ex.reps || ex.duration}</span>
                      </div>
                      {ex.restTime && <span className="text-[10px] font-black text-amber-500">{ex.restTime}</span>}
                    </div>
                  </div>
                );
              })}
              {previewWorkout.workout.exercises.filter(e => e.category !== 'header').length === 0 && (
                <p className="text-slate-700 text-sm font-bold italic text-center py-8">No exercises added yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoachCheckIns;
