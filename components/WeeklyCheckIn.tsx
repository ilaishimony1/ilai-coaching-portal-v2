import React, { useState, useMemo } from 'react';
import {
  ClipboardList, Lock, CheckCircle2, ChevronDown, ChevronUp,
  Calendar, Send, Clock
} from 'lucide-react';
import { WeeklyCheckIn as CheckInType, ClientData } from '../types';
import { useApp } from '../AppContext';

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
  { key: 'programWeek',       label: 'Current Program Week',                                         placeholder: 'e.g. Week 4' },
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
  if (new URLSearchParams(window.location.search).get('previewWeekend') === '1') return true;
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
  const { checkIns, submitCheckIn } = useApp();
  const [form, setForm] = useState<FormData>(() => EMPTY_FORM(client));
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
      alert('Failed to submit. Please try again.');
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-white/5 pb-8">
        <div className="p-3 rounded-2xl bg-blue-600/10 border border-blue-600/20">
          <ClipboardList className="text-blue-400" size={24} />
        </div>
        <div>
          <h2 className="text-4xl font-black brand-font uppercase text-white tracking-tighter">Weekly Review</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 mt-1">
            This form helps us track progress and keep you on target
          </p>
        </div>
      </div>

      {/* Form Section */}
      <div className="glass-card rounded-[2.5rem] border-slate-800/50 overflow-hidden">
        {/* Form header bar */}
        <div className={`px-10 py-6 flex items-center justify-between border-b border-white/5 ${
          formLocked ? 'bg-slate-950/60' : 'bg-blue-600/5'
        }`}>
          <div className="flex items-center gap-3">
            {formLocked ? (
              <Lock size={16} className="text-slate-600" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
            <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${
              formLocked ? 'text-slate-600' : 'text-emerald-400'
            }`}>
              {alreadySubmitted
                ? 'Already submitted this weekend'
                : weekend
                ? 'Form open — fill in your weekly review'
                : `Available on weekends · Next: ${getNextWeekendText()}`}
            </span>
          </div>
          {weekend && !alreadySubmitted && (
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar size={12} />
              <span className="text-[9px] font-black uppercase tracking-widest">
                {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
              </span>
            </div>
          )}
        </div>

        {/* Success state */}
        {justSubmitted && (
          <div className="px-10 py-16 text-center animate-in zoom-in duration-500">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} className="text-emerald-400" />
            </div>
            <h3 className="text-2xl font-black brand-font uppercase text-white tracking-tight">Submitted!</h3>
            <p className="text-slate-500 text-sm font-bold mt-2">Your coach will review it shortly.</p>
            <button
              onClick={() => setJustSubmitted(false)}
              className="mt-8 px-6 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
            >
              Back to form
            </button>
          </div>
        )}

        {/* Locked overlay */}
        {!justSubmitted && formLocked && (
          <div className="px-10 py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-6">
              {alreadySubmitted
                ? <CheckCircle2 size={36} className="text-emerald-500" />
                : <Lock size={36} className="text-slate-700" />
              }
            </div>
            <h3 className="text-xl font-black brand-font uppercase text-slate-400 tracking-tight">
              {alreadySubmitted ? "You're all done for this weekend" : 'Check-in is locked'}
            </h3>
            <p className="text-slate-600 text-sm font-bold mt-2 max-w-xs mx-auto">
              {alreadySubmitted
                ? 'Great work submitting your weekly review. See you next weekend!'
                : 'The weekly check-in form is only available on Saturdays and Sundays.'}
            </p>
            {!alreadySubmitted && (
              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl">
                <Clock size={12} className="text-slate-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Next: {getNextWeekendText()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Form fields */}
        {!justSubmitted && !formLocked && (
          <div className="px-10 py-10 space-y-8">
            {FIELDS.map((field, i) => (
              <div key={field.key} className="space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                  <span className="text-slate-700 mr-2">{String(i + 1).padStart(2, '0')}.</span>
                  {field.label}
                  <span className="text-blue-500/60 ml-1">*</span>
                </label>
                <textarea
                  value={form[field.key]}
                  onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  rows={field.key === 'anythingElse' ? 4 : 2}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl px-6 py-4 text-sm text-slate-200 placeholder-slate-700 font-medium resize-none focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                />
              </div>
            ))}

            <div className="pt-4 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                {FIELDS.filter(f => form[f.key].trim()).length} / {FIELDS.length} answered
              </p>
              <button
                onClick={handleSubmit}
                disabled={!allFilled || submitting}
                className={`flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-xs tracking-widest uppercase transition-all active:scale-95 shadow-2xl ${
                  allFilled && !submitting
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                }`}
                style={allFilled && !submitting ? { boxShadow: `0 20px 40px -15px ${accentColor}80` } : {}}
              >
                {submitting ? (
                  <>Submitting…</>
                ) : (
                  <><Send size={14} /> Submit Review</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Past submissions */}
      {myCheckIns.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-3 px-1">
            <Clock size={16} className="text-slate-600" />
            <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-600">Past Submissions</h3>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-700 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full">
              {myCheckIns.length}
            </span>
          </div>

          <div className="space-y-4">
            {myCheckIns.map(ci => {
              const isOpen = expandedId === ci.id;
              return (
                <div key={ci.id} className="glass-card rounded-[2rem] border-slate-800/50 overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isOpen ? null : ci.id)}
                    className="w-full px-8 py-6 flex items-center justify-between hover:bg-white/2 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                        <ClipboardList size={16} className="text-slate-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-slate-300">{ci.programWeek || 'Weekly Review'}</p>
                        <p className="text-[10px] font-bold text-slate-600 mt-0.5">{formatDate(ci.submittedAt)}</p>
                      </div>
                    </div>
                    {isOpen
                      ? <ChevronUp size={16} className="text-slate-600" />
                      : <ChevronDown size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                    }
                  </button>

                  {isOpen && (
                    <div className="px-8 pb-8 space-y-6 border-t border-white/5 pt-6 animate-in fade-in duration-300">
                      {FIELDS.map(field => (
                        <div key={field.key}>
                          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 mb-1">{field.label}</p>
                          <p className="text-sm font-medium text-slate-300 leading-relaxed">
                            {ci[field.key] || <span className="text-slate-700 italic">—</span>}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default WeeklyCheckInComponent;
