
import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { X, Check, Download, Send, ChevronDown, ChevronUp, Play } from 'lucide-react';
import { Workout, WorkoutLog, ClientData, Exercise } from '../types';
import { useApp } from '../AppContext';
import ScheduleCalendar from './ScheduleCalendar';
import { db } from '../db';
import { getSkillVideos } from '../firebase/skillVideos';
import { jsPDF } from 'jspdf';
import CoachDirectives from './CoachDirectives';
import { niceCase, textDir, exerciseMeta } from './ui';
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
  // Which exercise lines are opened up to show the cue, video and "Your numbers".
  const [openRows, setOpenRows] = useState<Record<string, boolean>>({});
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
    // The "Session logged" box stays until another workout tab is picked.
    setLogJustSaved(true);
    refillNotes();

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

  const firstName = (clientData.name || '').split(' ')[0];

  const openVideo = (ex: Exercise) => { setActiveVideoUrl(ex.videoUrl!); setActiveVideoName(ex.name); };

  const renderExerciseRow = (ex: Exercise) => {
    if (ex.category === 'header') {
      return (
        <div key={ex.id} className="flex flex-col gap-[3px] pt-3.5 pb-1 px-0.5">
          <h4 {...textDir(ex.name)} className="text-lg font-extrabold text-mob">{niceCase(ex.name) || 'Section'}</h4>
          {ex.notes && <p {...textDir(ex.notes)} className="text-sm leading-[1.45] text-muted">{ex.notes}</p>}
        </div>
      );
    }

    const isDone = exerciseState[ex.id] || false;
    const isOpen = !!openRows[ex.id];
    const meta = exerciseMeta(ex);
    const thumb = ex.videoThumbnail || (ex.videoId ? skillThumbnails[ex.videoId] : null);
    const prescribed = `${ex.sets}×${ex.reps || ex.duration}`;

    return (
      <div
        key={ex.id}
        className={`rounded-[14px] transition-colors ${isOpen ? 'bg-raised border border-edge rounded-2xl p-3 flex flex-col gap-3' : 'bg-card'} ${isDone && !isOpen ? 'opacity-60' : ''}`}
      >
        <div className={`flex gap-3 items-center min-h-[44px] ${isOpen ? '' : 'px-3 py-[11px]'}`}>
          <button
            type="button"
            onClick={() => setExerciseState(prev => ({ ...prev, [ex.id]: !prev[ex.id] }))}
            aria-label={isDone ? `Mark ${niceCase(ex.name)} as not done` : `Mark ${niceCase(ex.name)} as done`}
            className="-m-2.5 p-2.5 shrink-0"
          >
            {isDone ? (
              <span className="w-6 h-6 rounded-[7px] bg-done flex items-center justify-center">
                <Check size={13} className="text-white" strokeWidth={3.5} />
              </span>
            ) : (
              <span className="block w-6 h-6 rounded-[7px] border-[1.5px] border-tick" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setOpenRows(prev => ({ ...prev, [ex.id]: !prev[ex.id] }))}
            aria-expanded={isOpen}
            className="flex-1 min-w-0 flex items-center gap-3 text-left"
          >
            <span className="flex-1 min-w-0 flex flex-col gap-px">
              <span {...textDir(ex.name)} className={`text-base font-bold ${isDone ? 'line-through' : ''}`}>{niceCase(ex.name)}</span>
              {(meta || ex.category === 'mobility') && (
                <span className="text-[13px] text-muted">
                  {ex.category === 'mobility' && <span className="text-mob font-bold">Mobility{meta ? ' · ' : ''}</span>}
                  {meta}
                </span>
              )}
            </span>
            {ex.videoUrl && !isOpen && <Play size={16} className="text-accent fill-accent shrink-0" />}
            {isOpen ? <ChevronUp size={18} className="text-muted shrink-0" /> : <ChevronDown size={18} className="text-muted shrink-0" />}
          </button>
        </div>

        {isOpen && (
          <>
            {ex.notes && (
              <p {...textDir(ex.notes)} className="text-[15px] leading-[1.45] text-ink pl-9 whitespace-pre-line">{ex.notes}</p>
            )}
            {ex.videoUrl && (
              thumb ? (
                <button
                  type="button"
                  onClick={() => openVideo(ex)}
                  aria-label={`Play the ${niceCase(ex.name)} video`}
                  className="ml-9 relative h-[150px] rounded-xl overflow-hidden bg-black"
                >
                  <img src={thumb} alt="" className="w-full h-full object-cover object-[center_40%] block" />
                  <span className="absolute inset-0 flex items-center justify-center bg-[rgba(15,27,43,0.35)]">
                    <span className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                      <Play size={20} className="text-onaccent fill-onaccent ml-0.5" />
                    </span>
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openVideo(ex)}
                  className="ml-9 h-12 rounded-xl bg-card border border-edge text-ink text-[15px] font-bold flex items-center justify-center gap-2"
                >
                  <Play size={16} className="text-accent fill-accent" /> Watch the video
                </button>
              )
            )}
            {!isCoach && !isDone && (
              <label className="flex flex-col gap-1.5 pl-9">
                <span className="text-[13px] font-semibold text-muted">Your numbers</span>
                <input
                  type="text"
                  value={exerciseNotes[ex.id] || ''}
                  onChange={e => setExerciseNotes(prev => ({ ...prev, [ex.id]: e.target.value }))}
                  onFocus={() => { if (exerciseNotes[ex.id] === prescribed) setExerciseNotes(prev => ({ ...prev, [ex.id]: '' })); }}
                  onBlur={() => { if (!exerciseNotes[ex.id]?.trim()) setExerciseNotes(prev => ({ ...prev, [ex.id]: prescribed })); }}
                  className="h-[46px] rounded-xl border-[1.5px] border-edge bg-field text-ink px-3 text-base font-semibold outline-none focus:border-accent transition-colors"
                />
              </label>
            )}
          </>
        )}
      </div>
    );
  };

  const workoutCols = Math.min(Math.max(workouts.length, 1), 4);

  return (
    <section className="flex flex-col gap-3.5">
      {clientData.weeklyScheduleEnabled && (
        <div className="self-start"><ScheduleCalendar client={clientData} accentColor={accentColor} /></div>
      )}

      {/* Workout tabs: the letter, with the workout's name under it. */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${workoutCols}, minmax(0, 1fr))` }}>
        {workouts.map(w => {
          const on = current?.id === w.id;
          return (
            <button
              key={w.id}
              onClick={() => { setSelectedId(w.id); setExerciseState({}); setOpenRows({}); setShowLogForm(false); setLogText(''); setLogJustSaved(false); }}
              className={`flex flex-col items-center gap-px py-[9px] px-0.5 rounded-xl min-w-0 transition-colors ${on ? 'bg-accent text-onaccent' : 'bg-card text-ink'}`}
            >
              <span className="text-[17px] font-extrabold">{w.name}</span>
              {w.title && (
                <span className={`text-[11px] max-w-full truncate ${on ? 'font-bold' : 'font-semibold text-muted'}`}>{niceCase(w.title)}</span>
              )}
            </button>
          );
        })}
      </div>

      {current && (
        <>
          <div className="flex justify-between items-center gap-3">
            <h3 {...textDir(current.title)} className="text-2xl font-extrabold">{niceCase(current.title) || `Workout ${current.name}`}</h3>
            <button
              onClick={handleDownloadPdf}
              aria-label="Download as PDF"
              title="Download as PDF"
              className="w-11 h-11 rounded-xl border border-edge bg-card text-muted hover:text-ink flex items-center justify-center shrink-0 transition-colors"
            >
              <Download size={18} />
            </button>
          </div>

          <CoachDirectives notes={clientData.generalNotes} />

          {/* One line per exercise; tap a line to open it. */}
          <div className="flex flex-col gap-1.5">
            {(() => {
              const nodes: React.ReactNode[] = [];
              const seen = new Set<string>();
              const exercises = current.exercises;

              exercises.forEach(ex => {
                if (seen.has(ex.id)) return;

                if (ex.supersetGroup) {
                  const group = exercises.filter(e => e.supersetGroup === ex.supersetGroup);
                  group.forEach(e => seen.add(e.id));
                  nodes.push(
                    <div key={ex.supersetGroup} className="flex flex-col gap-1.5 rounded-2xl border border-edge p-1.5">
                      <span className="text-[13px] font-bold text-accent px-1.5 pt-1">Superset · back to back, no rest between</span>
                      {group.map(ssEx => renderExerciseRow(ssEx))}
                    </div>
                  );
                } else {
                  seen.add(ex.id);
                  nodes.push(renderExerciseRow(ex));
                }
              });

              return nodes;
            })()}
          </div>

          {/* Sending the session log */}
          {!isCoach && (
            logJustSaved ? (
              <div className="flex flex-col items-center gap-2.5 text-center bg-card border border-done rounded-[18px] px-[18px] py-6 mt-2.5">
                <span className="w-14 h-14 rounded-full bg-done flex items-center justify-center">
                  <Check size={28} className="text-white" strokeWidth={3} />
                </span>
                <span className="text-[22px] font-extrabold">Session logged</span>
                <span className="text-[15px] leading-[1.45] text-muted">Your numbers and notes were sent to Ilai.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-2.5">
                <span className="flex flex-col gap-0.5">
                  <span className="text-base font-bold">Anything else to add?</span>
                  <span className="text-[13px] text-muted">How it felt, injuries, anything you want me to know</span>
                </span>
                <textarea
                  value={logText}
                  onChange={e => setLogText(e.target.value)}
                  placeholder="e.g. felt strong today, wrist was a bit sore on last set"
                  rows={2}
                  dir="auto"
                  className="h-[76px] rounded-[14px] border-[1.5px] border-edge bg-field text-ink p-3 text-[15px] font-medium resize-none outline-none focus:border-accent transition-colors"
                />
                <button
                  onClick={() => { setSubmitError(null); setShowConfirm(true); }}
                  className="h-[54px] rounded-[14px] bg-accent text-onaccent text-[17px] font-extrabold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  <Send size={18} /> Send session log
                </button>
              </div>
            )
          )}

          {/* Confirm step — rendered via portal so iOS Safari touch events work */}
          {!isCoach && showConfirm && ReactDOM.createPortal(
            <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center bg-black/60">
              <div
                className="bg-card border border-edge rounded-t-3xl sm:rounded-3xl p-6 max-w-sm w-full flex flex-col gap-5"
                style={{ paddingBottom: 'max(2rem, calc(env(safe-area-inset-bottom, 0px) + 1.5rem))' }}
              >
                <div className="flex flex-col gap-1.5">
                  <p className="text-xl font-extrabold text-ink">Send this log?</p>
                  <p className="text-[15px] text-muted">Your numbers and notes will be sent to Ilai.</p>
                </div>
                {submitError && (
                  <div className="px-4 py-3 bg-alert/10 border border-alert/40 rounded-[14px]">
                    <p className="text-sm font-bold text-alert leading-snug">⚠ {submitError}</p>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleSubmitLog}
                    className="flex-1 h-[52px] rounded-[14px] bg-accent text-onaccent text-base font-extrabold active:scale-95 transition-transform"
                  >
                    Yes, send
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowConfirm(false); setSubmitError(null); }}
                    className="flex-1 h-[52px] rounded-[14px] bg-raised border border-edge text-ink text-base font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Past logs */}
          {currentLogs.length > 0 && (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowAllLogs(p => !p)}
                className="self-start flex items-center gap-1.5 h-11 text-muted hover:text-ink text-[15px] font-bold transition-colors"
              >
                {showAllLogs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {isCoach ? `${firstName}'s logs` : 'Past logs'} ({currentLogs.length})
              </button>
              {showAllLogs && currentLogs.map(log => (
                <div key={log.id} className="flex flex-col gap-1 bg-card rounded-[14px] px-3.5 py-3">
                  <p className="text-[13px] font-bold text-muted">{formatLogDate(log.loggedAt)}</p>
                  <p {...textDir(log.note)} className="text-[15px] leading-[1.45] whitespace-pre-line">{log.note}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Video player */}
      {activeVideoUrl && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 md:p-10">
          <div className="absolute inset-0 bg-black/90" onClick={closePlayer}></div>
          <div className="relative w-full max-w-5xl bg-card rounded-2xl overflow-hidden border border-edge flex flex-col">
            <button onClick={closePlayer} aria-label="Close video" className="absolute top-3 right-3 z-20 w-11 h-11 bg-black/60 text-white rounded-full flex items-center justify-center">
              <X size={22} />
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
