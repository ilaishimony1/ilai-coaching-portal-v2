import React, { useState, useMemo } from 'react';
import {
  ClipboardList, Lock, CheckCircle2, ChevronDown, ChevronUp,
  Calendar, Send, Clock, Dumbbell, X, ChevronRight
} from 'lucide-react';
import { WeeklyCheckIn as CheckInType, ClientData, WorkoutLog, Workout } from '../types';
import { useApp } from '../AppContext';
import { niceCase, textDir } from './ui';

const getWeekStart = (ts: number): number => {
  const d = new Date(ts);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const SessionsSummary: React.FC<{ logs: WorkoutLog[]; onLogClick: (log: WorkoutLog) => void }> = ({ logs, onLogClick }) => (
  <div className="flex flex-col gap-1.5 bg-card rounded-[14px] px-3.5 py-3">
    <p className="flex items-center gap-2 text-[13px] font-bold text-muted">
      <Dumbbell size={16} /> Sessions logged this week
    </p>
    {logs.length === 0 ? (
      <p className="text-[15px] text-muted">No sessions logged yet this week</p>
    ) : (
      <div className="flex flex-col divide-y divide-line">
        {logs.map(l => (
          <button
            key={l.id}
            onClick={() => onLogClick(l)}
            className="min-h-[40px] flex items-center justify-between gap-2 text-left text-sm font-bold text-ink"
          >
            <span className="min-w-0 truncate">
              Workout {l.workoutName}
              {l.workoutTitle && <span className="font-medium text-muted"> · {niceCase(l.workoutTitle)}</span>}
            </span>
            <span className="flex items-center gap-1 shrink-0 text-[13px] font-medium text-muted">
              {new Date(l.loggedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              <ChevronRight size={14} />
            </span>
          </button>
        ))}
      </div>
    )}
  </div>
);

const WorkoutLogModal: React.FC<{ log: WorkoutLog; workouts: Workout[]; onClose: () => void }> = ({ log, workouts, onClose }) => {
  const workout = workouts.find(w => w.name === log.workoutName);
  const noteMap: Record<string, string> = {};
  let generalNote = '';
  log.note.split('\n').forEach(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      noteMap[line.slice(0, colonIdx).trim().toUpperCase()] = line.slice(colonIdx + 1).trim();
    } else if (line.trim()) {
      generalNote += (generalNote ? ' ' : '') + line.trim();
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-card border border-edge rounded-t-3xl md:rounded-3xl overflow-hidden max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line shrink-0">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-muted">
              {new Date(log.loggedAt).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
            <h3 className="text-lg font-extrabold text-ink">
              Workout {log.workoutName} · {niceCase(log.workoutTitle)}
            </h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-11 h-11 rounded-xl bg-raised border border-edge text-muted hover:text-ink flex items-center justify-center shrink-0">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-1.5">
          {workout ? (
            <>
              <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-xs font-bold text-muted">
                <div className="col-span-5">Exercise</div>
                <div className="col-span-3">Planned</div>
                <div className="col-span-4">Logged</div>
              </div>
              {workout.exercises.map(ex => {
                if (ex.category === 'header') return (
                  <p key={ex.id} className="text-sm font-extrabold text-mob pt-3 pb-1 px-3">{niceCase(ex.name)}</p>
                );
                const logged = noteMap[ex.name.toUpperCase()];
                return (
                  <div key={ex.id} className="grid grid-cols-12 gap-2 px-3 py-2.5 rounded-xl bg-field text-sm">
                    <div className="col-span-5 font-bold text-ink">{niceCase(ex.name)}</div>
                    <div className="col-span-3 text-muted">{ex.sets}×{ex.reps || ex.duration}</div>
                    <div className="col-span-4 font-bold">
                      {logged ? <span className="text-done">{logged}</span> : <span className="text-muted font-medium">—</span>}
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <p {...textDir(log.note)} className="text-[15px] text-ink whitespace-pre-line">{log.note}</p>
          )}
          {generalNote && (
            <div className="pt-3 mt-2 border-t border-line">
              <p className="text-[13px] font-semibold text-muted mb-1">Session notes</p>
              <p {...textDir(generalNote)} className="text-[15px] text-ink leading-relaxed">{generalNote}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface Props {
  client: ClientData;
  accentColor: string;
}

type FormData = {
  programWeek: string;
  sessionsCompleted: string;
  followedProgram: string;
  smallWin: string;
  mostImprovement: string;
  biggestChallenge: string;
  mostLimiting: string;
  dontUnderstand: string;
  clearOnWork: string;
  focusNextWeek: string;
  anythingElse: string;
};

const FIELDS: { key: keyof FormData; label: string; placeholder: string }[] = [
  { key: 'programWeek',       label: 'Current program week',                                         placeholder: 'e.g. Week 4' },
  { key: 'sessionsCompleted', label: 'How many sessions did you complete this week?',                 placeholder: 'e.g. 4 out of 5' },
  { key: 'followedProgram',   label: 'Did you follow the program as prescribed?',                     placeholder: 'Yes / No / Mostly...' },
  { key: 'smallWin',          label: 'What is one small win you had this week?',                      placeholder: "Something you're proud of..." },
  { key: 'mostImprovement',   label: 'Where have you seen the most improvement this week?',           placeholder: 'Strength, mobility, consistency...' },
  { key: 'biggestChallenge',  label: 'What has been the biggest challenge for you this week?',        placeholder: 'Be honest...' },
  { key: 'mostLimiting',      label: 'What do you feel is most limiting right now?',                  placeholder: 'Energy, time, technique...' },
  { key: 'dontUnderstand',    label: "Is there something you don't fully understand?",               placeholder: 'Any exercises or concepts...' },
  { key: 'clearOnWork',       label: 'Do you feel clear on what to work on right now?',               placeholder: 'Yes / No / Somewhat...' },
  { key: 'focusNextWeek',     label: "Is there anything specific you'd like to focus on next week?", placeholder: 'Goals, areas to prioritize...' },
  { key: 'anythingElse',      label: "Is there anything else you'd like me to know?",                placeholder: 'Open feedback...' },
];

const isWeekend = () => {
  const day = new Date().getDay();
  return day === 0 || day === 6;
};

const getNextWeekendText = () => {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 6=Sat
  const daysUntilSat = day === 0 ? 6 : 6 - day;
  if (daysUntilSat === 0) return 'Today';
  if (daysUntilSat === 1) return 'Tomorrow';
  return `In ${daysUntilSat} days (Saturday)`;
};

const hasSubmittedThisWeekend = (checkIns: CheckInType[], clientId: string) => {
  const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
  return checkIns.some(
    c => c.clientId === clientId && new Date(c.submittedAt).getTime() > twoDaysAgo
  );
};

const getProgramWeek = (startDate?: string): string => {
  if (!startDate) return '';
  const start = new Date(startDate).getTime();
  const now = Date.now();
  if (now < start) return 'Week 1';
  const week = Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return `Week ${week}`;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

const EMPTY_FORM = (client: ClientData): FormData => ({
  programWeek: getProgramWeek(client.programStartDate),
  sessionsCompleted: '',
  followedProgram: '',
  smallWin: '',
  mostImprovement: '',
  biggestChallenge: '',
  mostLimiting: '',
  dontUnderstand: '',
  clearOnWork: '',
  focusNextWeek: '',
  anythingElse: '',
});

const WeeklyCheckInComponent: React.FC<Props> = ({ client, accentColor }) => {
  const { checkIns, submitCheckIn, workoutLogs } = useApp();
  const [form, setForm] = useState<FormData>(() => EMPTY_FORM(client));
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeLog, setActiveLog] = useState<WorkoutLog | null>(null);

  const weekend = isWeekend();
  const alreadySubmitted = hasSubmittedThisWeekend(checkIns, client.id);
  const formLocked = !weekend || alreadySubmitted;

  const myCheckIns = useMemo(
    () =>
      checkIns
        .filter(c => c.clientId === client.id)
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()),
    [checkIns, client.id]
  );

  // Workout logs for a given week (by any date in that week)
  const getLogsForWeek = (anchorTs: number): WorkoutLog[] => {
    const weekStart = getWeekStart(anchorTs);
    const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;
    return workoutLogs.filter(l =>
      l.clientId === client.id &&
      new Date(l.loggedAt).getTime() >= weekStart &&
      new Date(l.loggedAt).getTime() < weekEnd
    );
  };

  const thisWeekLogs = useMemo(() => getLogsForWeek(Date.now()), [workoutLogs, client.id]);

  const allFilled = FIELDS.every(f => form[f.key].trim() !== '');

  const handleSubmit = async () => {
    if (!allFilled || formLocked || submitting) return;
    setSubmitting(true);
    try {
      await submitCheckIn({
        clientId: client.id,
        clientName: client.name,
        submittedAt: new Date().toISOString(),
        readByCoach: false,
        ...form,
      });
      setJustSubmitted(true);
      setForm(EMPTY_FORM(client));
    } catch (e) {
      alert("Couldn't send your check-in. Check your internet and try again.");
    }
    setSubmitting(false);
  };

  const answered = FIELDS.filter(f => form[f.key].trim()).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-extrabold">Weekly review</h2>
        <p className="text-sm leading-[1.45] text-muted">This form helps us track progress and keep you on target</p>
      </div>

      {/* Whether the form is open right now */}
      <div className="flex items-center justify-between gap-2.5 bg-raised border border-edge rounded-[14px] px-3.5 py-3">
        <span className="flex items-center gap-2 text-sm font-bold">
          {formLocked
            ? <Lock size={14} className="text-muted shrink-0" />
            : <span className="w-2 h-2 rounded-full bg-done shrink-0" />}
          {alreadySubmitted
            ? 'Already sent this weekend'
            : weekend
            ? 'Open: fill in your weekly review'
            : `Opens on weekends · ${getNextWeekendText()}`}
        </span>
        {weekend && !alreadySubmitted && (
          <span className="text-[13px] text-muted shrink-0">
            {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
          </span>
        )}
      </div>

      {justSubmitted && (
        <div className="flex flex-col items-center gap-2.5 text-center bg-card border border-done rounded-[18px] px-[18px] py-6">
          <span className="w-14 h-14 rounded-full bg-done flex items-center justify-center">
            <CheckCircle2 size={28} className="text-white" />
          </span>
          <h3 className="text-[22px] font-extrabold">Review sent</h3>
          <p className="text-[15px] text-muted">Ilai will read it soon.</p>
          <button
            onClick={() => setJustSubmitted(false)}
            className="mt-2 h-11 px-4 bg-raised border border-edge rounded-xl text-[15px] font-bold text-ink"
          >
            Back to the form
          </button>
        </div>
      )}

      {!justSubmitted && formLocked && (
        <div className="flex flex-col items-center gap-2.5 text-center bg-card rounded-[18px] px-[18px] py-8">
          <span className="w-14 h-14 rounded-full bg-raised flex items-center justify-center">
            {alreadySubmitted
              ? <CheckCircle2 size={28} className="text-done" />
              : <Lock size={26} className="text-muted" />}
          </span>
          <h3 className="text-xl font-extrabold">
            {alreadySubmitted ? "You're all done for this weekend" : 'The check-in is closed today'}
          </h3>
          <p className="text-[15px] text-muted max-w-xs">
            {alreadySubmitted
              ? 'Great work sending your weekly review. See you next weekend!'
              : 'The weekly check-in opens on Saturdays and Sundays.'}
          </p>
          {!alreadySubmitted && (
            <span className="mt-1 inline-flex items-center gap-2 h-9 px-3 bg-raised rounded-xl text-[13px] font-semibold text-muted">
              <Clock size={14} /> Next: {getNextWeekendText()}
            </span>
          )}
        </div>
      )}

      {!justSubmitted && !formLocked && (
        <>
          {/* Sessions logged this week — helps fill in sessions completed */}
          <SessionsSummary logs={thisWeekLogs} onLogClick={setActiveLog} />

          {FIELDS.map((field, i) => (
            <label key={field.key} className="flex flex-col gap-2">
              <span className="text-[15px] font-bold leading-[1.35]">
                <span className="text-muted">{i + 1}.</span> {field.label}
              </span>
              <textarea
                value={form[field.key]}
                onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                rows={field.key === 'anythingElse' ? 4 : field.key === 'programWeek' ? 1 : 2}
                dir="auto"
                className="rounded-[14px] border-[1.5px] border-edge bg-field text-ink px-3.5 py-3 text-[15px] font-medium resize-none outline-none focus:border-accent transition-colors"
              />
            </label>
          ))}

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-sm font-semibold text-muted">
              {answered} of {FIELDS.length} answered
            </p>
            <button
              onClick={handleSubmit}
              disabled={!allFilled || submitting}
              className={`h-[52px] px-[22px] rounded-[14px] text-base font-extrabold flex items-center gap-2 transition-colors ${
                allFilled && !submitting
                  ? 'bg-accent text-onaccent active:scale-95'
                  : 'bg-card border border-edge text-muted cursor-not-allowed'
              }`}
            >
              {submitting ? 'Sending…' : <><Send size={16} /> Send review</>}
            </button>
          </div>
        </>
      )}

      {/* Past reviews */}
      {myCheckIns.length > 0 && (
        <section className="flex flex-col gap-2 pt-4">
          <h3 className="flex items-center gap-2 text-base font-extrabold">
            Past reviews
            <span className="text-xs font-bold text-muted bg-card px-2 py-0.5 rounded-md">{myCheckIns.length}</span>
          </h3>

          {myCheckIns.map(ci => {
            const isOpen = expandedId === ci.id;
            return (
              <div key={ci.id} className={`rounded-2xl ${isOpen ? 'bg-raised border border-edge' : 'bg-card'}`}>
                <button
                  onClick={() => setExpandedId(isOpen ? null : ci.id)}
                  className="w-full flex items-center gap-2.5 p-3 text-left"
                >
                  <span className="w-9 h-9 rounded-[10px] bg-field flex items-center justify-center shrink-0">
                    <ClipboardList size={18} className="text-accent" />
                  </span>
                  <span className="flex-1 min-w-0 flex flex-col">
                    <span className="text-base font-bold">{ci.programWeek || 'Weekly review'}</span>
                    <span className="text-[13px] text-muted">{formatDate(ci.submittedAt)}</span>
                  </span>
                  {isOpen ? <ChevronUp size={18} className="text-muted" /> : <ChevronDown size={18} className="text-muted" />}
                </button>

                {isOpen && (
                  <div className="px-3 pb-3 flex flex-col gap-1">
                    <SessionsSummary logs={getLogsForWeek(new Date(ci.submittedAt).getTime())} onLogClick={setActiveLog} />
                    {FIELDS.map(field => (
                      <div key={field.key} className="flex flex-col gap-[3px] py-2.5 border-t border-line">
                        <p className="text-[13px] font-semibold text-muted">{field.label}</p>
                        <p {...textDir(ci[field.key])} className="text-[15px] leading-[1.45] text-ink whitespace-pre-line">
                          {ci[field.key] || <span className="text-muted">—</span>}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {activeLog && (
        <WorkoutLogModal
          log={activeLog}
          workouts={client.workouts}
          onClose={() => setActiveLog(null)}
        />
      )}
    </div>
  );
};

export default WeeklyCheckInComponent;
