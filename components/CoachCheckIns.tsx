import React, { useState, useMemo } from 'react';
import { ClipboardList, Dumbbell, ChevronDown, ChevronUp, Check, Inbox, X, Calendar } from 'lucide-react';
import { niceCase, textDir, exerciseMeta } from './ui';
import { WeeklyCheckIn, WorkoutLog, Workout } from '../types';
import { useApp } from '../AppContext';

const CHECKIN_FIELDS: { key: keyof WeeklyCheckIn; label: string }[] = [
  { key: 'programWeek',       label: 'Current program week' },
  { key: 'sessionsCompleted', label: 'Sessions completed' },
  { key: 'followedProgram',   label: 'Followed program as planned?' },
  { key: 'smallWin',          label: 'Small win this week' },
  { key: 'mostImprovement',   label: 'Most improvement' },
  { key: 'biggestChallenge',  label: 'Biggest challenge' },
  { key: 'mostLimiting',      label: 'Most limiting factor' },
  { key: 'dontUnderstand',    label: "Doesn't fully understand" },
  { key: 'clearOnWork',       label: 'Clear on what to work on' },
  { key: 'focusNextWeek',     label: 'Focus for next week' },
  { key: 'anythingElse',      label: 'Anything else' },
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

type Tab = 'ALL' | 'REVIEWS' | 'WORKOUTS';

// Returns the Monday 00:00:00 timestamp for a given timestamp
const getWeekStart = (ts: number): number => {
  const d = new Date(ts);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const formatWeekLabel = (weekStart: number): string => {
  const thisWeekStart = getWeekStart(Date.now());
  const weeksAgo = Math.round((thisWeekStart - weekStart) / (7 * 24 * 60 * 60 * 1000));
  if (weeksAgo === 0) return 'This week';
  if (weeksAgo === 1) return 'Last week';
  const end = new Date(weekStart + 6 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(new Date(weekStart))} – ${fmt(end)}`;
};

type FeedItem =
  | { kind: 'checkin'; data: WeeklyCheckIn; date: number }
  | { kind: 'workout'; data: WorkoutLog;    date: number };

const CoachCheckIns: React.FC = () => {
  const { checkIns, markCheckInRead, workoutLogs, markWorkoutLogRead, clients } = useApp();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('ALL');
  const [filterClient, setFilterClient] = useState<string>('ALL');
  const [filterWeek, setFilterWeek] = useState<number | null>(null);
  const [previewWorkout, setPreviewWorkout] = useState<{ workout: Workout; clientName: string } | null>(null);
  const [activeSessionLog, setActiveSessionLog] = useState<WorkoutLog | null>(null);

  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [
      ...checkIns.map(c => ({ kind: 'checkin' as const, data: c, date: new Date(c.submittedAt).getTime() })),
      ...workoutLogs.map(l => ({ kind: 'workout' as const, data: l, date: new Date(l.loggedAt).getTime() })),
    ];
    return items.sort((a, b) => b.date - a.date);
  }, [checkIns, workoutLogs]);

  // Weeks available for the selected client (oldest first = Week 1, Week 2…)
  const weeksForClient = useMemo(() => {
    if (filterClient === 'ALL') return [];
    const seen = new Set<number>();
    feed.filter(i => i.data.clientId === filterClient).forEach(i => seen.add(getWeekStart(i.date)));
    return Array.from(seen).sort((a, b) => a - b); // oldest first → Week 1, Week 2…
  }, [feed, filterClient]);

  const filtered = useMemo(() => {
    let list = feed;
    if (tab === 'REVIEWS')  list = list.filter(i => i.kind === 'checkin');
    if (tab === 'WORKOUTS') list = list.filter(i => i.kind === 'workout');
    if (filterClient !== 'ALL') list = list.filter(i => i.data.clientId === filterClient);
    if (filterClient !== 'ALL' && filterWeek !== null) list = list.filter(i => getWeekStart(i.date) === filterWeek);
    return list;
  }, [feed, tab, filterClient, filterWeek]);

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

  const parseNote = (note: string) => {
    // Parse note into per-exercise map: "EXERCISE NAME: value"
    const noteMap: Record<string, string> = {};
    let generalNote = '';
    note.split('\n').forEach(line => {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        noteMap[line.slice(0, colonIdx).trim().toUpperCase()] = line.slice(colonIdx + 1).trim();
      } else if (line.trim()) {
        generalNote += (generalNote ? ' ' : '') + line.trim();
      }
    });
    return { noteMap, generalNote };
  };

  const renderLogged = (workout: Workout, noteMap: Record<string, string>, emptyLabel: string) => (
    <div className="flex flex-col">
      <div className="grid grid-cols-12 gap-2 px-1 pb-2 text-[13px] font-semibold text-muted">
        <div className="col-span-5">Exercise</div>
        <div className="col-span-3">Planned</div>
        <div className="col-span-4">Logged</div>
      </div>
      {workout.exercises.map(ex => {
        if (ex.category === 'header') return (
          <p key={ex.id} className="text-[15px] font-extrabold text-mob pt-3 pb-1 px-1" {...textDir(ex.name)}>{niceCase(ex.name)}</p>
        );
        const logged = noteMap[ex.name.toUpperCase()];
        return (
          <div key={ex.id} className="grid grid-cols-12 gap-2 px-1 py-2.5 border-t border-line text-sm">
            <div className="col-span-5 font-bold text-ink break-words">{niceCase(ex.name)}</div>
            <div className="col-span-3 text-muted">{ex.sets}×{ex.reps || ex.duration}</div>
            <div className="col-span-4 font-semibold break-words">
              {logged ? <span className="text-done">{logged}</span> : <span className="text-muted">{emptyLabel}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );

  const SessionNotes = ({ text }: { text: string }) => (
    <div className="pt-3 mt-1 border-t border-line flex flex-col gap-1">
      <p className="text-[13px] font-semibold text-muted">Session notes</p>
      <p className="text-[15px] text-ink leading-relaxed" {...textDir(text)}>{text}</p>
    </div>
  );

  const chipBase = 'h-10 px-3 rounded-xl text-sm flex items-center gap-1.5 shrink-0 transition-colors';
  const chipOn = 'bg-accent text-onaccent font-extrabold';
  const chipOff = 'bg-card border border-edge text-ink font-bold hover:border-tick';

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-3 pb-20 text-ink">

      {/* Header */}
      <div className="flex justify-between items-center gap-3">
        <h1 className="text-2xl font-extrabold text-ink">Check-ins</h1>
        {totalUnread > 0 && (
          <span className="flex items-center gap-1.5 text-sm font-bold text-alert">
            <span className="w-2 h-2 rounded-full bg-alert" />
            {totalUnread} unread
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {(['ALL', 'REVIEWS', 'WORKOUTS'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`${chipBase} ${tab === t ? chipOn : chipOff}`}
          >
            {t === 'ALL' ? 'All' : t === 'REVIEWS' ? 'Weekly reviews' : 'Workouts'}
            {tabCounts[t] > 0 && (
              <span
                className={`text-xs font-extrabold min-w-[18px] h-[18px] px-1.5 rounded-full flex items-center justify-center text-onaccent ${tab === t ? '' : 'bg-alert'}`}
                style={tab === t ? { background: 'rgba(15,27,43,0.18)' } : undefined}
              >
                {tabCounts[t]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Client filter */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1">
        <button
          onClick={() => { setFilterClient('ALL'); setFilterWeek(null); }}
          className={`${chipBase} font-bold ${filterClient === 'ALL' ? 'bg-raised text-ink' : 'bg-card border border-edge text-muted hover:text-ink'}`}
        >
          All clients
        </button>
        {clientsInFeed.map(c => (
          <button
            key={c.id}
            onClick={() => { setFilterClient(c.id); setFilterWeek(null); }}
            className={`${chipBase} ${filterClient === c.id ? chipOn : chipOff}`}
          >
            {c.avatar
              ? <img src={c.avatar} className="w-[22px] h-[22px] rounded-full object-cover" alt="" />
              : <span className="w-[22px] h-[22px] rounded-full bg-raised text-accent text-xs font-extrabold flex items-center justify-center">{c.name[0]}</span>
            }
            {c.name.split(' ')[0]}
            {(unreadPerClient[c.id] || 0) > 0 && (
              <span className={`text-xs font-extrabold ${filterClient === c.id ? 'text-onaccent' : 'text-alert'}`}>+{unreadPerClient[c.id]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Week sub-filter — appears when a client is selected */}
      {filterClient !== 'ALL' && weeksForClient.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterWeek(null)}
            className={`${chipBase} font-bold ${filterWeek === null ? 'bg-raised text-ink' : 'bg-card border border-edge text-muted hover:text-ink'}`}
          >
            All weeks
          </button>
          {weeksForClient.map((ws, idx) => (
            <button
              key={ws}
              onClick={() => setFilterWeek(ws)}
              title={formatWeekLabel(ws)}
              className={`${chipBase} ${filterWeek === ws ? chipOn : chipOff}`}
            >
              <Calendar size={14} />
              Week {idx + 1}
              <span className={filterWeek === ws ? 'opacity-70' : 'text-muted'}>· {feed.filter(i => i.data.clientId === filterClient && getWeekStart(i.date) === ws).length}</span>
            </button>
          ))}
        </div>
      )}

      {/* Feed */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center border-[1.5px] border-dashed border-tick rounded-2xl">
          <Inbox className="mx-auto text-muted mb-3" size={36} />
          <p className="text-muted font-semibold text-[15px]">Nothing here yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(item => {
            const id = item.data.id;
            const isOpen = expandedId === id;
            const unread = !item.data.readByCoach;
            const isReview = item.kind === 'checkin';
            const dateStr = formatDate(isReview ? (item.data as WeeklyCheckIn).submittedAt : (item.data as WorkoutLog).loggedAt);
            const smallWin = isReview ? (item.data as WeeklyCheckIn).smallWin : '';
            const preview = isReview
              ? (smallWin ? `“${smallWin}”` : '')
              : (item.data as WorkoutLog).note.split('\n').map(l => l.trim()).filter(Boolean).join(' · ');

            return (
              <div
                key={id}
                className={`flex flex-col rounded-2xl border transition-colors ${isOpen ? 'bg-raised border-edge' : 'bg-card border-transparent'}`}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleExpand(item)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleExpand(item); } }}
                  className="w-full p-3 flex items-center gap-2.5 text-left cursor-pointer"
                >
                  {unread
                    ? <span className="w-2 h-2 rounded-full bg-alert shrink-0" />
                    : <Check size={16} strokeWidth={3} className="text-done shrink-0" />
                  }

                  <span className="w-9 h-9 rounded-[10px] bg-field flex items-center justify-center shrink-0">
                    {isReview
                      ? <ClipboardList size={18} className="text-accent" />
                      : <Dumbbell size={18} className="text-muted" />
                    }
                  </span>

                  <span className="flex-1 min-w-0 flex flex-col gap-[3px]">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className={`text-base ${unread ? 'font-extrabold' : 'font-bold'} text-ink`}>
                        {item.data.clientName}
                      </span>
                      {isReview ? (
                        <span className="text-xs font-bold text-accent bg-raised px-2 py-0.5 rounded-md">Weekly review</span>
                      ) : (() => {
                        const log = item.data as WorkoutLog;
                        const workout = clients.find(c => c.id === log.clientId)?.workouts.find(w => w.name === log.workoutName);
                        return (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              if (workout) setPreviewWorkout({ workout, clientName: log.clientName });
                            }}
                            className={`text-xs font-bold text-ink px-2 py-0.5 rounded-md hover:text-accent ${isOpen ? 'bg-card' : 'bg-raised'}`}
                            title="See this workout"
                          >
                            Workout {log.workoutName} ↗
                          </button>
                        );
                      })()}
                    </span>
                    <span className="text-[13px] text-muted">{dateStr}</span>
                    {!isOpen && preview && (
                      <span className="text-sm text-muted truncate" {...textDir(preview)}>{preview}</span>
                    )}
                  </span>

                  {isOpen ? <ChevronUp size={18} className="text-muted shrink-0" /> : <ChevronDown size={18} className="text-muted shrink-0" />}
                </div>

                {isOpen && (
                  <div className="px-3 pb-3">
                    {isReview ? (() => {
                      const ci = item.data as WeeklyCheckIn;
                      const ciWeekStart = getWeekStart(new Date(ci.submittedAt).getTime());
                      const ciWeekEnd = ciWeekStart + 7 * 24 * 60 * 60 * 1000;
                      const weekLogs = workoutLogs.filter(l =>
                        l.clientId === ci.clientId &&
                        new Date(l.loggedAt).getTime() >= ciWeekStart &&
                        new Date(l.loggedAt).getTime() < ciWeekEnd
                      );
                      return (
                        <div className="flex flex-col gap-3">
                          {/* Sessions from this week */}
                          <div className="flex flex-col gap-1 bg-field rounded-xl px-3 py-2.5">
                            <span className="flex items-center gap-2 text-[13px] font-bold text-muted">
                              <Dumbbell size={15} /> Sessions logged this week
                            </span>
                            {weekLogs.length === 0 ? (
                              <p className="text-sm text-muted py-1">No sessions logged this week</p>
                            ) : (
                              weekLogs.map((l, idx) => (
                                <button
                                  key={l.id}
                                  onClick={() => setActiveSessionLog(l)}
                                  className={`flex justify-between items-center gap-2 min-h-[40px] text-left text-sm font-bold text-ink hover:text-accent ${idx > 0 ? 'border-t border-line' : ''}`}
                                >
                                  <span className="min-w-0 truncate">
                                    Workout {l.workoutName}
                                    {l.workoutTitle && <span className="font-medium text-muted"> · {niceCase(l.workoutTitle)}</span>}
                                  </span>
                                  <span className="text-[13px] font-medium text-muted shrink-0">
                                    {new Date(l.loggedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                          {/* Check-in answers */}
                          <div className="flex flex-col md:grid md:grid-cols-2 md:gap-x-6">
                            {CHECKIN_FIELDS.map(field => {
                              const value = ci[field.key] ? String(ci[field.key]) : '';
                              return (
                                <div key={field.key} className="flex flex-col gap-[3px] py-2.5 border-t border-line">
                                  <span className="text-[13px] font-semibold text-muted">{field.label}</span>
                                  {value
                                    ? <p className="text-[15px] leading-relaxed text-ink whitespace-pre-line" {...textDir(value)}>{value}</p>
                                    : <span className="text-[15px] text-muted">—</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })() : (() => {
                      const log = item.data as WorkoutLog;
                      const workout = clients.find(c => c.id === log.clientId)?.workouts.find(w => w.name === log.workoutName);
                      const { noteMap, generalNote } = parseNote(log.note);

                      return (
                        <div className="flex flex-col gap-3 bg-field rounded-xl px-3 py-3">
                          <p className="text-[13px] font-bold text-muted">
                            Workout {log.workoutName} · {niceCase(log.workoutTitle)}
                          </p>
                          {workout
                            ? renderLogged(workout, noteMap, 'not logged')
                            : <p className="text-[15px] text-ink leading-relaxed whitespace-pre-line" {...textDir(log.note)}>{log.note}</p>}
                          {generalNote && <SessionNotes text={generalNote} />}
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

      {/* Session log detail */}
      {activeSessionLog && (() => {
        const log = activeSessionLog;
        const clientWorkouts = clients.find(c => c.id === log.clientId)?.workouts || [];
        const workout = clientWorkouts.find(w => w.name === log.workoutName);
        const { noteMap, generalNote } = parseNote(log.note);
        return (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6">
            <div className="absolute inset-0 bg-black/70" onClick={() => setActiveSessionLog(null)} />
            <div
              className="relative w-full max-w-xl bg-card border border-edge rounded-t-3xl md:rounded-3xl overflow-hidden max-h-[85vh] flex flex-col"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line shrink-0">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-muted">
                    {log.clientName} · {new Date(log.loggedAt).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                  <h3 className="text-lg font-extrabold text-ink">
                    Workout {log.workoutName} · {niceCase(log.workoutTitle)}
                  </h3>
                </div>
                <button onClick={() => setActiveSessionLog(null)} aria-label="Close" className="w-11 h-11 rounded-xl border border-edge bg-raised text-muted hover:text-ink flex items-center justify-center shrink-0">
                  <X size={18} />
                </button>
              </div>
              <div className="overflow-y-auto px-5 py-4">
                {workout
                  ? renderLogged(workout, noteMap, '—')
                  : <p className="text-[15px] text-ink whitespace-pre-line" {...textDir(log.note)}>{log.note}</p>}
                {generalNote && <SessionNotes text={generalNote} />}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Workout preview */}
      {previewWorkout && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6">
          <div className="absolute inset-0 bg-black/70" onClick={() => setPreviewWorkout(null)} />
          <div
            className="relative w-full max-w-2xl bg-card border border-edge rounded-t-3xl md:rounded-3xl overflow-hidden max-h-[85vh] flex flex-col"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line shrink-0">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-muted">{previewWorkout.clientName} · Workout {previewWorkout.workout.name}</p>
                <h3 className="text-lg font-extrabold text-ink">{niceCase(previewWorkout.workout.title)}</h3>
              </div>
              <button onClick={() => setPreviewWorkout(null)} aria-label="Close" className="w-11 h-11 rounded-xl border border-edge bg-raised text-muted hover:text-ink flex items-center justify-center shrink-0">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4 flex flex-col gap-1.5">
              {previewWorkout.workout.exercises.map(ex => {
                if (ex.category === 'header') {
                  return (
                    <p key={ex.id} className="text-base font-extrabold text-mob pt-3 pb-1" {...textDir(ex.name)}>
                      {niceCase(ex.name)}
                    </p>
                  );
                }
                const meta = exerciseMeta(ex);
                return (
                  <div key={ex.id} className="flex flex-col gap-px bg-raised rounded-[14px] px-3 py-2.5">
                    <span className="text-base font-bold text-ink">{niceCase(ex.name)}</span>
                    {(ex.category === 'mobility' || meta) && (
                      <span className="text-[13px] text-muted">
                        {ex.category === 'mobility' && <span className="text-mob font-bold">Mobility{meta ? ' · ' : ''}</span>}
                        {meta}
                      </span>
                    )}
                  </div>
                );
              })}
              {previewWorkout.workout.exercises.filter(e => e.category !== 'header').length === 0 && (
                <p className="text-muted text-[15px] text-center py-8">No exercises added yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoachCheckIns;
