import VideoUploader from './VideoUploader/VideoUploader';
import React, { useState, useMemo } from 'react';
import { Library, Trash2, Edit3, Zap, X, Check, Eye, User, Info, UserPlus, PlusCircle, Type, Folder, FolderOpen, ChevronRight, ArrowLeft, Tag } from 'lucide-react';
import { useApp } from '../AppContext';
import { WorkoutTemplate, Workout } from '../types';

const generateUniqueId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const FOLDER_COLORS = [
  { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', icon: 'text-blue-500' },
  { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', icon: 'text-purple-500' },
  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: 'text-emerald-500' },
  { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', icon: 'text-amber-500' },
  { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', icon: 'text-rose-500' },
  { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', icon: 'text-cyan-500' },
];

const getFolderColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return FOLDER_COLORS[Math.abs(hash) % FOLDER_COLORS.length];
};

interface Props {
  onLoadIntoEditor: (clientId: string, templateWorkout: Workout, targetModuleId: 'NEW' | string) => void;
}

const MasterLibrary: React.FC<Props> = ({ onLoadIntoEditor }) => {
  const { savedWorkouts, setSavedWorkouts, clients, syncService } = useApp();

  // Navigation
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSubCategory, setActiveSubCategory] = useState<string | null>(null);

  // Template actions
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState('');
  const [tempCategory, setTempCategory] = useState('');
  const [tempSubCategory, setTempSubCategory] = useState('');

  // Modals
  const [previewTemplate, setPreviewTemplate] = useState<WorkoutTemplate | null>(null);
  const [assigningTemplate, setAssigningTemplate] = useState<WorkoutTemplate | null>(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [targetModuleId, setTargetModuleId] = useState('');

  const selectedClient = clients.find(c => c.id === selectedClientId);

  // ── Derived folder data ──────────────────────────────
  const categories = useMemo(() => {
    const cats = [...new Set(savedWorkouts.map(w => w.category?.trim() || 'Uncategorized'))];
    return cats.sort((a, b) => a === 'Uncategorized' ? 1 : b === 'Uncategorized' ? -1 : a.localeCompare(b));
  }, [savedWorkouts]);

  const subCategories = useMemo(() => {
    if (!activeCategory) return [];
    const subs = [...new Set(
      savedWorkouts
        .filter(w => (w.category?.trim() || 'Uncategorized') === activeCategory)
        .map(w => w.subCategory?.trim() || '')
        .filter(Boolean)
    )];
    return subs.sort();
  }, [savedWorkouts, activeCategory]);

  const visibleWorkouts = useMemo(() => {
    if (!activeCategory) return savedWorkouts;
    return savedWorkouts.filter(w => {
      if ((w.category?.trim() || 'Uncategorized') !== activeCategory) return false;
      if (activeSubCategory) return (w.subCategory?.trim() || '') === activeSubCategory;
      return true;
    });
  }, [savedWorkouts, activeCategory, activeSubCategory]);

  // ── Actions ──────────────────────────────────────────
  const executeDelete = async (id: string) => {
    setSavedWorkouts(prev => prev.filter(w => w.id !== id));
    setDeletingId(null);
    await syncService.deleteDocument('master_library', id);
  };

  const startEdit = (e: React.MouseEvent, template: WorkoutTemplate) => {
    e.stopPropagation();
    setEditingId(template.id);
    setTempTitle(template.title);
    setTempCategory(template.category || '');
    setTempSubCategory(template.subCategory || '');
  };

  const saveEdit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingId) return;
    const id = editingId;
    const updates = {
      title: tempTitle,
      category: tempCategory.trim() || undefined,
      subCategory: tempSubCategory.trim() || undefined,
    };
    setSavedWorkouts(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
    setEditingId(null);
    await syncService.updateDocument('master_library', id, updates);
  };

  const handleLoadIntoEditor = () => {
    if (!assigningTemplate || !selectedClientId || !targetModuleId) return;
    const freshWorkout: Workout = {
      id: generateUniqueId('w'),
      name: assigningTemplate.name,
      title: assigningTemplate.title,
      exercises: assigningTemplate.exercises.map(ex => ({ ...ex, id: generateUniqueId('ex') })),
    };
    onLoadIntoEditor(selectedClientId, freshWorkout, targetModuleId);
    setAssigningTemplate(null);
    setSelectedClientId('');
    setTargetModuleId('');
  };

  const navigateBack = () => {
    if (activeSubCategory) { setActiveSubCategory(null); return; }
    if (activeCategory) { setActiveCategory(null); return; }
  };

  // ── Render ────────────────────────────────────────────
  return (
    <div className="space-y-12 animate-in fade-in duration-700">

      {/* Header */}
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

      <VideoUploader clientId="master" />

      {/* Breadcrumb */}
      {activeCategory && (
        <div className="flex items-center gap-2">
          <button onClick={navigateBack} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">
            <ArrowLeft size={14} /> Back
          </button>
          <span className="text-slate-700">/</span>
          <button onClick={() => { setActiveCategory(null); setActiveSubCategory(null); }} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Library</button>
          <ChevronRight size={12} className="text-slate-700" />
          <button onClick={() => setActiveSubCategory(null)} className={`text-[10px] font-black uppercase tracking-widest transition-colors ${activeSubCategory ? 'text-slate-500 hover:text-white' : 'text-white'}`}>
            {activeCategory}
          </button>
          {activeSubCategory && (
            <>
              <ChevronRight size={12} className="text-slate-700" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">{activeSubCategory}</span>
            </>
          )}
        </div>
      )}

      {savedWorkouts.length === 0 ? (
        <div className="py-32 text-center border-2 border-dashed border-slate-900 rounded-[4rem] bg-slate-950/20">
          <Library className="mx-auto text-slate-800 mb-6" size={64} />
          <h4 className="text-xl font-black text-slate-700 uppercase brand-font">Library Empty</h4>
          <p className="text-slate-800 font-bold uppercase text-[9px] tracking-widest mt-2">Save workouts from a client's training plan to start building your library.</p>
        </div>
      ) : !activeCategory ? (
        // ── FOLDER VIEW ──────────────────────────────────
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map(cat => {
              const count = savedWorkouts.filter(w => (w.category?.trim() || 'Uncategorized') === cat).length;
              const color = getFolderColor(cat);
              const subs = [...new Set(
                savedWorkouts
                  .filter(w => (w.category?.trim() || 'Uncategorized') === cat)
                  .map(w => w.subCategory?.trim() || '')
                  .filter(Boolean)
              )];
              return (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); setActiveSubCategory(null); }}
                  className={`glass-card p-6 rounded-[2rem] border ${color.border} ${color.bg} hover:scale-[1.02] transition-all duration-200 text-left group`}
                >
                  <div className={`mb-4 ${color.icon}`}>
                    <FolderOpen size={32} />
                  </div>
                  <h4 className={`text-sm font-black uppercase brand-font tracking-tight leading-none mb-2 ${color.text}`}>{cat}</h4>
                  <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{count} workout{count !== 1 ? 's' : ''}</p>
                  {subs.length > 0 && (
                    <p className="text-[7px] font-medium text-slate-700 mt-1 truncate">{subs.slice(0, 2).join(' · ')}{subs.length > 2 ? ` +${subs.length - 2}` : ''}</p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Also show all workouts flat below folders */}
          <div className="pt-6 border-t border-white/5">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 mb-6">All Workouts</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {savedWorkouts.map(template => renderCard(template))}
            </div>
          </div>
        </div>
      ) : (
        // ── INSIDE A FOLDER ──────────────────────────────
        <div className="space-y-8">
          {/* Subfolder tiles (only if there are subfolders and no active subfolder) */}
          {!activeSubCategory && subCategories.length > 0 && (
            <div className="space-y-4">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600">Subfolders</p>
              <div className="flex flex-wrap gap-3">
                {subCategories.map(sub => {
                  const count = savedWorkouts.filter(w =>
                    (w.category?.trim() || 'Uncategorized') === activeCategory &&
                    (w.subCategory?.trim() || '') === sub
                  ).length;
                  const color = getFolderColor(sub);
                  return (
                    <button
                      key={sub}
                      onClick={() => setActiveSubCategory(sub)}
                      className={`flex items-center gap-3 px-5 py-3 rounded-2xl border ${color.border} ${color.bg} hover:scale-[1.02] transition-all`}
                    >
                      <Folder size={14} className={color.icon} />
                      <span className={`text-xs font-black uppercase tracking-widest ${color.text}`}>{sub}</span>
                      <span className="text-[8px] font-black text-slate-600 uppercase">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Workout cards */}
          <div className="space-y-4">
            {!activeSubCategory && subCategories.length > 0 && (
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600">
                {activeSubCategory ? activeSubCategory : `All in ${activeCategory}`}
              </p>
            )}
            {visibleWorkouts.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-slate-900 rounded-[3rem]">
                <Folder className="mx-auto text-slate-800 mb-4" size={40} />
                <p className="text-slate-700 font-black uppercase text-[9px] tracking-widest">No workouts in this folder yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {visibleWorkouts.map(template => renderCard(template))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── USE TEMPLATE MODAL ── */}
      {assigningTemplate && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[#020617]/95 backdrop-blur-xl" onClick={() => setAssigningTemplate(null)} />
          <div className="relative w-full max-w-xl glass-card rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-blue-600/5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg"><UserPlus size={24} /></div>
                <div>
                  <h3 className="text-2xl font-black brand-font uppercase text-white tracking-tight leading-none">Use Template</h3>
                  <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-1">Loads into editor — tweak before saving</p>
                </div>
              </div>
              <button onClick={() => setAssigningTemplate(null)} className="p-3 bg-white/5 text-slate-400 hover:text-white rounded-xl transition-all"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">1. Which client?</label>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto no-scrollbar">
                  {clients.map(c => (
                    <button key={c.id} onClick={() => { setSelectedClientId(c.id); setTargetModuleId(''); }}
                      className={`p-4 rounded-2xl border transition-all flex items-center gap-4 ${selectedClientId === c.id ? 'bg-blue-600 border-blue-400 text-white shadow-xl' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'}`}>
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-800 shrink-0">
                        {c.avatar ? <img src={c.avatar} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-black">IS</div>}
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest">{c.name}</span>
                      {selectedClientId === c.id && <Check size={14} className="ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>
              {selectedClient && (
                <div className="space-y-3 animate-in slide-in-from-top-4 duration-300">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">2. Add as new module or replace existing?</label>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => setTargetModuleId('NEW')}
                      className={`px-4 h-14 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all flex flex-col items-center justify-center gap-1 ${targetModuleId === 'NEW' ? 'bg-blue-600 border-blue-400 text-white shadow-xl' : 'bg-slate-950 border-blue-500/20 text-blue-500 hover:bg-blue-600/10'}`}>
                      <PlusCircle size={14} /><span>New Slot</span>
                    </button>
                    <div className="w-px h-10 bg-white/5 mx-1 self-center" />
                    {selectedClient.workouts.map(w => (
                      <button key={w.id} onClick={() => setTargetModuleId(w.id)}
                        className={`w-14 h-14 rounded-2xl border font-black brand-font text-xl transition-all flex items-center justify-center ${targetModuleId === w.id ? 'bg-amber-500 border-amber-400 text-white shadow-xl' : 'bg-slate-900 border-slate-800 text-slate-600 hover:text-white'}`}
                        title={`Replace module ${w.name}`}>{w.name}</button>
                    ))}
                  </div>
                  <p className="text-[8px] font-medium text-slate-500 uppercase tracking-widest pl-1">
                    {targetModuleId === 'NEW' ? 'A new workout module will be created — you can rename and edit it before saving.'
                      : targetModuleId ? 'Existing module will be replaced in the editor — nothing saves until you hit Save.'
                      : 'Choose a slot above.'}
                  </p>
                </div>
              )}
            </div>
            <div className="p-8 bg-slate-950 border-t border-white/5">
              <button disabled={!selectedClientId || !targetModuleId} onClick={handleLoadIntoEditor}
                className="w-full py-5 bg-blue-600 disabled:opacity-20 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3">
                Open in Editor →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PREVIEW MODAL ── */}
      {previewTemplate && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[#020617]/95 backdrop-blur-xl" onClick={() => setPreviewTemplate(null)} />
          <div className="relative w-full max-w-2xl glass-card rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-blue-600/10 text-blue-500 flex items-center justify-center font-black brand-font text-2xl border border-blue-500/20">{previewTemplate.name}</div>
                <div>
                  <h3 className="text-3xl font-black brand-font uppercase text-white tracking-tight leading-none">{previewTemplate.title}</h3>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-1"><User size={10} /> {previewTemplate.originalClientName}</span>
                    {previewTemplate.category && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-slate-800" />
                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-1">
                          <Tag size={9} /> {previewTemplate.category}{previewTemplate.subCategory ? ` / ${previewTemplate.subCategory}` : ''}
                        </span>
                      </>
                    )}
                    <span className="w-1 h-1 rounded-full bg-slate-800" />
                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em]">{previewTemplate.exercises.length} Exercises</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setPreviewTemplate(null)} className="p-3 bg-white/5 text-slate-400 hover:text-white rounded-xl transition-all"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
              {previewTemplate.exercises.map((ex) =>
                ex.category === 'header' ? (
                  <div key={ex.id} className="pt-6 pb-2 border-b border-blue-500/20">
                    <div className="flex items-center gap-3 text-blue-400 mb-1"><Type size={14} /><span className="text-[10px] font-black uppercase tracking-widest">{ex.name || 'SECTION'}</span></div>
                    {ex.notes && <p className="text-[10px] text-slate-500 font-medium italic">{ex.notes}</p>}
                  </div>
                ) : (
                  <div key={ex.id} className="p-5 bg-slate-900/50 border border-white/5 rounded-2xl flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1"><span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded ${ex.category === 'mobility' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>{ex.category || 'strength'}</span></div>
                        <h5 className="text-lg font-black text-slate-200 uppercase brand-font">{ex.name}</h5>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-white uppercase">{ex.sets} Sets × {ex.reps || ex.duration}</p>
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Rest: {ex.restTime || 'N/A'}</p>
                      </div>
                    </div>
                    {ex.notes && (
                      <div className="bg-slate-950/40 p-4 rounded-xl border-l-2 border-blue-500/30">
                        <div className="flex items-center gap-2 mb-1 text-slate-500"><Info size={10} /><span className="text-[8px] font-black uppercase tracking-widest">Coach Notes</span></div>
                        <p className="text-xs text-slate-400 font-medium italic leading-relaxed">"{ex.notes}"</p>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
            <div className="p-8 bg-slate-950 border-t border-white/5">
              <button onClick={() => setPreviewTemplate(null)} className="w-full py-4 bg-slate-900 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95">Close Preview</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Template card renderer ─────────────────────────────
  function renderCard(template: WorkoutTemplate) {
    const color = getFolderColor(template.category || 'Uncategorized');
    return (
      <div key={template.id} className="glass-card p-6 rounded-[2rem] border-slate-800 hover:border-blue-500/30 transition-all duration-300 group relative overflow-hidden flex flex-col text-left">

        {deletingId === template.id && (
          <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
            <p className="text-white font-black brand-font uppercase text-xs mb-6 tracking-widest text-center">Delete Template?</p>
            <div className="flex gap-3 w-full">
              <button onClick={() => setDeletingId(null)} className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-700 transition-all">Cancel</button>
              <button onClick={() => executeDelete(template.id)} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-500 transition-all">Delete</button>
            </div>
          </div>
        )}

        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 font-black brand-font text-lg">
            {template.name}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button type="button" onClick={(e) => startEdit(e, template)} className="p-2 text-slate-600 hover:text-blue-400 transition-colors"><Edit3 size={14} /></button>
            <button type="button" onClick={(e) => { e.stopPropagation(); setDeletingId(template.id); }} className="p-2 text-slate-600 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
          </div>
        </div>

        {editingId === template.id ? (
          <div className="space-y-2 mb-3">
            <input
              value={tempTitle}
              onChange={e => setTempTitle(e.target.value)}
              placeholder="Workout name"
              className="w-full bg-slate-950 border border-blue-500 p-2 rounded-lg text-[10px] font-black uppercase text-white outline-none"
              autoFocus
            />
            <input
              value={tempCategory}
              onChange={e => setTempCategory(e.target.value)}
              placeholder="Folder  (e.g. Beginner)"
              className="w-full bg-slate-950 border border-slate-700 p-2 rounded-lg text-[10px] font-medium text-slate-300 outline-none focus:border-blue-500/60"
            />
            <input
              value={tempSubCategory}
              onChange={e => setTempSubCategory(e.target.value)}
              placeholder="Subfolder  (e.g. Endurance)"
              className="w-full bg-slate-950 border border-slate-700 p-2 rounded-lg text-[10px] font-medium text-slate-300 outline-none focus:border-blue-500/60"
            />
            <button type="button" onClick={saveEdit} className="w-full py-2 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
              <Check size={12} /> Save
            </button>
          </div>
        ) : (
          <>
            <h4 className="text-lg font-black text-white uppercase brand-font tracking-tight leading-none mb-1">{template.title || 'UNTITLED'}</h4>
            {(template.category || template.subCategory) && (
              <div className={`flex items-center gap-1.5 mb-1 ${color.text}`}>
                <Tag size={9} />
                <span className="text-[8px] font-black uppercase tracking-widest">
                  {template.category}{template.subCategory ? ` / ${template.subCategory}` : ''}
                </span>
              </div>
            )}
          </>
        )}

        <div className="flex flex-col gap-1 mb-6 mt-1">
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
          <button onClick={() => setPreviewTemplate(template)}
            className="py-3 bg-slate-900 border border-slate-800 rounded-xl text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all flex items-center justify-center gap-2">
            <Eye size={12} /> Preview
          </button>
          <button onClick={() => { setAssigningTemplate(template); setSelectedClientId(''); setTargetModuleId(''); }}
            className="py-3 bg-blue-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20">
            <UserPlus size={12} /> Use
          </button>
        </div>
      </div>
    );
  }
};

export default MasterLibrary;
