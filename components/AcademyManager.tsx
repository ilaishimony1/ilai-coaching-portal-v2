import React, { useState, useEffect, useRef } from 'react';
import { Upload, X, Video, Search, Plus, Info, Zap, ChevronRight, Folder, ArrowLeft, Edit3, Image as ImageIcon, Play, Pause, GripVertical, Layers, Check, Users, UserCheck, Smartphone, Link2Off } from 'lucide-react';
import { db, VideoFile } from '../db';
import { ClientData } from '../types';
import { uploadVideoToFirebase } from "../firebaseService";
import { ExplanationVideo } from "../firebase/explanationVideos";
import { getStorage, ref, listAll, getDownloadURL } from "firebase/storage";

import {
  uploadExplanationVideo,
  uploadExplanationThumbnail,
  getExplanationVideos,
  assignExplanationToClient,
  unassignExplanationFromClient,
  getAssignedExplanationUids,
} from "../firebase/explanationVideos";




interface Props {
  accentColor: string;
  clients: ClientData[];
  onToggleAssignment: (clientId: string, videoUid: string) => void;
  onUnsyncAll: (clientId: string) => void;
}

const SUB_CATEGORIES = [
  "Flexibility & Mobility",
  "HS Foundations",
  "HS Balance & Control",
  "Advanced HS Skills",
  "Mentality"
];

const AcademyManager: React.FC<Props> = ({ accentColor, clients, onToggleAssignment, onUnsyncAll }) => {
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [explanationVideos, setExplanationVideos] = useState<ExplanationVideo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState<{cat: 'explanation' | 'skill', sub: string} | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [isRearrangeMode, setIsRearrangeMode] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
const [assignedExplanationUids, setAssignedExplanationUids] = useState<string[]>([]);



const loadVideos = async () => {
  // Load all skill videos from your Dexie DB (not hardcoded)
  const allVideos = await db.videos.toArray();
  setVideos(allVideos);
};



const loadExplanationVideos = async () => {
 const vids = await getExplanationVideos();

const safeVids = vids.map(v => ({
  ...v,
  name: v.name ?? "UNTITLED",
  subCategory: v.subCategory ?? "General",
  uid: v.uid ?? v.id,
}));

setExplanationVideos(safeVids);
};

// Load galleries once
useEffect(() => {
  loadVideos();
  loadExplanationVideos();
}, []);

// Load assigned explanations when client changes
useEffect(() => {
  if (!selectedClientId) {
    setAssignedExplanationUids([]);
    return;
  }

  getAssignedExplanationUids(selectedClientId).then(setAssignedExplanationUids);
}, [selectedClientId]);

/* =========================
   NORMALIZE EXPLANATION VIDEOS (Firestore → VideoFile)
========================= */
const mappedExplanationVideos: VideoFile[] = explanationVideos.map((v) => ({
  id: undefined,               // Firestore-only
  uid: v.uid,                   // 🔥 REQUIRED for assignment
  name: v.name,
  url: v.downloadURL,
  thumbnail: v.thumbnailURL ?? "",
  category: "explanation",
  subCategory: v.subCategory,
  uploadDate: v.createdAt,
  order: 0,
}));

/* =========================
   FILTERED GALLERIES
========================= */
const skillVideos = videos.filter(
  (v) =>
    v.category === "skill" &&
    (activeFolder?.sub ? v.subCategory === activeFolder.sub : true) &&
    (v.name ?? "").toLowerCase().includes(search.toLowerCase())
);


const explanationGalleryVideos = mappedExplanationVideos.filter(
  (v) =>
    v.subCategory === activeFolder?.sub &&
    (v.name ?? "").toLowerCase().includes(search.toLowerCase())

);

/* =========================
   FINAL VISIBLE VIDEOS (Coach vs Client)
========================= */
const selectedClient = clients.find(c => c.id === selectedClientId);

/* =========================
   FINAL VISIBLE VIDEOS (Show all for now)
========================= */
const visibleVideos =
  activeFolder?.cat === "skill"
    ? skillVideos
    : explanationGalleryVideos;

const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  if (!activeFolder) return;

  const file = e.target.files?.[0];
  if (!file) return;

  setIsUploading(true);

  try {

if (activeFolder.cat === "explanation") {
  // Use selected thumbnail if exists, otherwise use a default
  if (!thumbnailFile) {
  alert("Please select a thumbnail image first.");
setIsUploading(false);
if (e?.target) {
  e.target.value = "";
}

  return;
}

const finalThumbnail = thumbnailFile;


  await uploadExplanationVideo(
    file,                 // VIDEO
    finalThumbnail,       // IMAGE
    file.name.split(".")[0].toUpperCase(),
    activeFolder.sub
  );

  setThumbnailFile(null);
  await loadExplanationVideos();
} else {
  /* =========================
     SKILLS - UNCHANGED
  ========================== */
  const folderVideos = videos.filter(
    v => v.category === activeFolder.cat && v.subCategory === activeFolder.sub
  );

  const maxOrder =
    folderVideos.length > 0
      ? Math.max(...folderVideos.map(v => v.order))
      : 0;

  const videoId = `v-${Date.now()}`;

  const videoUrl = await uploadVideoToFirebase(file, videoId);

  const newVideo: VideoFile = {
    uid: videoId,
    name: file.name.split('.')[0].toUpperCase(),
    url: videoUrl,
    category: activeFolder.cat,
    subCategory: activeFolder.sub,
    uploadDate: new Date(),
    order: maxOrder + 1
  };

  await db.videos.add(newVideo);
  await loadVideos();
}


  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    alert("Upload failed");
  } finally {
    setIsUploading(false);
  }
};


   

  const deleteVideo = async (id?: number) => {
    if (id !== undefined) {
      await db.videos.delete(id);
      await loadVideos();
    }
  };

  const updateVideo = async (id: number, updates: Partial<VideoFile>) => {
    await db.videos.update(id, updates);
    await loadVideos();
  };

  const onDragStart = (id: number) => {
    if (!isRearrangeMode) return;
    setDraggedId(id);
  };

  const onDragOver = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (!isRearrangeMode || draggedId === null || draggedId === targetId) return;

    const draggedIdx = videos.findIndex(v => v.id === draggedId);
    const targetIdx = videos.findIndex(v => v.id === targetId);
    
    const newVideos = [...videos];
    const [removed] = newVideos.splice(draggedIdx, 1);
    newVideos.splice(targetIdx, 0, removed);
    
    setVideos(newVideos);
  };

  const onDragEnd = async () => {
    if (!isRearrangeMode) return;
    const updates = videos.map((v, idx) => db.videos.update(v.id!, { order: idx }));
    await Promise.all(updates);
    setDraggedId(null);
  };


  






  return (
    <div className="flex flex-col lg:flex-row gap-10 animate-in fade-in duration-700 pb-20">
      {/* Persistent Left Sidebar: Client Assignment */}
      <aside className="lg:w-80 shrink-0 space-y-6">
        <div className="flex flex-col gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500">
                <Users size={20} />
             </div>
             <div>
                <h3 className="text-xs font-black uppercase text-white tracking-widest leading-none">Athlete Sync</h3>
                <p className="text-[8px] text-slate-500 font-black uppercase mt-1">Terminal Permissions</p>
             </div>
          </div>

          <div className="glass-card rounded-[2rem] border-slate-800 overflow-hidden flex flex-col max-h-[70vh] shadow-2xl">
            <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Protocol Roster</span>
              <div className="flex gap-1">
                <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
              </div>
            </div>
            <div className="overflow-y-auto no-scrollbar p-2 space-y-2">
              <button 
                onClick={() => setSelectedClientId(null)}
                className={`w-full p-4 rounded-xl flex items-center justify-between transition-all border ${!selectedClientId ? 'bg-blue-600/10 border-blue-500 text-white' : 'border-transparent text-slate-600 hover:bg-slate-900'}`}
              >
                <span className="text-[10px] font-black uppercase tracking-widest">Master Gallery</span>
                {!selectedClientId && <Check size={12} />}
              </button>
              <div className="h-[1px] bg-white/5 my-2"></div>
              {clients.map(c => {


                const isClientSelected = selectedClientId === c.id;

                return (
                  <div key={c.id} className="relative group/row">
                    <button 
                      onClick={() => setSelectedClientId(c.id)}
                      className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all border pr-12 ${isClientSelected ? 'bg-emerald-600/10 border-emerald-500 text-white shadow-lg' : 'border-transparent text-slate-600 hover:bg-slate-900'}`}
                    >
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-800 shrink-0">
                        {c.avatar ? <img src={c.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px] font-black italic">IS</div>}
                      </div>
                      <div className="flex flex-col items-start min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-widest truncate w-full">{c.name.split(' ')[0]}</span>
                        
                      </div>
                      {isClientSelected && <UserCheck size={12} className="ml-auto text-emerald-500" />}
                    </button>
                    
                    {/* Unsync All Button */}
                   
                  </div>
                );
              })}
            </div>
            {selectedClientId && (
              <div className="p-4 bg-emerald-600/5 border-t border-white/5 text-center flex items-center justify-center gap-2">
                <Smartphone size={10} className="text-emerald-500" />
                <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Assigning to {selectedClient?.name.split(' ')[0]}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 space-y-12">
        {/* 🔥 Coach Gallery (Firestore / Storage driven) */}

        {!activeFolder ? (
          <div className="space-y-12">
            <header className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                <h2 className="text-5xl font-black brand-font uppercase text-white tracking-tight leading-none">The Academy</h2>
                <p className="text-blue-500 font-bold uppercase text-[10px] tracking-[0.4em] mt-2">Matrix Management Interface</p>
              </div>
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="SEARCH ASSETS..." 
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-6 py-3 font-black text-white text-[10px] uppercase tracking-widest outline-none focus:ring-1 ring-blue-600 shadow-xl"
                />
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              <div className="space-y-8">
                <div className="flex items-center gap-4 border-b-2 border-slate-800 pb-4">
                  <Info className="text-blue-500" size={24} />
                  <h3 className="text-3xl font-black brand-font text-white uppercase">Explanations</h3>
                </div>
                <div className="grid gap-4">
                  {SUB_CATEGORIES.map(sub => (
                    <FolderCard 
                      key={sub} 
                      title={sub} 

                      onClick={() => setActiveFolder({ cat: 'explanation', sub })}
                      icon={<Info size={18} />}
                      accent="blue"
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-8">
                <div className="flex items-center gap-4 border-b-2 border-slate-800 pb-4">
                  <Zap className="text-emerald-500" size={24} />
                  <h3 className="text-3xl font-black brand-font text-white uppercase">Skills</h3>
                </div>
                <div className="grid gap-4">
                  {SUB_CATEGORIES.map(sub => (
                    <FolderCard 
                      key={sub} 
                      title={sub} 
                      count={videos.filter(v => v.category === 'skill' && v.subCategory === sub).length}
                      onClick={() => setActiveFolder({ cat: 'skill', sub })}
                      icon={<Zap size={18} />}
                      accent="emerald"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-12 animate-in slide-in-from-right-10 duration-500">
            <header className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-6">
                <button onClick={() => { setActiveFolder(null); setIsRearrangeMode(false); }} className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all shadow-xl">
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${activeFolder.cat === 'explanation' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                      {activeFolder.cat}
                    </span>
                    <ChevronRight size={12} className="text-slate-700" />
                  </div>
                  <h2 className="text-4xl font-black brand-font uppercase text-white tracking-tight">{activeFolder.sub}</h2>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsRearrangeMode(!isRearrangeMode)}
                  className={`px-8 py-4 rounded-2xl font-black text-xs tracking-widest uppercase flex items-center gap-3 shadow-xl transition-all active:scale-95 border ${isRearrangeMode ? 'bg-blue-600 text-white border-blue-400' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'}`}
                >
                  <Layers size={18} /> {isRearrangeMode ? 'DONE REARRANGING' : 'REARRANGE'}
                </button>
<div className="flex items-center gap-4">
  {/* Thumbnail picker */}
  <label className="cursor-pointer">
    <input
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)}
    />
    <div className="bg-slate-800 text-white px-6 py-4 rounded-2xl font-black text-xs tracking-widest uppercase flex items-center gap-3 shadow-xl hover:bg-slate-700">
      <ImageIcon size={18} /> THUMBNAIL
    </div>
  </label>

  {/* Video picker */}
  <label className="cursor-pointer">
    <input
      type="file"
      accept="video/*"
      className="hidden"
      onChange={handleFileUpload}
      
    />
    <div className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black text-xs tracking-widest uppercase flex items-center gap-3 shadow-2xl transition-all active:scale-95">
      <Plus size={18} /> {isUploading ? 'SYNCING...' : 'ADD VIDEO'}
    </div>
  </label>
</div>



              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {visibleVideos.length === 0 && !isUploading && (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-900 rounded-[3rem]">
                  <Folder className="mx-auto text-slate-800 mb-4" size={48} />
                  <p className="text-slate-600 font-black uppercase text-xs tracking-widest">No assets found in this sector</p>
                </div>
              )}
           {visibleVideos.map(video => (
        <VideoManagementCard 
  key={video.uid}
  video={video} 
  isRearrangeMode={isRearrangeMode}
  selectedClientId={selectedClientId}
  selectedClientName={selectedClient?.name.split(' ')[0]}
  isAssigned={assignedExplanationUids.includes(video.uid)}

  onToggleAssignment={async () => {
    if (!selectedClientId) return;

    if (activeFolder?.cat === "explanation") {
      if (assignedExplanationUids.includes(video.uid)) {
        await unassignExplanationFromClient(video.uid, selectedClientId);
      } else {
        await assignExplanationToClient(video.uid, selectedClientId);
      }

      const updated = await getAssignedExplanationUids(selectedClientId);
      setAssignedExplanationUids(updated);
    } else {
      onToggleAssignment(selectedClientId, video.uid);
    }
  }}

  onDelete={() => {
    if (activeFolder?.cat === "skill" && video.id) {
      deleteVideo(video.id);
    } else {
      alert("Explanation videos must be deleted from Firebase (for now).");
    }
  }}

  onUpdate={(updates) => {
    if (activeFolder?.cat === 'skill' && video.id) {
      updateVideo(video.id, updates);
    }
  }}

  onDragStart={() => {
    if (activeFolder?.cat === "skill" && video.id) {
      onDragStart(video.id);
    }
  }}

  onDragOver={(e) => {
    if (activeFolder?.cat === "skill" && video.id) {
      onDragOver(e, video.id);
    }
  }}

  onDragEnd={() => {
    if (activeFolder?.cat === "skill") {
      onDragEnd();
    }
  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const VideoManagementCard: React.FC<{ 
  video: VideoFile; 
  isRearrangeMode: boolean;
  selectedClientId: string | null;
  selectedClientName?: string;
  isAssigned: boolean;
  onToggleAssignment: () => void;
  onDelete: () => void; 
  onUpdate: (u: Partial<VideoFile>) => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}> = ({ video, isRearrangeMode, selectedClientId, selectedClientName, isAssigned, onToggleAssignment, onDelete, onUpdate, onDragStart, onDragOver, onDragEnd }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tempName, setTempName] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const handleNameSave = () => {
    const finalName = tempName.trim() ? tempName.toUpperCase() : video.name;
    onUpdate({ name: finalName });
    setIsEditing(false);
    setTempName("");
  };

const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (video.category === "explanation") {
    try {
      const newURL = await uploadExplanationThumbnail(video.uid, file);
      onUpdate({ thumbnail: newURL });
      alert("Thumbnail updated!");
    } catch (err) {
      console.error(err);
      alert("Failed to upload thumbnail.");
    }
    return;
  }

  // Existing behavior for skill videos
  const reader = new FileReader();
  reader.onloadend = () => {
    onUpdate({ thumbnail: reader.result as string });
  };
  reader.readAsDataURL(file);
};




  return (
    <div 
      draggable={isRearrangeMode}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={`glass-card rounded-[2.5rem] border-slate-800/50 overflow-hidden group shadow-xl transition-all flex flex-col relative ${isRearrangeMode ? 'ring-2 ring-blue-500/50 scale-[0.98] cursor-grab active:cursor-grabbing' : 'hover:border-blue-500/30'} ${selectedClientId && isAssigned ? 'ring-2 ring-emerald-500/50 border-emerald-500/20' : ''}`}
    >
      {/* Mini Player / Thumbnail Area */}
      <div className="aspect-video bg-black relative overflow-hidden">
        {isPlaying ? (
          <video 
        src={video.url}
            controls 
            autoPlay 
            className="w-full h-full object-contain"
            onEnded={() => setIsPlaying(false)}
          />
        ) : (
          <div className="w-full h-full">
            {video.thumbnail ? (
              <img src={video.thumbnail} className="w-full h-full object-contain bg-black" alt={video.name} />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-950">
                <Video className="w-12 h-12 text-slate-900 group-hover:text-blue-500/20 transition-all" />
              </div>
            )}
            
            {/* Action Overlays */}
            {!isRearrangeMode && !isDeleting && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <button onClick={() => setIsPlaying(true)} className="p-4 bg-blue-600 text-white rounded-full hover:scale-110 transition-transform shadow-2xl">
                  <Play size={24} fill="currentColor" />
                </button>
                <button onClick={() => thumbnailInputRef.current?.click()} className="p-4 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all backdrop-blur-md">
                  <ImageIcon size={20} />
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Deletion Confirmation Overlay */}
        {isDeleting && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
            <p className="text-white font-black brand-font uppercase text-sm mb-6 tracking-tight">Delete Protocol?</p>
            <div className="flex gap-4 w-full">
               <button onClick={() => setIsDeleting(false)} className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all">No</button>
               <button onClick={onDelete} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 transition-all">Yes</button>
            </div>
          </div>
        )}
        
        {/* Rearrange Grip */}
        {isRearrangeMode && (
          <div className="absolute top-4 left-4 p-2 bg-blue-600 text-white rounded-xl shadow-lg animate-pulse"><GripVertical size={20} /></div>
        )}

        {/* Delete Trigger */}
        {!isRearrangeMode && !isDeleting && (
          <button onClick={() => setIsDeleting(true)} className="absolute top-4 right-4 p-3 bg-red-600/10 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 backdrop-blur-md z-10">
            <X size={16} className="pointer-events-none" />
          </button>
        )}
      </div>

      <div className="p-6 space-y-6">
        {isEditing ? (
          <div className="flex gap-2">
            <input 
              value={tempName} 
              onChange={e => setTempName(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleNameSave()}
              onBlur={handleNameSave}
              placeholder={video.name}
              className="flex-1 bg-slate-900 border border-blue-500 rounded-xl px-4 py-2 text-xs font-black text-white uppercase outline-none" 
              autoFocus
            />
          </div>
        ) : (
          <div className="flex justify-between items-start group/title">
            <div className="flex-1 min-w-0">
               <h4 className={`text-sm font-black brand-font uppercase truncate leading-none ${selectedClientId && isAssigned ? 'text-emerald-400' : 'text-slate-200'}`}>{video.name}</h4>
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-1.5">
{video.uploadDate
  ? new Date(
      video.uploadDate.seconds
        ? video.uploadDate.seconds * 1000
        : video.uploadDate
    ).toLocaleDateString()
  : ""}
</p>

            </div>
            {!isRearrangeMode && !isDeleting && (
              <button onClick={() => setIsEditing(true)} className="text-slate-700 hover:text-blue-500 opacity-0 group-hover/title:opacity-100 transition-all shrink-0 ml-2">
                <Edit3 size={14} />
              </button>
            )}
          </div>
        )}
        
        <div className="pt-4 border-t border-white/5">
          {selectedClientId ? (
            <button 
              onClick={(e) => { e.stopPropagation(); onToggleAssignment(); }}
              className={`w-full py-3 rounded-xl flex items-center justify-center gap-3 transition-all font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-[0.98] ${
                isAssigned 
                ? 'bg-emerald-600 text-white shadow-emerald-900/20' 
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {isAssigned ? (
                <>
                  <UserCheck size={14} /> UNSYNC FROM {selectedClientName}
                </>
              ) : (
                <>
                  <Smartphone size={14} /> SYNC TO {selectedClientName}
                </>
              )}
            </button>
          ) : (
            <div className="w-full py-3 bg-slate-900/50 border border-dashed border-slate-800 rounded-xl flex items-center justify-center gap-2 opacity-40">
               <Users size={12} className="text-slate-600" />
               <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Select Athlete to Assign</span>
            </div>
          )}
        </div>
      </div>
      
      <input type="file" ref={thumbnailInputRef} onChange={handleThumbnailUpload} accept="image/*" className="hidden" />
    </div>
  );
};

const FolderCard = ({ title, count, onClick, icon, accent }: any) => (
  <button 
    onClick={onClick}
    className="glass-card p-6 rounded-[2rem] border-slate-800/50 flex items-center justify-between group hover:border-blue-500/40 transition-all shadow-lg w-full text-left"
  >
    <div className="flex items-center gap-6">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${accent === 'blue' ? 'bg-blue-600/10 text-blue-500 group-hover:bg-blue-600 group-hover:text-white' : 'bg-emerald-600/10 text-emerald-500 group-hover:bg-emerald-600 group-hover:text-white'}`}>
        {icon}
      </div>
      <div>
        <h4 className="text-lg font-black brand-font text-white uppercase tracking-tight">{title}</h4>
        {typeof count === 'number' && (
  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
    {count} Assets Sync'd
  </p>
)}
      </div>
    </div>
    <ChevronRight className="text-slate-800 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" size={20} />
  </button>
);

export default AcademyManager;