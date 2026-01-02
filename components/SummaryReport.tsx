
import React, { useState } from 'react';
import { ClipboardCheck, Send, CheckCircle2, Sparkles } from 'lucide-react';
import { ClientData, Message, WorkoutLog } from '../types';
import { useApp } from '../AppContext';

interface Props {
  client: ClientData;
}

const SummaryReport: React.FC<Props> = ({ client }) => {
  const [text, setText] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { setClients, cloudSync } = useApp();

  const handleSubmit = () => {
    if (!text.trim()) return;

    const timestamp = new Date().toISOString();
    const newLog: WorkoutLog = {
      date: timestamp,
      workoutId: 'weekly-summary',
      exercises: [],
      clientNotes: text,
      isRead: false
    };

    const systemMsg: Message = {
      id: `summary-${Date.now()}`,
      senderId: client.id,
      text: `Weekly Technical Reflection Submitted.`,
      timestamp: timestamp,
      type: 'system',
      meta: { type: 'summary', title: 'WEEKLY SUMMARY' }
    };

    setClients(prev => prev.map(c => {
      if (c.id === client.id) {
        return {
          ...c,
          logs: [...(c.logs || []), newLog],
          messages: [...(c.messages || []), systemMsg],
          hasNewSubmission: true
        };
      }
      return c;
    }));

    setIsSubmitted(true);
    cloudSync.forceSync();
  };

  if (isSubmitted) {
    return (
      <div className="glass-card p-10 rounded-[2.5rem] border-emerald-500/30 bg-emerald-500/5 text-center space-y-4 animate-in zoom-in duration-500">
        <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
          <CheckCircle2 size={32} className="text-white" />
        </div>
        <h3 className="text-2xl font-black brand-font text-white uppercase tracking-tight">Report Logged</h3>
        <p className="text-emerald-500 text-xs font-black uppercase tracking-widest">Your coach has been notified.</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-10 rounded-[2.5rem] border-amber-500/30 bg-amber-500/5 space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-4 bg-amber-600 text-white rounded-2xl shadow-lg">
          <ClipboardCheck size={24} />
        </div>
        <div>
          <h3 className="text-2xl font-black brand-font text-white uppercase tracking-tight">Weekend Review Protocol</h3>
          <p className="text-amber-500 text-[10px] font-black uppercase tracking-widest mt-1">Weekly Performance Summary</p>
        </div>
        <div className="ml-auto flex items-center gap-2 px-4 py-2 bg-amber-500/10 rounded-xl">
           <Sparkles size={14} className="text-amber-500" />
           <span className="text-[9px] font-black text-amber-500 uppercase tracking-tighter">Required Phase</span>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-xs text-slate-400 leading-relaxed font-medium italic">
          Reflect on your technique, volume management, and recovery this week. What were your surgical breakthroughs?
        </p>
        <textarea 
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter your technical reflection here..."
          className="w-full h-40 bg-slate-950/80 border border-amber-500/20 rounded-[1.5rem] p-6 text-white text-sm outline-none focus:ring-1 ring-amber-500/50 resize-none transition-all"
        />
        <button 
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="w-full py-5 bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:hover:bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95"
        >
          <Send size={18} /> TRANSMIT SUMMARY
        </button>
      </div>
    </div>
  );
};

export default SummaryReport;
