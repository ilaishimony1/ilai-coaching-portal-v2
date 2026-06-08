
import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { PlayCircle, Dumbbell, X, Info, Check, Download, NotebookPen, ChevronDown, ChevronUp } from 'lucide-react';
import { Workout, WorkoutLog, ClientData, Exercise } from '../types';
import { useApp } from '../AppContext';
import ScheduleCalendar from './ScheduleCalendar';
import { db } from '../db';
import { getSkillVideos } from '../firebase/skillVideos';
import { jsPDF } from 'jspdf';
interface Props {
  workouts: Workout[];
  clientData: ClientData;
  accentColor: string;
  isCoach?: boolean;
}



const getEmbedUrl = (url: string) => {
  if (!url) return null;
  if (url.includes('youtube.com/watch?v=')) {
    const id = url.split('v=')[1]?.split('&')[0];
    return `https://www.youtube.com/embed/${id}`;
  }
  if (url.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1]?.split('?')[0];
    return `https://www.youtube.com/embed/${id}`;
  }
  if (url.includes('vimeo.com/')) {
    const id = url.split('vimeo.com/')[1]?.split('?')[0];
    return `https://player.vimeo.com/video/${id}`;
  }
  // Firebase Storage or direct video URLs — use <video> tag, not iframe
  return null;
};

const formatLogDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

const WorkoutLibrary: React.FC<Props> = ({ workouts, clientData, accentColor, isCoach = false }) => {
  const { clients, setClients, workoutLogs, submitWorkoutLog } = useApp();
  const [selectedId, setSelectedId] = useState(workouts[0]?.id);
  const [showLogForm, setShowLogForm] = useState(false);
  const [logText, setLogText] = useState('');
  const [logSaving, setLogSaving] = useState(false);
  const [logJustSaved, setLogJustSaved] = useState(false);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [exerciseState, setExerciseState] = useState<Record<string, boolean>>({});
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Pre-fill exercise notes with prescribed values when workout changes
  useEffect(() => {
    if (isCoach) return;
    const currentW = workouts.find(w => w.id === selectedId);
    if (!currentW) return;
    const prefilled: Record<string, string> = {};
    currentW.exercises.forEach(ex => {
      if (ex.category !== 'header') {
        prefilled[ex.id] = `${ex.sets}×${ex.reps || ex.duration || ''}`.replace(/×$/, '');
      }
    });
    setExerciseNotes(prefilled);
  }, [selectedId, isCoach]);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  useEffect(() => {
  if (!activeVideoUrl) return;

  const originalOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  const preventTouchMove = (e: TouchEvent) => {
    e.preventDefault();
  };

  document.addEventListener('touchmove', preventTouchMove, { passive: false });

  return () => {
    document.body.style.overflow = originalOverflow;
    document.removeEventListener('touchmove', preventTouchMove);
  };
}, [activeVideoUrl]);
useEffect(() => {
  if (!activeVideoUrl) return;

  const handlePopState = () => {
    setActiveVideoUrl(null);
  };

  // push a dummy state so swipe/back only closes modal
  if (window.history.state?.modal !== 'video') {
  window.history.pushState({ modal: 'video' }, '');
}


  window.addEventListener('popstate', handlePopState);

  return () => {
    window.removeEventListener('popstate', handlePopState);
  };
}, [activeVideoUrl]);

  const [activeVideoName, setActiveVideoName] = useState<string | null>(null);
  const [academyBlobUrl, setAcademyBlobUrl] = useState<string | null>(null);
  // Thumbnail lookup: videoId → thumbnailURL (covers exercises assigned before thumbnails were stored)
  const [skillThumbnails, setSkillThumbnails] = useState<Record<string, string>>({});
  useEffect(() => {
    getSkillVideos().then(videos => {
      const map: Record<string, string> = {};
      videos.forEach(v => { if (v.uid && v.thumbnailURL) map[v.uid] = v.thumbnailURL; });
      setSkillThumbnails(map);
    }).catch(() => {});
  }, []);
  

  
  
  const current = workouts.find(w => w.id === selectedId) || workouts[0];

  const currentLogs = workoutLogs
    .filter(l => l.clientId === clientData.id && l.workoutId === current?.id)
    .sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());

  // Re-fill exercise notes with prescribed values (called on mount and after submit)
  const refillNotes = () => {
    if (isCoach || !current) return;
    const prefilled: Record<string, string> = {};
    current.exercises.forEach(ex => {
      if (ex.category !== 'header') {
        prefilled[ex.id] = `${ex.sets}×${ex.reps || ex.duration || ''}`.replace(/×$/, '');
      }
    });
    setExerciseNotes(prefilled);
  };

  const handleSubmitLog = async () => {
    if (!current || logSaving) return;
    const exLines = (current.exercises || [])
      .filter(ex => ex.category !== 'header' && exerciseNotes[ex.id]?.trim())
      .map(ex => `${ex.name}: ${exerciseNotes[ex.id].trim()}`);
    const freeText = logText.trim();
    const combined = [...exLines, ...(freeText ? [freeText] : [])].join('\n') || 'Session completed.';

    // Optimistic UI — close modal and show success immediately
    setShowConfirm(false);
    setLogText('');
    setLogJustSaved(true);
    refillNotes();
    setTimeout(() => setLogJustSaved(false), 4000);

    // Write to Firestore in background with 15s timeout
    const logPayload = {
      clientId: clientData.id,
      clientName: clientData.name,
      workoutId: current.id,
      workoutName: current.name,
      workoutTitle: current.title,
      loggedAt: new Date().toISOString(),
      note: combined,
      readByCoach: false,
    };
    try {
      const writePromise = submitWorkoutLog(logPayload);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout — log saved locally, will retry')), 15000)
      );
      await Promise.race([writePromise, timeoutPromise]);
    } catch (err: any) {
      console.error('submitWorkoutLog error:', err);
      // Show non-blocking error — success UI already shown so don't confuse client
      setLogJustSaved(false);
      setSubmitError(err?.message || 'Failed to save. Check connection and try again.');
      setShowConfirm(true); // re-open modal with error shown
    }
  };

const closePlayer = () => {
  setActiveVideoUrl(null);
  setActiveVideoName(null);

  if (academyBlobUrl) URL.revokeObjectURL(academyBlobUrl);
  setAcademyBlobUrl(null);

  // consume the dummy history entry if it exists
  if (window.history.state?.modal === 'video') {
    window.history.back();
  }
};
const handleDownloadPdf = () => {
  if (!current) return;

  const doc = new jsPDF();
  let y = 20;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(current.title.toUpperCase(), 20, y);
  y += 12;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  current.exercises.forEach((ex) => {
    if (ex.category === 'header') {
      y += 8;
      doc.setFont('helvetica', 'bold');
      doc.text((ex.name || 'SECTION').toUpperCase(), 20, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      return;
    }

    const line = `${ex.name} — ${ex.sets} sets — ${ex.reps || ex.duration} — Rest: ${ex.restTime || '90s'}`;
    doc.text(line, 20, y);
    y += 6;

    if (ex.notes) {
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Notes: ${ex.notes}`, 25, y);
      doc.setTextColor(0);
      doc.setFontSize(10);
      y += 6;
    }

    y += 2;

    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  doc.save(`${current.title}.pdf`);
};

  const isExternalVideo = activeVideoUrl && !activeVideoUrl.startsWith('academy://');
  const embedUrl = isExternalVideo ? getEmbedUrl(activeVideoUrl!) : null;

  const renderExerciseRow = (ex: Exercise, idx: number, isLast: boolean) => {
    if (ex.category === 'header') {
      return (
        <div key={ex.id} className="pt-10 pb-4 px-4 group">
          <div>
  <h4 className="text-2xl font-black brand-font uppercase text-white tracking-tight leading-none">
    {ex.name || 'SECTION'}
  </h4>
  {ex.notes && (
    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1.5">
      {ex.notes}
    </p>
  )}
</div>
          <div className="h-[2px] w-full bg-white/5 mt-4 group-hover:bg-blue-600/30 transition-all"></div>
        </div>
      );
    }
const isDone = exerciseState[ex.id] || false;


    return (
      <div key={ex.id} className="group">
        <div className={`px-4 md:px-8 py-4 md:py-6 border-x border-b border-white/5 ${idx === 0 ? 'border-t' : ''} ${isLast ? 'rounded-b-2xl' : ''} transition-all ${isDone ? 'bg-emerald-500/5 opacity-60' : 'bg-slate-950/30 hover:bg-slate-900/40'}`}>

          {/* ── Desktop layout ── */}
          <div className="hidden md:grid grid-cols-12 gap-4 items-center">
            <div className="col-span-4 flex items-center gap-3">
              <div
                onClick={() => setExerciseState(prev => ({ ...prev, [ex.id]: !prev[ex.id] }))}
                className={`w-5 h-5 cursor-pointer rounded-lg border flex items-center justify-center shrink-0 transition-all ${isDone ? 'bg-emerald-500 border-emerald-500' : 'border-slate-800 bg-slate-900'}`}
              >
                {isDone ? <Check size={12} className="text-white" strokeWidth={4} /> : <div className="w-1 h-1 rounded-full bg-slate-700" />}
              </div>
              <div className="flex flex-col">
                <h4 className={`font-black uppercase text-lg brand-font tracking-tight leading-tight ${isDone ? 'text-emerald-500/70 line-through' : 'text-white'}`}>{ex.name}</h4>
                {ex.category === 'mobility' && <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest mt-1">Mobility</span>}
              </div>
            </div>
            <div className="col-span-1 flex justify-center"><span className={`text-sm font-black ${isDone ? 'text-slate-600' : 'text-blue-400'}`}>{ex.sets}</span></div>
            <div className="col-span-1 flex justify-center"><span className={`text-sm font-black uppercase ${isDone ? 'text-slate-600' : 'text-white'}`}>{ex.reps || ex.duration}</span></div>
            <div className="col-span-1 flex justify-center"><span className={`text-[10px] font-black uppercase ${isDone ? 'text-slate-700' : 'text-amber-500'}`}>{ex.restTime || '90s'}</span></div>
            <div className="col-span-5 flex items-center gap-2">
              {!isCoach && !isDone && (() => {
                const prescribed = `${ex.sets}×${ex.reps || ex.duration}`;
                return (
                  <input
                    type="text"
                    value={exerciseNotes[ex.id] || ''}
                    onChange={e => setExerciseNotes(prev => ({ ...prev, [ex.id]: e.target.value }))}
                    onFocus={() => { if (exerciseNotes[ex.id] === prescribed) setExerciseNotes(prev => ({ ...prev, [ex.id]: '' })); }}
                    onBlur={() => { if (!exerciseNotes[ex.id]?.trim()) setExerciseNotes(prev => ({ ...prev, [ex.id]: prescribed })); }}
                    className="flex-1 min-w-0 bg-slate-900/80 border border-slate-800/60 rounded-xl px-4 py-[14px] text-xs text-white font-medium focus:outline-none focus:border-blue-500/40 transition-all"
                  />
                );
              })()}

            <div className="flex items-center gap-2 flex-shrink-0">
              {ex.videoUrl && (() => {
                const thumb = ex.videoThumbnail || (ex.videoId ? skillThumbnails[ex.videoId] : null);
                return (
                  <button
                    onClick={() => { setActiveVideoUrl(ex.videoUrl!); setActiveVideoName(ex.name); }}
                    className="relative overflow-hidden rounded-xl shrink-0 group/vbtn"
                    style={{ width: thumb ? 64 : 36, height: 36 }}
                  >
                    {thumb ? (
                      <>
                        <img src={thumb} className="w-full h-full object-cover" alt="" />
                        <div className="absolute inset-0 bg-black/40 group-hover/vbtn:bg-black/20 transition-all flex items-center justify-center">
                          <PlayCircle size={18} className="text-white drop-shadow" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-blue-600/10 text-blue-500 hover:bg-blue-600/20 transition-all">
                        <PlayCircle size={20} />
                      </div>
                    )}
                  </button>
                );
              })()}
            </div>
          </div>
          </div>

          {/* ── Mobile layout ── */}
          <div className="md:hidden space-y-3">
            {/* Row 1: checkbox + name + video button */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  onClick={() => setExerciseState(prev => ({ ...prev, [ex.id]: !prev[ex.id] }))}
                  className={`w-5 h-5 cursor-pointer rounded-lg border flex items-center justify-center shrink-0 transition-all ${isDone ? 'bg-emerald-500 border-emerald-500' : 'border-slate-800 bg-slate-900'}`}
                >
                  {isDone ? <Check size={12} className="text-white" strokeWidth={4} /> : <div className="w-1 h-1 rounded-full bg-slate-700" />}
                </div>
                <div className="flex flex-col">
                  <h4 className={`font-black uppercase text-base brand-font tracking-tight leading-tight ${isDone ? 'text-emerald-500/70 line-through' : 'text-white'}`}>{ex.name}</h4>
                  {ex.category === 'mobility' && <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">Mobility</span>}
                </div>
              </div>
              {ex.videoUrl && (() => {
                const thumb = ex.videoThumbnail || (ex.videoId ? skillThumbnails[ex.videoId] : null);
                return (
                  <button
                    onClick={() => { setActiveVideoUrl(ex.videoUrl!); setActiveVideoName(ex.name); }}
                    className="relative overflow-hidden rounded-xl shrink-0 group/vbtn"
                    style={{ width: thumb ? 72 : 36, height: 40 }}
                  >
                    {thumb ? (
                      <>
                        <img src={thumb} className="w-full h-full object-cover" alt="" />
                        <div className="absolute inset-0 bg-black/40 group-hover/vbtn:bg-black/20 transition-all flex items-center justify-center">
                          <PlayCircle size={18} className="text-white drop-shadow" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-blue-600/10 text-blue-500">
                        <PlayCircle size={18} />
                      </div>
                    )}
                  </button>
                );
              })()}
            </div>

            {/* Row 2: Sets / Target / Rest */}
            <div className="flex items-center gap-4 ml-8">
              <div className="flex flex-col items-center">
                <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Sets</span>
                <span className={`text-sm font-black ${isDone ? 'text-slate-600' : 'text-blue-400'}`}>{ex.sets}</span>
              </div>
              <div className="w-px h-6 bg-slate-800" />
              <div className="flex flex-col items-center">
                <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Target</span>
                <span className={`text-sm font-black uppercase ${isDone ? 'text-slate-600' : 'text-white'}`}>{ex.reps || ex.duration}</span>
              </div>
              <div className="w-px h-6 bg-slate-800" />
              <div className="flex flex-col items-center">
                <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Rest</span>
                <span className={`text-sm font-black uppercase ${isDone ? 'text-slate-700' : 'text-amber-500'}`}>{ex.restTime || '90s'}</span>
              </div>
            </div>

            {/* Row 3: Log input with clear label */}
            {!isCoach && !isDone && (() => {
              const prescribed = `${ex.sets}×${ex.reps || ex.duration}`;
              return (
                <div className="ml-8 space-y-1">
                  <p className="text-[8px] font-black uppercase tracking-[0.25em] text-slate-500">Log your sets ↓</p>
                  <input
                    type="text"
                    value={exerciseNotes[ex.id] || ''}
                    onChange={e => setExerciseNotes(prev => ({ ...prev, [ex.id]: e.target.value }))}
                    onFocus={() => { if (exerciseNotes[ex.id] === prescribed) setExerciseNotes(prev => ({ ...prev, [ex.id]: '' })); }}
                    onBlur={() => { if (!exerciseNotes[ex.id]?.trim()) setExerciseNotes(prev => ({ ...prev, [ex.id]: prescribed })); }}
                    className="w-full bg-slate-900/80 border border-slate-800/60 rounded-xl px-4 py-3 text-sm text-white font-medium focus:outline-none focus:border-blue-500/40 transition-all"
                  />
                </div>
              );
            })()}
          </div>

        </div>
        {ex.notes && !isDone && (
          <div className="mx-4 md:mx-10 py-3 px-4 bg-blue-500/5 border-x border-b border-blue-500/10 rounded-b-xl mb-1">
            <div className="flex items-start gap-2">
              <Info size={12} className="text-blue-500 mt-0.5 shrink-0" />
              <p className="text-[10px] text-slate-500 font-medium italic leading-relaxed">Cues: {ex.notes}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="space-y-6 md:space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <Dumbbell className="w-8 h-8" style={{color: accentColor}} />
        <h2 className="text-2xl md:text-3xl font-bold uppercase brand-font tracking-tight">Training Plan</h2>
      </div>

      <div className="flex flex-col md:flex-row justify-center items-center gap-6">
        {clientData.weeklyScheduleEnabled && <ScheduleCalendar client={clientData} accentColor={accentColor} />}
        <div className="flex gap-2 md:gap-3">
          {workouts.map(w => (
            <button key={w.id} onClick={() => { setSelectedId(w.id); setExerciseState({}); setShowLogForm(false); setLogText(''); setLogJustSaved(false); }} className={`w-10 h-10 md:w-12 md:h-12 rounded-xl font-black text-base md:text-lg flex items-center justify-center border transition-all duration-300 ${selectedId === w.id ? 'text-white border-transparent shadow-lg shadow-blue-900/10' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-white'}`} style={selectedId === w.id ? {backgroundColor: accentColor} : {}}>{w.name}</button>
          ))}
        </div>
      </div>

      {current && (
        <div className="glass-card p-4 md:p-10 rounded-[2.5rem] border-white/5 shadow-2xl space-y-12 relative overflow-hidden">
          <header className="flex flex-col md:flex-row justify-between items-start gap-2 border-b border-white/5 pb-6">
            <div>
              <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.4em] opacity-40 mb-1">Sector: {current.name}</p>
              <h3 className="text-3xl md:text-4xl font-black brand-font uppercase text-white leading-none">{current.title}</h3>
          </div>

<button
  onClick={handleDownloadPdf}
  title="Download workout as PDF"
  className="flex items-center justify-center p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-all group"
>
  <Download size={18} className="text-slate-400 group-hover:text-white transition" />
</button>

</header>

          <div className="space-y-4">
             {/* LINEAR PROTOCOL FLOW (HONORING MANUALLY PLACED HEADERS) */}
             <div className="space-y-1">
                <div className="hidden md:grid grid-cols-12 gap-4 px-8 py-3 bg-white/5 rounded-t-2xl border-x border-t border-white/5">
                  <div className="col-span-4 text-[8px] font-black uppercase text-slate-500 tracking-widest">Movement</div>
                  <div className="col-span-1 text-[8px] font-black uppercase text-slate-500 tracking-widest text-center">Sets</div>
                  <div className="col-span-1 text-[8px] font-black uppercase text-slate-500 tracking-widest text-center">Target</div>
                  <div className="col-span-1 text-[8px] font-black uppercase text-slate-500 tracking-widest text-center">Rest</div>
                  <div className="col-span-5 text-[8px] font-black uppercase text-slate-500 tracking-widest pl-2">Track your progress</div>
                </div>
                {(() => {
                  const nodes: React.ReactNode[] = [];
                  const seen = new Set<string>();
                  const exercises = current.exercises;

                  exercises.forEach((ex, i) => {
                    if (seen.has(ex.id)) return;

                    if (ex.supersetGroup) {
                      const group = exercises.filter(e => e.supersetGroup === ex.supersetGroup);
                      const startIdx = exercises.indexOf(ex);
                      group.forEach(e => seen.add(e.id));

                      nodes.push(
                        <div key={ex.supersetGroup} className="rounded-2xl border border-purple-500/20 overflow-hidden">
                          <div className="flex items-center gap-2 px-4 md:px-8 py-2.5 bg-purple-500/5 border-b border-purple-500/15">
                            <span className="text-[8px] font-black uppercase tracking-widest text-purple-400">⚡ Superset · Perform back-to-back · No rest between</span>
                          </div>
                          {group.map((ssEx, ssIdx) => (
                            <React.Fragment key={ssEx.id}>
                              {renderExerciseRow(ssEx, startIdx + ssIdx, false)}
                              {ssIdx < group.length - 1 && (
                                <div className="flex items-center justify-center py-2 bg-purple-500/5 border-y border-purple-500/10">
                                  <span className="text-[8px] font-black text-purple-400/70 uppercase tracking-widest">↓ No Rest · Next Movement</span>
                                </div>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      );
                    } else {
                      seen.add(ex.id);
                      nodes.push(renderExerciseRow(ex, i, i === exercises.length - 1));
                    }
                  });

                  return nodes;
                })()}
             </div>
          </div>

          {/* Log Session Section */}
          <div className="border-t border-white/5 pt-8 space-y-6">

            {/* Client: log form */}
            {!isCoach && (
              <div className="space-y-4">
                {logJustSaved ? (
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-500">✓ Session Logged</p>
                ) : (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    <div>
                      <p className="text-xs font-black text-slate-300 uppercase tracking-wide">Anything else to add?</p>
                      <p className="text-[10px] font-medium text-slate-600 mt-1">How it felt, injuries, anything you want me to know</p>
                    </div>
                    <textarea
                      value={logText}
                      onChange={e => setLogText(e.target.value)}
                      placeholder="e.g. felt strong today, wrist was a bit sore on last set"
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-slate-200 placeholder-slate-700 font-medium resize-none focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                    />
                    <button
                      onClick={() => { setSubmitError(null); setShowConfirm(true); }}
                      className="w-full py-4 rounded-2xl font-black text-xs tracking-widest uppercase transition-all active:scale-95 bg-blue-600 hover:bg-blue-500 text-white"
                    >
                      <NotebookPen size={14} className="inline mr-2" />
                      Submit Session Log
                    </button>
                  </div>
                )}

                {/* Confirmation modal — rendered via portal so iOS Safari touch events work */}
                {showConfirm && ReactDOM.createPortal(
                  <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div
                      className="bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl p-8 max-w-sm w-full space-y-6 shadow-2xl"
                      style={{ paddingBottom: 'max(2.5rem, calc(env(safe-area-inset-bottom, 0px) + 1.5rem))' }}
                    >
                      <div className="space-y-2">
                        <p className="text-base font-black uppercase tracking-wide text-white">Submit this log?</p>
                        <p className="text-xs text-slate-500 font-medium">Your numbers and notes will be sent to your coach.</p>
                      </div>
                      {submitError && (
                        <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-2xl">
                          <p className="text-xs font-bold text-red-400 leading-snug">⚠ {submitError}</p>
                        </div>
                      )}
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={handleSubmitLog}
                          className="flex-1 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95"
                        >
                          Yes, Submit
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowConfirm(false); setSubmitError(null); }}
                          className="flex-1 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase tracking-widest transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>,
                  document.body
                )}
              </div>
            )}

            {/* Past logs */}
            {currentLogs.length > 0 && (
              <div className="space-y-3">
                <button
                  onClick={() => setShowAllLogs(p => !p)}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 hover:text-slate-400 transition-colors"
                >
                  {showAllLogs ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {isCoach ? 'Client Logs' : 'Past Logs'} ({currentLogs.length})
                </button>
                {showAllLogs && (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    {currentLogs.map(log => (
                      <div key={log.id} className="px-5 py-4 bg-slate-950/60 border border-slate-800/50 rounded-2xl space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">{formatLogDate(log.loggedAt)}</p>
                        <p className="text-sm font-medium text-slate-300 leading-relaxed">{log.note}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Video Player Modal */}
      {activeVideoUrl && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/98 backdrop-blur-3xl" onClick={closePlayer}></div>
          <div className="relative w-full max-w-5xl bg-slate-900 rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl flex flex-col">
            <button onClick={closePlayer} className="absolute top-6 right-6 z-20 p-4 bg-black/50 text-white rounded-full hover:bg-white hover:text-black transition-all backdrop-blur-md">
              <X size={24} />
            </button>
            <div className="bg-black flex items-center justify-center overflow-hidden aspect-video">
              {academyBlobUrl ? (
                <video src={academyBlobUrl} controls autoPlay className="w-full h-full object-contain" />
              ) : embedUrl ? (
                <iframe src={embedUrl} className="w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              ) : (
                <video src={activeVideoUrl} controls autoPlay className="w-full h-full object-contain" />
              )}
            </div>
          </div>
        </div>
      )}
     </section>
  );
};

export default WorkoutLibrary;
