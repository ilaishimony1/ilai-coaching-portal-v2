import React, { useState, useEffect, useRef } from 'react';
import { X, Zap, BrainCircuit, Play, RotateCcw, CheckCircle2, Trophy, Loader2, Timer, Info } from 'lucide-react';
import { ClientData } from '../types';
import { getSetCorrection } from '../geminiService';

interface Props {
  client: ClientData;
  onExit: () => void;
  accentColor: string;
  onLogSession: (summary: string) => void;
}

const HSLab: React.FC<Props> = ({ client, onExit, accentColor, onLogSession }) => {
  const [prepTime, setPrepTime] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [currentSkill, setCurrentSkill] = useState(client.goals[0]?.title || 'Handstand Balance');
  const [correction, setCorrection] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionSets, setSessionSets] = useState<{ time: number, feeling: string }[]>([]);

  // Prep Countdown Logic
  useEffect(() => {
    let timer: any;
    if (prepTime !== null && prepTime > 0) {
      timer = setInterval(() => setPrepTime(p => (p !== null ? p - 1 : null)), 1000);
    } else if (prepTime === 0) {
      setPrepTime(null);
      setIsActive(true);
    }
    return () => clearInterval(timer);
  }, [prepTime]);

  // Main Timer Logic
  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => setSeconds(s => s + 1), 10); // Using 10ms for more fluid feel
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const handleStart = () => {
    setSeconds(0);
    setCorrection(null);
    setPrepTime(5);
  };

  const handleStop = async (feeling: string) => {
    setIsActive(false);
    setIsProcessing(true);
    
    const finalSeconds = seconds / 100;
    const setLog = { time: Math.round(finalSeconds), feeling };
    setSessionSets(prev => [...prev, setLog]);

    const cue = await getSetCorrection(currentSkill, feeling, Math.round(finalSeconds));
    setCorrection(cue);
    setIsProcessing(false);
  };

  const handleFinishSession = () => {
    const totalTime = sessionSets.reduce((acc, s) => acc + s.time, 0);
    const avgTime = sessionSets.length > 0 ? (totalTime / sessionSets.length).toFixed(1) : 0;
    const summary = `HS Lab Session: ${sessionSets.length} sets of ${currentSkill}. Avg: ${avgTime}s. Total volume: ${totalTime}s.`;
    onLogSession(summary);
    onExit();
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-[#010409] flex flex-col items-center justify-between p-8 md:p-12 animate-in fade-in duration-500 hs-lab-gradient">
      {/* Header */}
      <header className="w-full flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-900/40">
            <Zap size={24} fill="currentColor" />
          </div>
          <div>
            <h2 className="text-2xl font-black brand-font uppercase text-white tracking-tighter leading-none">HS <span className="text-blue-500">LAB</span></h2>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Surgical Technical Calibration</p>
          </div>
        </div>
        <button onClick={onExit} className="p-4 bg-white/5 text-slate-400 rounded-full hover:bg-red-500 hover:text-white transition-all backdrop-blur-md">
          <X size={24} />
        </button>
      </header>

      {/* Center Display */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl">
        {prepTime !== null ? (
          <div className="text-center animate-pulse">
            <p className="text-blue-500 font-black uppercase tracking-[0.5em] text-sm mb-4">Prepare Position</p>
            <div className="text-[12rem] font-black brand-font text-white leading-none">{prepTime}</div>
          </div>
        ) : !correction ? (
          <div className="flex flex-col items-center gap-12 w-full">
            <div className="flex flex-col items-center">
              <div className={`text-[10rem] md:text-[15rem] font-black brand-font tabular-nums leading-none tracking-tighter transition-all ${isActive ? 'text-white drop-shadow-[0_0_50px_rgba(37,99,235,0.4)]' : 'text-slate-800'}`}>
                {(seconds / 100).toFixed(1)}
              </div>
              <p className="text-slate-600 font-black uppercase tracking-[1em] -mt-4">Seconds</p>
            </div>

            {isActive ? (
              <div className="flex flex-col gap-6 w-full">
                <p className="text-center text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Select Feeling to Stop</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full">
                  <FeelingBtn label="Solid" color="emerald" onClick={() => handleStop('solid')} />
                  <FeelingBtn label="Over" color="amber" onClick={() => handleStop('overbalance')} />
                  <FeelingBtn label="Under" color="blue" onClick={() => handleStop('underbalance')} />
                  <FeelingBtn label="Shoulders" color="purple" onClick={() => handleStop('closed shoulders')} />
                  <FeelingBtn label="Core" color="rose" onClick={() => handleStop('loose core')} />
                </div>
              </div>
            ) : (
              <div className="w-full space-y-4">
                <button 
                  onClick={handleStart}
                  className="w-full py-8 bg-blue-600 text-white rounded-[2.5rem] font-black text-2xl uppercase tracking-[0.3em] shadow-2xl shadow-blue-900/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4"
                >
                  <Play size={28} fill="currentColor" /> KICK UP
                </button>
                {sessionSets.length > 0 && (
                  <button onClick={handleFinishSession} className="w-full py-4 text-slate-500 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all">
                    End Session & Log Volume
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-900/50 border border-white/10 p-10 md:p-14 rounded-[3.5rem] w-full space-y-10 animate-in zoom-in duration-300 shadow-2xl">
            <div className="flex items-center gap-4 text-blue-400">
              <BrainCircuit size={40} className="animate-pulse" />
              <div>
                <h3 className="text-2xl font-black brand-font uppercase leading-none">AI Correction</h3>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Set {sessionSets.length} Calibration</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <p className="text-2xl md:text-3xl text-white font-bold leading-relaxed italic border-l-4 border-blue-600 pl-6">
                "{correction}"
              </p>
              {isProcessing && <Loader2 className="animate-spin text-blue-500" size={20} />}
            </div>

            <div className="pt-6 flex flex-col md:flex-row gap-4">
              <button 
                onClick={handleStart} 
                className="flex-1 py-6 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-blue-500 transition-all"
              >
                <RotateCcw size={16} /> NEXT SET
              </button>
              <button 
                onClick={handleFinishSession} 
                className="px-10 py-6 bg-slate-950 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-white transition-all"
              >
                FINISH SESSION
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <footer className="w-full flex flex-col items-center gap-8 py-4">
        <div className="flex gap-4 p-2 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md">
          {client.goals.slice(0, 3).map(g => (
            <button 
              key={g.id} 
              onClick={() => { if(!isActive) setCurrentSkill(g.title); }}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentSkill === g.title ? 'bg-white text-black' : 'text-slate-500 hover:text-white disabled:opacity-30'}`}
              disabled={isActive}
            >
              {g.title}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-8 opacity-40">
           <div className="flex flex-col items-center">
              <span className="text-[8px] font-black text-slate-500 uppercase">Volume</span>
              <span className="text-lg font-black text-white">{sessionSets.reduce((acc, s) => acc + s.time, 0)}s</span>
           </div>
           <div className="w-[1px] h-8 bg-slate-800"></div>
           <div className="flex flex-col items-center">
              <span className="text-[8px] font-black text-slate-500 uppercase">Sets</span>
              <span className="text-lg font-black text-white">{sessionSets.length}</span>
           </div>
           <div className="w-[1px] h-8 bg-slate-800"></div>
           <div className="flex flex-col items-center">
              <span className="text-[8px] font-black text-slate-500 uppercase">Best</span>
              <span className="text-lg font-black text-white">{sessionSets.length > 0 ? Math.max(...sessionSets.map(s => s.time)) : 0}s</span>
           </div>
        </div>
      </footer>
    </div>
  );
};

const FeelingBtn: React.FC<{ label: string, color: string, onClick: () => void }> = ({ label, color, onClick }) => {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500',
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500',
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-500 hover:bg-blue-500',
    purple: 'bg-purple-500/10 border-purple-500/30 text-purple-500 hover:bg-purple-500',
    rose: 'bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500'
  };

  return (
    <button 
      onClick={onClick} 
      className={`py-4 px-2 rounded-2xl border font-black text-[9px] uppercase tracking-widest hover:text-white transition-all ${colors[color]}`}
    >
      {label}
    </button>
  );
};

export default HSLab;