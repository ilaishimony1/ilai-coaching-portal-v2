
import VideoUploader from './VideoUploader'; // adjust path if needed
import React, { useState } from 'react';
import { Library, Trash2, Edit3, ChevronRight, Dumbbell, Zap, Sparkles, X, Check, Eye, User, FileText, Info, UserPlus, Smartphone, Send, PlusCircle, Type } from 'lucide-react';
import { useApp } from '../AppContext';
import { WorkoutTemplate, Exercise, ClientData, Workout } from '../types';

const generateUniqueId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const MasterLibrary: React.FC = () => {
  const { savedWorkouts, setSavedWorkouts, clients, setClients, cloudSync } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<WorkoutTemplate | null>(null);
  const [assigningTemplate, setAssigningTemplate] = useState<WorkoutTemplate | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [targetModuleId, setTargetModuleId] = useState<string>(""); // "" means create new

  const executeDelete = async (id: string) => {
    const updatedLibrary = savedWorkouts.filter(w => w.id !== id);
    setSavedWorkouts(updatedLibrary);
    setDeletingId(null);
    await cloudSync.forceSync();
  };

  const startEdit = (e: React.MouseEvent, template: WorkoutTemplate) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(template.id);
    setTempTitle(template.title);
  };

  const saveEdit = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editingId) return;
    const updatedLibrary = savedWorkouts.map(w => w.id === editingId ? { ...w, title: tempTitle } : w);
    setSavedWorkouts(updatedLibrary);
    setEditingId(null);
    await cloudSync.forceSync();
  };

  const handleExecuteAssignment = () => {
    if (!assigningTemplate || !selectedClientId) return;

    setClients(prev => prev.map(c => {
      if (c.id !== selectedClientId) return c;
      
      const newWorkouts = [...c.workouts];
      
      if (targetModuleId === "NEW") {
        // Find next available letter
        const existingLetters = c.workouts.map(w => w.name.toUpperCase());
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let nextLetter = 'A';
        for (const char of alphabet) {
          if (!existingLetters.includes(char)) {
            nextLetter = char;
            break;
          }
        }

        const newModule: Workout = {
          id: generateUniqueId('w'),
          name: nextLetter,
          title: assigningTemplate.title,
          exercises: assigningTemplate.exercises.map(ex => ({ ...ex, id: generateUniqueId('ex') }))
        };
        newWorkouts.push(newModule);
      } else {
        // Override existing
        const idx = newWorkouts.findIndex(w => w.id === targetModuleId);
        if (idx !== -1) {
          newWorkouts[idx] = {
            ...newWorkouts[idx],
            title: assigningTemplate.title,
            exercises: assigningTemplate.exercises.map(ex => ({ ...ex, id: generateUniqueId('ex') }))
          };
        }
      }

      return { ...c, workouts: newWorkouts };
    }));

    cloudSync.forceSync();
    alert(`Protocol "${assigningTemplate.title}" dispatched to athlete.`);
    setAssigningTemplate(null);
    setSelectedClientId("");
    setTargetModuleId("");
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-5xl font-black brand-font uppercase text-white tracking-tight leading-none">Protocol Library</h2>
          <p className="text-blue-500 font-bold uppercase text-[10px] tracking-[0.4em] mt-2 flex items-center gap-2">
            <Library size={14} /> Master Blueprints & Modular Templates
          </p>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3">
          <Library className="text-blue-500" size={18} />
          <span className="text-xs font-black uppercase text-white">{savedWorkouts.length} Templates Stored</span>
        </div>
      </header>
{/* Video Uploader */}
<VideoUploader clientId="master" />

      {savedWorkouts.length === 0 ? (
        <div className="py-32 text-center border-2 border-dashed border-slate-900 rounded-[4rem] bg-slate-950/20">
          <Library className="mx-auto text-slate-800 mb-6" size={64} />
          <h4 className="text-xl font-black text-slate-700 uppercase brand-font">Library Empty</h4>
          <p className="text-slate-800 font-bold uppercase text-[9px] tracking-widest mt-2">No master protocols have been saved yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {savedWorkouts.map(template => (
            <div 
              key={template.id} 
              className="glass-card p-6 rounded-[2rem] border-slate-800 hover:border-blue-500/30 transition-all duration-300 group relative overflow-hidden flex flex-col text-left"
            >
              {deletingId === template.id && (
                <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
                  <p className="text-white font-black brand-font uppercase text-xs mb-6 tracking-widest text-center">Delete Template?</p>
                  <div className="flex gap-3 w-full">
                    <button onClick={() => setDeletingId(null)} className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-700 transition-all">No</button>
                    <button onClick={() => executeDelete(template.id)} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-500 transition-all">Yes</button>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 font-black brand-font text-lg">
                  {template.name}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button type="button" onClick={(e) => startEdit(e, template)} className="p-2 text-slate-600 hover:text-blue-400 transition-colors">
                     <Edit3 size={14} className="pointer-events-none" />
                   </button>
                   <button type="button" onClick={(e) => { e.stopPropagation(); setDeletingId(template.id); }} className="p-2 text-slate-600 hover:text-red-500 transition-colors">
                     <Trash2 size={14} className="pointer-events-none" />
                   </button>
                </div>
              </div>

              {editingId === template.id ? (
                <div className="flex gap-2 mb-3">
                  <input 
                    value={tempTitle} 
                    onChange={e => setTempTitle(e.target.value)} 
                    className="flex-1 bg-slate-950 border border-blue-500 p-2 rounded-lg text-[10px] font-black uppercase text-white outline-none"
                    autoFocus
                  />
                  <button type="button" onClick={saveEdit} className="p-2 bg-blue-600 text-white rounded-lg">
                    <Check size={14} className="pointer-events-none" />
                  </button>
                </div>
              ) : (
                <h4 className="text-lg font-black text-white uppercase brand-font tracking-tight leading-none mb-1">{template.title || "UNTITLED MOD"}</h4>
              )}

              <div className="flex flex-col gap-1 mb-6">
                 <div className="flex items-center gap-2 text-slate-500">
                    <User size={10} className="shrink-0" />
                    <span className="text-[8px] font-black uppercase tracking-widest truncate">{template.originalClientName || 'MASTER SECTOR'}</span>
                 </div>
                 <div className="flex items-center gap-2 text-slate-600">
                    <Zap size={10} className="shrink-0" />
                    <span className="text-[8px] font-black uppercase tracking-widest">{template.exercises.length} Movements</span>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-auto">
                 <button 
                  onClick={() => setPreviewTemplate(template)}
                  className="py-3 bg-slate-900 border border-slate-800 rounded-xl text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all flex items-center justify-center gap-2"
                 >
                   <Eye size={12} className="pointer-events-none" /> Preview
                 </button>
                 <button 
                  onClick={() => setAssigningTemplate(template)}
                  className="py-3 bg-blue-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                 >
                   <UserPlus size={12} className="pointer-events-none" /> Assign
                 </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assignment Modal */}
      {assigningTemplate && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[#020617]/95 backdrop-blur-xl" onClick={() => setAssigningTemplate(null)}></div>
          <div className="relative w-full max-w-xl glass-card rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col">
             <div className="p-8 border-b border-white/5 flex justify-between items-center bg-blue-600/5">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg"><UserPlus size={24}/></div>
                   <div>
                      <h3 className="text-2xl font-black brand-font uppercase text-white tracking-tight leading-none">Assign Protocol</h3>
                      <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-1">Targeting Athlete Portals</p>
                   </div>
                </div>
                <button onClick={() => setAssigningTemplate(null)} className="p-3 bg-white/5 text-slate-400 hover:text-white rounded-xl transition-all"><X size={24}/></button>
             </div>

             <div className="p-8 space-y-8">
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">1. Select Target Athlete</label>
                   <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto no-scrollbar">
                      {clients.map(c => (
                        <button 
                          key={c.id}
                          onClick={() => { setSelectedClientId(c.id); setTargetModuleId(""); }}
                          className={`p-4 rounded-2xl border transition-all flex items-center gap-4 ${selectedClientId === c.id ? 'bg-blue-600 border-blue-400 text-white shadow-xl' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                        >
                           <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-800 shrink-0">
                              {c.avatar ? <img src={c.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-black">IS</div>}
                           </div>
                           <span className="text-xs font-black uppercase tracking-widest">{c.name}</span>
                           {selectedClientId === c.id && <Check size={14} className="ml-auto" />}
                        </button>
                      ))}
                   </div>
                </div>

                {selectedClient && (
                  <div className="space-y-3 animate-in slide-in-from-top-4 duration-300">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">2. Select Module Slot</label>
                     <div className="flex flex-wrap gap-3">
                        <button 
                          onClick={() => setTargetModuleId("NEW")}
                          className={`px-4 h-14 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all flex flex-col items-center justify-center gap-1 ${targetModuleId === "NEW" ? 'bg-blue-600 border-blue-400 text-white shadow-xl' : 'bg-slate-950 border-blue-500/20 text-blue-500 hover:bg-blue-600/10'}`}
                        >
                          <PlusCircle size={14} />
                          <span>Add New Slot</span>
                        </button>
                        <div className="w-[1px] h-10 bg-white/5 mx-1 self-center"></div>
                        {selectedClient.workouts.map(w => (
                          <button 
                            key={w.id}
                            onClick={() => setTargetModuleId(w.id)}
                            className={`w-14 h-14 rounded-2xl border font-black brand-font text-xl transition-all flex items-center justify-center ${targetModuleId === w.id ? 'bg-emerald-500 border-emerald-400 text-white shadow-xl' : 'bg-slate-900 border-slate-800 text-slate-600 hover:text-white'}`}
                          >
                            {w.name}
                          </button>
                        ))}
                     </div>
                     <p className="text-[8px] font-medium text-slate-500 uppercase tracking-widest pl-1">
                       {targetModuleId === "NEW" ? "This will create a new training module (e.g., A, B, C...)" : (targetModuleId ? "Warning: This will overwrite exercises in this slot." : "Choose if you want to add or replace a module.")}
                     </p>
                  </div>
                )}
             </div>

             <div className="p-8 bg-slate-950 border-t border-white/5">
                <button 
                  disabled={!selectedClientId || !targetModuleId}
                  onClick={handleExecuteAssignment}
                  className="w-full py-5 bg-blue-600 disabled:opacity-20 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <Send size={18} /> {targetModuleId === "NEW" ? "CREATE & DISPATCH" : "OVERWRITE & DISPATCH"}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[#020617]/95 backdrop-blur-xl" onClick={() => setPreviewTemplate(null)}></div>
          <div className="relative w-full max-w-2xl glass-card rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
             <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                <div className="flex items-center gap-6">
                   <div className="w-14 h-14 rounded-2xl bg-blue-600/10 text-blue-500 flex items-center justify-center font-black brand-font text-2xl border border-blue-500/20">{previewTemplate.name}</div>
                   <div>
                      <h3 className="text-3xl font-black brand-font uppercase text-white tracking-tight leading-none">{previewTemplate.title}</h3>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-1"><User size={10}/> {previewTemplate.originalClientName}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-800"></span>
                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em]">{previewTemplate.exercises.length} Exercises</span>
                      </div>
                   </div>
                </div>
                <button onClick={() => setPreviewTemplate(null)} className="p-3 bg-white/5 text-slate-400 hover:text-white rounded-xl transition-all"><X size={24}/></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
                <div className="grid gap-4">
                   {previewTemplate.exercises.map((ex, idx) => (
                     ex.category === 'header' ? (
                        <div key={ex.id} className="pt-6 pb-2 border-b border-blue-500/20">
                          <div className="flex items-center gap-3 text-blue-400 mb-1">
                             <Type size={14} />
                             <span className="text-[10px] font-black uppercase tracking-widest">{ex.name || 'SECTION'}</span>
                          </div>
                          {ex.notes && <p className="text-[10px] text-slate-500 font-medium italic">{ex.notes}</p>}
                        </div>
                     ) : (
                       <div key={ex.id} className="p-5 bg-slate-900/50 border border-white/5 rounded-2xl flex flex-col gap-3 group/item">
                          <div className="flex justify-between items-start">
                             <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded ${ex.category === 'mobility' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>{ex.category || 'strength'}</span>
                                  <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">IDX: {idx + 1}</span>
                                </div>
                                <h5 className="text-lg font-black text-slate-200 uppercase brand-font">{ex.name}</h5>
                             </div>
                             <div className="text-right">
                                <p className="text-[10px] font-black text-white uppercase">{ex.sets} Sets x {ex.reps || ex.duration}</p>
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Rest: {ex.restTime || 'N/A'}</p>
                             </div>
                          </div>
                          {ex.notes && (
                            <div className="bg-slate-950/40 p-4 rounded-xl border-l-2 border-blue-500/30">
                               <div className="flex items-center gap-2 mb-1 text-slate-500">
                                  <Info size={10} />
                                  <span className="text-[8px] font-black uppercase tracking-widest">Coach Notes</span>
                               </div>
                               <p className="text-xs text-slate-400 font-medium italic leading-relaxed">"{ex.notes}"</p>
                            </div>
                          )}
                       </div>
                     )
                   ))}
                </div>
             </div>

             <div className="p-8 bg-slate-950 border-t border-white/5 flex flex-col gap-4">
                <button 
                  onClick={() => setPreviewTemplate(null)}
                  className="w-full py-4 bg-slate-900 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95"
                >
                  CLOSE PREVIEW
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterLibrary;