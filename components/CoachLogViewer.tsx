
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../AppContext';
import { BarChart3, Clock, ChevronRight, Activity, Calendar, User, MessageSquare, Play, Video, X, Info, CheckCircle2, ClipboardCheck, Inbox, Send, MessageSquareText, Smartphone } from 'lucide-react';
import { db } from '../db';
import { WorkoutLog } from '../types';

interface Props {
  accentColor: string;
  onMarkAsRead: (clientId: string, logDate: string) => void;
  initialFilter?: { clientId: string; type: 'WORKOUT' | 'SUMMARY' } | null;
  onClearFilter?: () => void;
}

const CoachLogViewer: React.FC<Props> = ({ accentColor, onMarkAsRead, initialFilter, onClearFilter }) => {
  const { clients } = useApp();
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [activeVideoName, setActiveVideoName] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'WORKOUT' | 'SUMMARY'>('WORKOUT');
  const [showOnlyUnread, setShowOnlyUnread] = useState(true);

  // Handle deep-linking from chat notifications
  useEffect(() => {
    if (initialFilter) {
      setSelectedClient(initialFilter.clientId);
      setFilterType(initialFilter.type);
      setShowOnlyUnread(false);
      
      if (onClearFilter) {
        setTimeout(onClearFilter, 100);
      }
    }
  }, [initialFilter]);

  const client = clients.find(c => c.id === selectedClient);

  const filteredLogs = useMemo(() => {
    if (!client?.logs) return [];
    return client.logs
      .filter(l => {
        const isSummary = l.workoutId === 'weekly-summary';
        const matchesType = filterType === 'SUMMARY' ? isSummary : !isSummary;
        const matchesRead = showOnlyUnread ? !l.isRead : true;
        return matchesType && matchesRead;
      })
      .slice()
      .reverse();
  }, [client, filterType, showOnlyUnread]);

  const playAthleteVideo = async (uid: string, exName: string) => {
    const submission = await db.clientSubmissions.where('uid').equals(uid).first();
    if (submission) {
      const url = URL.createObjectURL(submission.blob);
      setActiveVideoUrl(url);
      setActiveVideoName(`${client?.name} - ${exName}`);
    }
  };

  const closePlayer = () => {
    if (activeVideoUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(activeVideoUrl);
    }
    setActiveVideoUrl(null);
    setActiveVideoName(null);
  };

  const handleProcessLog = (clientId: string, logDate: string) => {
    onMarkAsRead(clientId, logDate);
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h2 className="text-5xl font-black brand-font uppercase text-white tracking-tight leading-none">Performance Lab</h2>
          <p className="text-blue-500 font-bold uppercase text-[10px] tracking-[0.4em] mt-2">Athlete Feed & Protocol Inbox</p>
        </div>
        <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-white/5">
          <button 
            onClick={() => setFilterType('WORKOUT')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${filterType === 'WORKOUT' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Activity size={14} /> Workout Logs
          </button>
          <button 
            onClick={() => setFilterType('SUMMARY')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${filterType === 'SUMMARY' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <ClipboardCheck size={14} /> Summaries
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Athlete Selection */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Active Rosters</h3>
            <button 
              onClick={() => setShowOnlyUnread(!showOnlyUnread)}
              className={`text-[8px] font-black uppercase tracking-tighter px-2 py-1 rounded border transition-all ${showOnlyUnread ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' : 'bg-slate-900 text-slate-600 border-slate-800'}`}
            >
              {showOnlyUnread ? 'SHOWING UNREAD' : 'SHOWING ALL'}
            </button>
          </div>
          {clients.map(c => {
            const unreadInFilter = c.logs?.filter(l => {
              const isSummary = l.workoutId === 'weekly-summary';
              return (filterType === 'SUMMARY' ? isSummary : !isSummary) && !l.isRead;
            }).length || 0;

            return (
              <button 
                key={c.id} 
                onClick={() => setSelectedClient(c.id)}
                className={`w-full p-6 rounded-[2rem] border transition-all flex items-center justify-between group ${
                  selectedClient === c.id 
                  ? 'bg-white/5 border-blue-500 shadow-lg shadow-blue-900/10' 
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800 border border-white/5 relative">
                    {c.avatar ? <img src={c.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-black italic">IS</div>}
                    {unreadInFilter > 0 && <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-slate-900 animate-pulse"></div>}
                  </div>
                  <div className="text-left">
                    <span className={`font-black uppercase brand-font tracking-wide text-lg block leading-none ${selectedClient === c.id ? 'text-white' : ''}`}>{c.name}</span>
                    {unreadInFilter > 0 && <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">{unreadInFilter} Pending</span>}
                  </div>
                </div>
                <ChevronRight size={18} className={selectedClient === c.id ? 'text-blue-500' : 'text-slate-800'} />
              </button>
            );
          })}
        </div>

        {/* Log Details */}
        <div className="lg:col-span-8">
          {client ? (
            <div className="space-y-10 pb-20">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log, idx) => (
                  <div key={idx} className={`glass-card p-8 md:p-10 rounded-[3rem] border-white/5 space-y-8 animate-in slide-in-from-right-10 duration-500 relative overflow-hidden ${!log.isRead ? 'ring-2 ring-blue-500/20' : ''}`}>
                    {!log.isRead && <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[60px] pointer-events-none"></div>}
                    
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                      <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-2xl ${log.workoutId === 'weekly-summary' ? 'bg-amber-600/10 text-amber-500' : 'bg-blue-600/10 text-blue-500'}`}>
                          {log.workoutId === 'weekly-summary' ? <ClipboardCheck size={24} /> : <Calendar size={24} />}
                        </div>
                        <div>
                          <h4 className="text-2xl font-black text-white brand-font uppercase leading-none">
                            {log.workoutId === 'weekly-summary' ? 'Summary Update' : 'Protocol Transmission'}
                          </h4>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                            {new Date(log.date).toLocaleDateString('en-GB')} @ {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {log.isRead && (
                          <div className="px-5 py-2 bg-slate-900 text-slate-500 rounded-xl font-black text-[9px] uppercase tracking-widest border border-white/5">
                            Archived
                          </div>
                        )}
                      </div>
                    </div>

                    {log.workoutId === 'weekly-summary' ? (
                      <div className="p-8 bg-slate-950/50 border border-white/5 rounded-[2rem] space-y-4">
                        <div className="flex items-center gap-2 text-amber-500">
                          <MessageSquare size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Athlete Reflection</span>
                        </div>
                        <p className="text-sm text-slate-300 font-medium leading-relaxed italic">
                          "{log.clientNotes}"
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-6">
                        {log.exercises.map((exLog, exIdx) => {
                          const originalEx = client.workouts.flatMap(w => w.exercises).find(e => e.id === exLog.id);
                          return (
                            <div key={exIdx} className="p-8 bg-slate-950/50 border border-white/5 rounded-[2rem] space-y-6 group hover:border-white/10 transition-all">
                              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                <div className="space-y-1">
                                  <span className="text-[9px] text-slate-600 font-black uppercase tracking-tighter">Movement Identifier</span>
                                  <h5 className="text-xl font-black text-slate-200 uppercase brand-font leading-none">{originalEx?.name || 'Unknown Movement'}</h5>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/5">
                                <div className="space-y-3">
                                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                                    <Video size={12} /> Performance Reel
                                  </p>
                                  {exLog.clientVideoId ? (
                                    <div className="relative aspect-video rounded-2xl bg-black overflow-hidden group/vid cursor-pointer" onClick={() => playAthleteVideo(exLog.clientVideoId!, originalEx?.name || 'Movement')}>
                                      <div className="absolute inset-0 bg-blue-600/10 flex items-center justify-center">
                                         <Play size={24} className="text-white group-hover/vid:scale-110 transition-transform" fill="currentColor" />
                                      </div>
                                      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg border border-white/5">
                                        <span className="text-[8px] font-black text-white uppercase tracking-tighter">Click to Play</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="aspect-video rounded-2xl bg-slate-900/50 border border-dashed border-slate-800 flex items-center justify-center">
                                      <span className="text-[9px] font-black text-slate-700 uppercase">No Video Sync'd</span>
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-3">
                                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                                    <MessageSquare size={12} /> Technical Notes
                                  </p>
                                  <div className="bg-slate-900 rounded-2xl p-5 border border-white/5 min-h-[100px]">
                                     <p className="text-xs text-slate-400 font-medium italic leading-relaxed">
                                       {exLog.clientNotes ? `"${exLog.clientNotes}"` : "No technical context provided for this set."}
                                     </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* ACTION SECTION - SIMPLIFIED */}
                    {!log.isRead && (
                      <div className="pt-10 border-t border-white/5 animate-in slide-in-from-bottom-4 duration-500">
                        <button 
                          onClick={() => handleProcessLog(client.id, log.date)}
                          className="w-full py-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-xl transition-all active:scale-[0.98] flex flex-col items-center justify-center gap-1 group"
                        >
                          <div className="flex items-center gap-3">
                            <CheckCircle2 size={18} /> MARK AS REVIEWED
                          </div>
                          <span className="text-[8px] opacity-60 font-black">ACKNOWLEDGE & NOTIFY VIA WHATSAPP</span>
                        </button>
                      </div>
                    )}

                    {log.isRead && (
                      <div className="flex items-center gap-3 justify-center py-4 text-slate-600">
                        <Smartphone size={14} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Protocol Sync'd to Mobile</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="h-[400px] glass-card rounded-[3rem] border-dashed border-white/5 flex flex-col items-center justify-center text-center p-12">
                   <Inbox className="w-16 h-16 text-slate-800 mb-6" />
                   <h4 className="text-2xl font-black text-slate-500 uppercase brand-font">Protocol Clear</h4>
                   <p className="text-sm text-slate-600 mt-2">No {filterType.toLowerCase()} transmissions pending review.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-[600px] glass-card rounded-[3rem] border-dashed border-white/5 flex flex-col items-center justify-center text-center p-12">
               <User className="w-20 h-20 text-slate-900 mb-6" />
               <h4 className="text-3xl font-black text-slate-700 uppercase brand-font">Select Athlete Protocol</h4>
               <p className="text-sm text-slate-600 mt-2">Access performance reel and decrypt movement notes.</p>
            </div>
          )}
        </div>
      </div>

      {activeVideoUrl && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[#020617]/95 backdrop-blur-2xl" onClick={closePlayer}></div>
          
          <div className="relative w-full max-w-4xl bg-slate-950 rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl">
            <div className="absolute top-6 right-6 z-30">
              <button 
                onClick={closePlayer}
                className="p-4 bg-white/5 text-white rounded-full hover:bg-red-500 transition-all border border-white/5"
              >
                <X size={20} />
              </button>
            </div>

            <div className="aspect-video bg-black flex items-center justify-center">
              <video 
                src={activeVideoUrl} 
                className="w-full h-full object-contain"
                controls
                autoPlay
                playsInline
              />
            </div>

            <div className="p-8 bg-slate-900 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 text-white rounded-xl">
                  <Video size={20} />
                </div>
                <div>
                  <p className="text-[8px] font-black text-blue-400 uppercase tracking-[0.3em] leading-none">Athlete Transmission</p>
                  <h3 className="text-xl font-black text-white uppercase brand-font mt-1">{activeVideoName}</h3>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <Info size={14} className="text-emerald-500" />
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Technical Review Active</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoachLogViewer;
