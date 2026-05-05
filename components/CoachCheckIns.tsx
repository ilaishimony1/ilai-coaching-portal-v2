import React, { useState, useMemo } from 'react';
import { ClipboardList, Dumbbell, ChevronDown, ChevronUp, CheckCheck, Inbox, User } from 'lucide-react';
import { WeeklyCheckIn, WorkoutLog } from '../types';
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

type Tab = 'ALL' | 'REVIEWS' | 'WORKOUTS';

type FeedItem =
  | { kind: 'checkin'; data: WeeklyCheckIn; date: number }
  | { kind: 'workout'; data: WorkoutLog;    date: number };

const CoachCheckIns: React.FC = () => {
  const { checkIns, markCheckInRead, workoutLogs, markWorkoutLogRead, clients } = useApp();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('ALL');
  const [filterClient, setFilterClient] = useState<string>('ALL');

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
    if (filterClient !== 'ALL') list = list.filter(i => i.data.clientId === filterClient);
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/5 pb-8">
        <div>
          <h2 className="text-7xl font-black brand-font uppercase text-white tracking-tighter leading-none">Check-Ins</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-600 mt-3 ml-1">Client Activity Feed</p>
        </div>
        {totalUnread > 0 && (
          <div className="flex items-center gap-3 px-6 py-3 bg-red-500/10 border border-red-500/30 rounded-2xl">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-[11px] font-black uppercase tracking-widest">
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
            onClick={() => setTab(t)}
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
      </div>

      {/* Client filter */}
      {clientsInFeed.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterClient('ALL')}
            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filterClient === 'ALL' ? 'bg-slate-700 text-white' : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-white'}`}
          >
            All clients
          </button>
          {clientsInFeed.map(c => (
            <button
              key={c.id}
              onClick={() => setFilterClient(c.id)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filterClient === c.id ? 'bg-slate-700 text-white' : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-white'}`}
            >
              {c.avatar ? <img src={c.avatar} className="w-4 h-4 rounded-full object-cover" /> : <User size={10} />}
              {c.name.split(' ')[0]}
              {(unreadPerClient[c.id] || 0) > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-red-500 rounded-full text-[8px] font-black text-white flex items-center justify-center">
                  +{unreadPerClient[c.id]}
                </span>
              )}
            </button>
          ))}
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
                  className="w-full px-8 py-6 flex items-center gap-5 hover:bg-white/2 transition-colors group text-left"
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
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${
                        isReview
                          ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                          : 'text-slate-500 bg-slate-900 border-slate-800'
                      }`}>
                        {isReview ? 'Weekly Review' : `Workout ${(item.data as WorkoutLog).workoutName}`}
                      </span>
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
                  <div className="px-8 pb-8 border-t border-white/5 pt-6 animate-in fade-in duration-300">
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
                    ) : (
                      <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600">Session Note</p>
                        <p className="text-sm font-medium text-slate-300 leading-relaxed">{(item.data as WorkoutLog).note}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CoachCheckIns;
