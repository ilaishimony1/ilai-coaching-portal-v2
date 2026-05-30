import VideoUploader from './VideoUploader/VideoUploader';
import React, { useState, useMemo } from 'react';
import { Library, Trash2, Edit3, Zap, X, Check, Eye, User, Info, UserPlus, PlusCircle, Type, Folder, FolderOpen, ChevronRight, ArrowLeft, Tag, FolderPlus, Move } from 'lucide-react';
import { useApp } from '../AppContext';
import { WorkoutTemplate, Workout } from '../types';

const generateUniqueId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const FOLDER_COLORS = [
  { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', icon: 'text-blue-500', active: 'bg-blue-600 border-blue-400' },
  { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', icon: 'text-purple-500', active: 'bg-purple-600 border-purple-400' },
  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: 'text-emerald-500', active: 'bg-emerald-600 border-emerald-400' },
  { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', icon: 'text-amber-500', active: 'bg-amber-600 border-amber-400' },
  { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', icon: 'text-rose-500', active: 'bg-rose-600 border-rose-400' },
  { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', icon: 'text-cyan-500', active: 'bg-cyan-600 border-cyan-400' },
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

  // Folder management
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState('');

  // Move to folder
  const [movingTemplateId, setMovingTemplateId] = useState<string | null>(null);
  const [moveCategory, setMoveCategory] = useState('');
  const [moveSubCategory, setMoveSubCategory] = useState('');
  const [moveCategoryInput, setMoveCategoryInput] = useState('');
  const [moveSubCategoryInput, setMoveSubCategoryInput] = useState('');

  // Template actions
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState('');

  // Modals
  const [previewTemplate, setPreviewTemplate] = useState<WorkoutTemplate | null>(null);
  const [assigningTemplate, setAssigningTemplate] = useState<WorkoutTemplate | null>(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [targetModuleId, setTargetModuleId] = useState('');

  const selectedClient = clients.find(c => c.id === selectedClientId);

  // ── Derived data ─────────────────────────────────────
  const categories = useMemo(() => {
    const cats = [...new Set(savedWorkouts.map(w => w.category?.trim()).filter(Boolean))] as string[];
    return cats.sort((a, b) => a.localeCompare(b));
  }, [savedWorkouts]);

  const subCategories = useMemo(() => {
    if (!activeCategory) return [];
    const subs = [...new Set(
      savedWorkouts
        .filter(w => w.category?.trim() === activeCategory)
        .map(w => w.subCategory?.trim() || '')
        .filter(Boolean)
    )];
    return subs.sort();
  }, [savedWorkouts, activeCategory]);

  const visibleWorkouts = useMemo(() => {
    if (!activeCategory) return savedWorkouts;
    return savedWorkouts.filter(w => {
      if (w.category?.trim() !== activeCategory) return false;
      if (activeSubCategory) return (w.subCategory?.trim() || '') === activeSubCategory;
      return true;
    });
  }, [savedWorkouts, activeCategory, activeSubCategory]);

  const unfiledWorkouts = useMemo(() =>
    savedWorkouts.filter(w => !w.category?.trim()),
    [savedWorkouts]
  );

  // ── Actions ──────────────────────────────────────────
  const executeDelete = async (id: string) => {
    setSavedWorkouts(prev => prev.filter(w => w.id !== id));
    setDeletingId(null);
    await syncService.deleteDocument('master_library', id);
  };

  const saveRenameTitle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingId) return;
    const id = editingId;
    setSavedWorkouts(prev => prev.map(w => w.id === id ? { ...w, title: tempTitle } : w));
    setEditingId(null);
    await syncService.updateDocument('master_library', id, { title: tempTitle });
  };

  const saveRenameFolder = async () => {
    if (!renamingFolder || !renameFolderValue.trim()) return;
    const oldName = renamingFolder;
    const newName = renameFolderValue.trim();
    // Update all workouts in that folder
    const affected = savedWorkouts.filter(w => w.category?.trim() === oldName);
    setSavedWorkouts(prev => prev.map(w =>
      w.category?.trim() === oldName ? { ...w, category: newName } : w
    ));
    setRenamingFolder(null);
    if (activeCategory === oldName) setActiveCategory(newName);
    await Promise.all(affected.map(w =>
      syncService.updateDocument('master_library', w.id, { category: newName })
    ));
  };

  const confirmMoveToFolder = async () => {
    if (!movingTemplateId) return;
    const cat = (moveCategoryInput.trim() || moveCategory).trim();
    const sub = (moveSubCategoryInput.trim() || moveSubCategory).trim();
    setSavedWorkouts(prev => prev.map(w =>
      w.id === movingTemplateId ? { ...w, category: cat || undefined, subCategory: sub || undefined } : w
    ));
    await syncService.updateDocument('master_library', movingTemplateId, {
      category: cat || null,
      subCategory: sub || null,
    });
    setMovingTemplateId(null);
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

  // ── Move-to-folder modal ──────────────────────────────
  const openMoveModal = (template: WorkoutTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setMovingTemplateId(template.id);
    setMoveCategory(template.category || '');
    setMoveSubCategory(template.subCategory || '');
    setMoveCategoryInput('');
    setMoveSubCategoryInput('');
  };

  // ── Template card ─────────────────────────────────────
  const renderCard = (template: WorkoutTemplate) => {
    const color = getFolderColor(template.category || '_');
    return (
      <div key={template.id} className="glass-card p-6 rounded-[2rem] border-slate-800 hover:border-blue-500/20 transition-all duration-300 relative overflow-hidden flex flex-col text-left">

        {/* Delete confirm overlay */}
        {deletingId === template.id && (
          <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
            <p className="text-white font-black brand-font uppercase text-xs mb-6 tracking-widest text-center">Delete Template?</p>
            <div className="flex gap-3 w-full">
              <button onClick={() => setDeletingId(null)} className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-700 transition-all">Cancel</button>
              <button onClick={() => executeDelete(template.id)} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-500 transition-all">Delete</button>
            </div>
          </div>
        )}

        {/* Top row */}
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 font-black brand-font text-lg">
            {template.name}
          </div>
          <div className="flex gap-1">
            <button type="button" onClick={(e) => { e.stopPropagation(); setEditingId(template.id); setTempTitle(template.title); }} className="p-2 text-slate-700 hover:text-blue-400 transition-colors"><Edit3 size={13} /></button>
            <button type="button" onClick={(e) => { e.stopPropagation(); setDeletingId(template.id); }} className="p-2 text-slate-700 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
          </div>
        </div>

        {/* Title / edit */}
        {editingId === template.id ? (
          <div className="flex gap-2 mb-3">
            <input value={tempTitle} onChange={e => setTempTitle(e.target.value)}
              className="flex-1 bg-slate-950 border border-blue-500 p-2 rounded-lg text-[10px] font-black uppercase text-white outline-none" autoFocus />
            <button type="button" onClick={saveRenameTitle} className="p-2 bg-blue-600 text-white rounded-lg"><Check size={14} /></button>
          </div>
        ) : (
          <h4 className="text-lg font-black text-white uppercase brand-font tracking-tight leading-none mb-2">{template.title || 'UNTITLED'}</h4>
        )}

        {/* Folder tag */}
        <div className="mb-4">
          <button
            type="button"
            onClick={(e) => openMoveModal(template, e)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all hover:opacity-80 ${
              template.category
                ? `${color.bg} ${color.border} ${color.text}`
                : 'bg-slate-800/50 border-slate-700 text-slate-600 hover:text-slate-400'
            }`}
          >
            <Folder size={9} />
            {template.category
              ? `${template.category}${template.subCategory ? ` / ${template.subCategory}` : ''}`
              : '+ Add to folder'}
          </button>
        </div>

        {/* Meta */}
        <div className="flex flex-col gap-1 mb-5">
          <div className="flex items-center gap-2 text-slate-500">
            <User size={10} className="shrink-0" />
            <span className="text-[8px] font-black uppercase tracking-widest truncate">{template.originalClientName || 'MASTER SECTOR'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Zap size={10} className="shrink-0" />
            <span className="text-[8px] font-black uppercase tracking-widest">{template.exercises.length} Movements</span>
          </div>
        </div>

        {/* Actions */}
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
  };

  // ── Main render ───────────────────────────────────────
  return (
    <div className="space-y-10 animate-in fade-in duration-700">

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
          <span className="text-xs font-black uppercase text-white">{savedWorkouts.length} Templates</span>
        </div>
      </header>

      <VideoUploader clientId="master" />

      {savedWorkouts.length === 0 ? (
        <div className="py-32 text-center border-2 border-dashed border-slate-900 rounded-[4rem] bg-slate-950/20">
          <Library className="mx-auto text-slate-800 mb-6" size={64} />
          <h4 className="text-xl font-black text-slate-700 uppercase brand-font">Library Empty</h4>
          <p className="text-slate-800 font-bold uppercase text-[9px] tracking-widest mt-2">Save workouts from a client's training plan to start building your library.</p>
        </div>
      ) : (
        <>
          {/* ── FOLDERS SECTION ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-500">Folders</p>
              {!creatingFolder && (
                <button
                  type="button"
                  onClick={() => { setCreatingFolder(true); setNewFolderName(''); }}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 hover:border-blue-500/40 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                >
                  <FolderPlus size={13} /> New Folder
                </button>
              )}
            </div>

            {/* Create folder input */}
            {creatingFolder && (
              <div className="flex gap-2 animate-in slide-in-from-top-2 duration-200">
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newFolderName.trim()) { setActiveCategory(newFolderName.trim()); setCreatingFolder(false); }
                    if (e.key === 'Escape') setCreatingFolder(false);
                  }}
                  placeholder="Folder name, e.g. Beginner"
                  className="flex-1 bg-slate-950 border border-blue-500/60 rounded-xl px-4 py-3 text-sm text-white font-medium placeholder-slate-600 outline-none"
                />
                <button
                  type="button"
                  onClick={() => { if (newFolderName.trim()) { setActiveCategory(newFolderName.trim()); } setCreatingFolder(false); }}
                  className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all"
                >
                  Create
                </button>
                <button type="button" onClick={() => setCreatingFolder(false)} className="p-3 text-slate-500 hover:text-white transition-colors"><X size={16} /></button>
              </div>
            )}

            {/* Folder tiles */}
            {categories.length === 0 && !creatingFolder ? (
              <p className="text-[9px] text-slate-700 font-medium uppercase tracking-widest py-4">No folders yet — create one above or add a workout to a folder using the folder tag on each card.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {categories.map(cat => {
                  const count = savedWorkouts.filter(w => w.category?.trim() === cat).length;
                  const color = getFolderColor(cat);
                  const isActive = activeCategory === cat;
                  return (
                    <div key={cat} className="relative group/folder">
                      {renamingFolder === cat ? (
                        <div className="flex gap-2 items-center">
                          <input
                            autoFocus
                            value={renameFolderValue}
                            onChange={e => setRenameFolderValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveRenameFolder(); if (e.key === 'Escape') setRenamingFolder(null); }}
                            className="w-40 bg-slate-950 border border-blue-500/60 rounded-xl px-3 py-2 text-xs text-white font-black uppercase outline-none"
                          />
                          <button type="button" onClick={saveRenameFolder} className="p-2 bg-blue-600 text-white rounded-lg"><Check size={12} /></button>
                          <button type="button" onClick={() => setRenamingFolder(null)} className="p-2 text-slate-500 hover:text-white"><X size={12} /></button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setActiveCategory(isActive ? null : cat); setActiveSubCategory(null); }}
                          className={`flex items-center gap-2.5 pl-4 pr-3 py-3 rounded-2xl border font-black text-[9px] uppercase tracking-widest transition-all ${
                            isActive ? `${color.active} text-white shadow-lg` : `${color.bg} ${color.border} ${color.text} hover:opacity-90`
                          }`}
                        >
                          <FolderOpen size={14} />
                          <span>{cat}</span>
                          <span className={`text-[8px] ${isActive ? 'text-white/70' : 'text-slate-600'}`}>{count}</span>
                          {/* Rename button */}
                          <span
                            role="button"
                            onClick={e => { e.stopPropagation(); setRenamingFolder(cat); setRenameFolderValue(cat); }}
                            className="ml-1 opacity-0 group-hover/folder:opacity-100 p-1 rounded hover:bg-white/10 transition-all"
                          >
                            <Edit3 size={10} />
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── WORKOUT CARDS ── */}
          {activeCategory ? (
            // Inside a folder
            <div className="space-y-6">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2">
                <button onClick={() => { setActiveCategory(null); setActiveSubCategory(null); }} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">
                  <ArrowLeft size={12} /> All
                </button>
                <ChevronRight size={10} className="text-slate-700" />
                <span className="text-[9px] font-black uppercase tracking-widest text-white">{activeCategory}</span>
                {subCategories.length > 0 && (
                  <div className="flex gap-2 ml-4">
                    <button onClick={() => setActiveSubCategory(null)}
                      className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${!activeSubCategory ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-white'}`}>
                      All
                    </button>
                    {subCategories.map(sub => (
                      <button key={sub} onClick={() => setActiveSubCategory(activeSubCategory === sub ? null : sub)}
                        className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${activeSubCategory === sub ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-white'}`}>
                        {sub}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {visibleWorkouts.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-slate-900 rounded-[3rem]">
                  <Folder className="mx-auto text-slate-800 mb-4" size={40} />
                  <p className="text-slate-700 font-black uppercase text-[9px] tracking-widest">This folder is empty</p>
                  <p className="text-slate-800 text-[8px] mt-1">Use the folder tag on any workout card to move it here</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {visibleWorkouts.map(t => renderCard(t))}
                </div>
              )}
            </div>
          ) : (
            // All workouts flat view
            <div className="space-y-8">
              {unfiledWorkouts.length > 0 && (
                <div className="space-y-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-600">Unfiled</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {unfiledWorkouts.map(t => renderCard(t))}
                  </div>
                </div>
              )}
              {categories.map(cat => (
                <div key={cat} className="space-y-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-500 flex items-center gap-2">
                    <Folder size={11} className={getFolderColor(cat).icon} /> {cat}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {savedWorkouts.filter(w => w.category?.trim() === cat).map(t => renderCard(t))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── MOVE TO FOLDER MODAL ── */}
      {movingTemplateId && (() => {
        const template = savedWorkouts.find(w => w.id === movingTemplateId);
        if (!template) return null;
        const activeCat = moveCategoryInput.trim() || moveCategory;
        const activeSub = moveSubCategoryInput.trim() || moveSubCategory;
        const existingSubs = activeCat
          ? [...new Set(savedWorkouts.filter(w => w.category?.trim() === activeCat).map(w => w.subCategory?.trim()).filter(Boolean))] as string[]
          : [];
        return (
          <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setMovingTemplateId(null)} />
            <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mb-1">Move to Folder</p>
                  <h3 className="text-base font-black uppercase brand-font text-white leading-none">{template.title}</h3>
                </div>
                <button onClick={() => setMovingTemplateId(null)} className="p-2 text-slate-500 hover:text-white"><X size={18} /></button>
              </div>

              <div className="p-6 space-y-5">
                {/* Folder picker */}
                <div className="space-y-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Folder</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => { setMoveCategory(''); setMoveCategoryInput(''); setMoveSubCategory(''); setMoveSubCategoryInput(''); }}
                      className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${!moveCategory && !moveCategoryInput ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-white'}`}>
                      None
                    </button>
                    {categories.map(cat => (
                      <button key={cat} type="button"
                        onClick={() => { setMoveCategory(cat); setMoveCategoryInput(''); setMoveSubCategory(''); setMoveSubCategoryInput(''); }}
                        className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${moveCategory === cat && !moveCategoryInput ? `${getFolderColor(cat).active} text-white` : `${getFolderColor(cat).bg} ${getFolderColor(cat).border} ${getFolderColor(cat).text}`}`}>
                        {cat}
                      </button>
                    ))}
                  </div>
                  <input
                    value={moveCategoryInput}
                    onChange={e => { setMoveCategoryInput(e.target.value); setMoveCategory(''); setMoveSubCategory(''); setMoveSubCategoryInput(''); }}
                    placeholder="Or type a new folder name…"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500/60 transition-all"
                  />
                </div>

                {/* Subfolder picker */}
                {activeCat && (
                  <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Subfolder <span className="text-slate-700 normal-case font-normal">(optional)</span></p>
                    {existingSubs.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {existingSubs.map(sub => (
                          <button key={sub} type="button"
                            onClick={() => { setMoveSubCategory(sub); setMoveSubCategoryInput(''); }}
                            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${moveSubCategory === sub && !moveSubCategoryInput ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}>
                            {sub}
                          </button>
                        ))}
                      </div>
                    )}
                    <input
                      value={moveSubCategoryInput}
                      onChange={e => { setMoveSubCategoryInput(e.target.value); setMoveSubCategory(''); }}
                      placeholder={existingSubs.length > 0 ? 'Or type a new subfolder…' : 'Type a subfolder name… (optional)'}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-purple-500/60 transition-all"
                    />
                  </div>
                )}

                {activeCat && (
                  <div className="px-4 py-3 bg-slate-800/50 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-400">
                    📁 {activeCat}{activeSub ? ` › ${activeSub}` : ''}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-white/5 flex gap-3">
                <button type="button" onClick={() => setMovingTemplateId(null)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all">
                  Cancel
                </button>
                <button type="button" onClick={confirmMoveToFolder}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all">
                  {activeCat ? `Move to ${activeCat}` : 'Remove from folder'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
                        className={`w-14 h-14 rounded-2xl border font-black brand-font text-xl transition-all flex items-center justify-center ${targetModuleId === w.id ? 'bg-amber-500 border-amber-400 text-white shadow-xl' : 'bg-slate-900 border-slate-800 text-slate-600 hover:text-white'}`}>
                        {w.name}
                      </button>
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
};

export default MasterLibrary;
