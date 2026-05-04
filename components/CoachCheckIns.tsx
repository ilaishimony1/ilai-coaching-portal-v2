import React, { useState, useMemo } from 'react';
import { ClipboardList, ChevronDown, ChevronUp, CheckCheck, Inbox, User, Filter } from 'lucide-react';
import { WeeklyCheckIn } from '../types';
import { useApp } from '../AppContext';

const FIELDS: { key: keyof WeeklyCheckIn; label: string }[] = [
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
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const CoachCheckIns: React.FC = () => {
  const { checkIns, markCheckInRead, clients } = useApp();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterClient, setFilterClient] = useState<string>('ALL');
  const [filterRead, setFilterRead] = useState<'ALL' | 'UNREAD'>('ALL');

  const sorted = useMemo(
    () => [...checkIns].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()),
    [checkIns]
  );

  const filtered = useMemo(() => {
    let list = sorted;
    if (filterClient !== 'ALL') list = list.filter(c => c.clientId === filterClient);
    if (filterRead === 'UNREAD') list = list.filter(c => !c.readByCoach);
    return list;
  }, [sorted, filterClient, filterRead]);

  const unreadCount = useMemo(() => checkIns.filter(c => !c.readByCoach).length, [checkIns]);

  const clientsWithSubmissions = useMemo(() => {
    const ids = new Set(checkIns.map(c => c.clientId));
    return clients.filter(c => ids.has(c.id));
  }, [checkIns, clients]);

  const handleExpand = async (ci: WeeklyCheckIn) => {
    const isOpening = expandedId !== ci.id;
    setExpandedId(isOpening ? ci.id : null);
    if (isOpening && !ci.readByCoach) {
      await markCheckInRead(ci.id);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-top-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-8">
        <div>
          <h2 className="text-7xl font-black brand-font uppercase text-white tracking-tighter leading-none">
            Check-Ins
          </h2>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-600 mt-3 ml-1">
            Weekly Client Reviews
          </p>
        </div>

        {unreadCount > 0 && (
          <div className="flex items-center gap-3 px-6 py-3 bg-blue-600/10 border border-blue-500/30 rounded-2xl animate-in zoom-in duration-500">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-blue-400 text-[11px] font-black uppercase tracking-widest">
              {unreadCount} unread submission{unreadCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-slate-600">
          <Filter size={14} />
          <span className="text-[9px] font-black uppercase tracking-widest">Filter</span>
        </div>

        <div className="flex gap-2">
          {(['ALL', 'UNREAD'] as const).map(opt => (
            <button
              key={opt}
              onClick={() => setFilterRead(opt)}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                filterRead === opt
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-white'
              }`}
            >
              {opt === 'UNREAD' && unreadCount > 0 ? `Unread (${unreadCount})` : opt}
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterClient('ALL')}
            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
              filterClient === 'ALL'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-white'
            }`}
          >
            All clients
          </button>
          {clientsWithSubmissions.map(c => (
            <button
              key={c.id}
              onClick={() => setFilterClient(c.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                filterClient === c.id
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-white'
              }`}
            >
              {c.avatar
                ? <img src={c.avatar} className="w-4 h-4 rounded-full object-cover" />
                : <User size={10} />
              }
              {c.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="py-24 text-center border-2 border-dashed border-slate-900 rounded-[4rem] bg-slate-950/20">
          <Inbox className="mx-auto text-slate-800 mb-6" size={56} />
          <p className="text-slate-700 font-black uppercase text-sm tracking-widest">No submissions yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(ci => {
            const isOpen = expandedId === ci.id;
            const client = clients.find(c => c.id === ci.clientId);

            return (
              <div
                key={ci.id}
                className={`glass-card rounded-[2rem] border-slate-800/50 overflow-hidden transition-all ${
                  !ci.readByCoach ? 'border-blue-500/20 bg-blue-600/3' : ''
                }`}
              >
                <button
                  onClick={() => handleExpand(ci)}
                  className="w-full px-8 py-6 flex items-center gap-6 hover:bg-white/2 transition-colors group text-left"
                >
                  {/* Unread dot */}
                  <div className="w-2 h-2 rounded-full shrink-0">
                    {!ci.readByCoach && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                  </div>

                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0">
                    {client?.avatar
                      ? <img src={client.avatar} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-slate-700">
                          <User size={18} />
                        </div>
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`font-black text-lg leading-tight ${!ci.readByCoach ? 'text-white' : 'text-slate-300'}`}>
                        {ci.clientName}
                      </span>
                      {!ci.readByCoach && (
                        <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-lg">
                          New
                        </span>
                      )}
                      {ci.programWeek && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg">
                          {ci.programWeek}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-bold text-slate-600 mt-1">{formatDate(ci.submittedAt)}</p>
                    {!isOpen && ci.smallWin && (
                      <p className="text-xs text-slate-500 font-medium mt-1 truncate">
                        Win: "{ci.smallWin}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {ci.readByCoach && (
                      <CheckCheck size={14} className="text-emerald-600" />
                    )}
                    {isOpen
                      ? <ChevronUp size={16} className="text-slate-600" />
                      : <ChevronDown size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                    }
                  </div>
                </button>

                {isOpen && (
                  <div className="px-8 pb-8 border-t border-white/5 pt-6 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {FIELDS.map(field => (
                        <div key={field.key} className="space-y-1">
                          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600">
                            {field.label}
                          </p>
                          <p className="text-sm font-medium text-slate-300 leading-relaxed">
                            {ci[field.key]
                              ? String(ci[field.key])
                              : <span className="text-slate-700 italic">—</span>
                            }
                          </p>
                        </div>
                      ))}
                    </div>
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
