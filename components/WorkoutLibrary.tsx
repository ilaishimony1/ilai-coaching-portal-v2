
import React, { useState, useEffect, useMemo } from 'react';
import { PlayCircle, Dumbbell, X, Info, Check, Type } from 'lucide-react';
import { Workout, WorkoutLog, ClientData, Message, Exercise } from '../types';
import { useApp } from '../AppContext';
import ScheduleCalendar from './ScheduleCalendar';
import { db } from '../db';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../firebase'; // use YOUR firestore export

interface Props {
  workouts: Workout[];
  clientData: ClientData;
  accentColor: string;
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
  return url;
};

const WorkoutLibrary: React.FC<Props> = ({ workouts, clientData, accentColor }) => {
  const { clients, setClients } = useApp();
  const [selectedId, setSelectedId] = useState(workouts[0]?.id);
  
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
  

  
  
  const current = workouts.find(w => w.id === selectedId) || workouts[0];

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

  const isExternalVideo = activeVideoUrl && !activeVideoUrl.startsWith('academy://');
  const embedUrl = isExternalVideo ? getEmbedUrl(activeVideoUrl!) : null;

  const renderExerciseRow = (ex: Exercise, idx: number, isLast: boolean) => {
    if (ex.category === 'header') {
      return (
        <div key={ex.id} className="pt-10 pb-4 px-4 group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg">
              <Type size={20} />
            </div>
            <div>
              <h4 className="text-2xl font-black brand-font uppercase text-white tracking-tight leading-none">{ex.name || 'SECTION'}</h4>
              {ex.notes && <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1.5">{ex.notes}</p>}
            </div>
          </div>
          <div className="h-[2px] w-full bg-white/5 mt-4 group-hover:bg-blue-600/30 transition-all"></div>
        </div>
      );
    }
const isDone = false;

    return (
      <div key={ex.id} className="group">
        <div className={`grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-4 md:px-8 py-4 md:py-5 border-x border-b border-white/5 ${idx === 0 ? 'border-t' : ''} ${isLast ? 'rounded-b-2xl' : ''} transition-all items-center ${isDone ? 'bg-emerald-500/5 opacity-60' : 'bg-slate-950/30 hover:bg-slate-900/40'}`}>
          <div className="col-span-1 md:col-span-5 flex items-center gap-3">
            <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${isDone ? 'bg-emerald-500 border-emerald-500' : 'border-slate-800 bg-slate-900'}`}>{isDone ? <Check size={12} className="text-white" strokeWidth={4} /> : <div className="w-1 h-1 rounded-full bg-slate-700"></div>}</div>
            <div className="flex flex-col">
              <h4 className={`font-black uppercase text-base md:text-lg brand-font tracking-tight leading-tight ${isDone ? 'text-emerald-500/70 line-through' : 'text-white'}`}>{ex.name}</h4>
              {ex.category === 'mobility' && <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest mt-1">Mobility</span>}
            </div>
          </div>
          
          <div className="hidden md:flex col-span-1 flex-col items-center"><span className={`text-sm font-black ${isDone ? 'text-slate-600' : 'text-blue-400'}`}>{ex.sets}</span></div>
          <div className="hidden md:flex col-span-2 flex-col items-center"><span className={`text-sm font-black uppercase ${isDone ? 'text-slate-600' : 'text-white'}`}>{ex.reps || ex.duration}</span></div>
          <div className="hidden md:flex col-span-1 flex-col items-center"><span className={`text-[10px] font-black uppercase ${isDone ? 'text-slate-700' : 'text-amber-500'}`}>{ex.restTime || '90s'}</span></div>

          <div className="col-span-1 md:col-span-3 flex items-center justify-end gap-3">
            <div className="md:hidden flex flex-1 items-center gap-4">
  <div className="flex flex-col">
    <span className="text-[7px] font-black text-slate-600 uppercase">Sets</span>
    <span className="text-xs font-black text-blue-400">{ex.sets}</span>
  </div>

  <div className="flex flex-col">
    <span className="text-[7px] font-black text-slate-600 uppercase">Target</span>
    <span className="text-xs font-black text-white">
      {ex.reps || ex.duration}
    </span>
  </div>

  <div className="flex flex-col">
    <span className="text-[7px] font-black text-slate-600 uppercase">Rest</span>
    <span className="text-xs font-black text-amber-500">
      {ex.restTime || '90s'}
    </span>
  </div>
</div>

            
            <div className="flex items-center gap-2">
              {ex.videoUrl && <button onClick={() => { setActiveVideoUrl(ex.videoUrl!); setActiveVideoName(ex.name); }} className="w-10 h-10 md:w-9 md:h-9 flex items-center justify-center bg-blue-600/10 text-blue-500 rounded-xl md:rounded-lg"><PlayCircle size={20} /></button>}
              </div>
            </div>
        </div>
        {ex.notes && !isDone && (
          <div className="mx-4 md:mx-10 py-3 px-4 bg-blue-500/5 border-x border-b border-blue-500/10 rounded-b-xl mb-3">
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
        <ScheduleCalendar client={clientData} accentColor={accentColor} />
        <div className="flex gap-2 md:gap-3">
          {workouts.map(w => (
            <button key={w.id} onClick={() => { setSelectedId(w.id); setExerciseState({}); }} className={`w-10 h-10 md:w-12 md:h-12 rounded-xl font-black text-base md:text-lg flex items-center justify-center border transition-all duration-300 ${selectedId === w.id ? 'text-white border-transparent shadow-lg shadow-blue-900/10' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-white'}`} style={selectedId === w.id ? {backgroundColor: accentColor} : {}}>{w.name}</button>
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
          </header>

          <div className="space-y-4">
             {/* LINEAR PROTOCOL FLOW (HONORING MANUALLY PLACED HEADERS) */}
             <div className="space-y-1">
                <div className="hidden md:grid grid-cols-12 gap-4 px-8 py-3 bg-white/5 rounded-t-2xl border-x border-t border-white/5">
                  <div className="col-span-5 text-[8px] font-black uppercase text-slate-500 tracking-widest">Movement</div>
                  <div className="col-span-1 text-[8px] font-black uppercase text-slate-500 tracking-widest text-center">Sets</div>
                  <div className="col-span-2 text-[8px] font-black uppercase text-slate-500 tracking-widest text-center">Target</div>
                  <div className="col-span-1 text-[8px] font-black uppercase text-slate-500 tracking-widest text-center">Rest</div>
                  <div className="col-span-3 text-[8px] font-black uppercase text-slate-500 tracking-widest text-right">Actions</div>
                </div>
                {current.exercises.map((ex, i) => renderExerciseRow(ex, i, i === current.exercises.length - 1))}
             </div>
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
