import React, { useState, useEffect, useRef } from 'react';
import { Upload, X, Video, Search, Plus, Info, Zap, ChevronRight, Folder, ArrowLeft, Edit3, Image as ImageIcon, Play, Pause, GripVertical, Layers, Check, Users, UserCheck, Smartphone, Link2Off } from 'lucide-react';
import {
  getSkillVideos,
  createSkillVideo,
  updateSkillVideoOrders,
  deleteSkillVideo,
  updateSkillVideo,
  uploadSkillThumbnail,
  SkillVideo
} from "../firebase/skillVideos";

import { ClientData } from '../types';
import { uploadVideoToFirebase } from "../firebaseService";
import { ExplanationVideo } from "../firebase/explanationVideos";
import { getStorage, ref, listAll, getDownloadURL, uploadBytes, uploadBytesResumable } from "firebase/storage";
import { getApp } from "firebase/app";

const storage = getStorage(getApp());

import {
  uploadExplanationVideo,
  uploadExplanationThumbnail,
  getExplanationVideos,
  assignExplanationToClient,
  unassignExplanationFromClient,
  getAssignedExplanationUids,
  updateExplanationVideoOrders,
  deleteExplanationVideo,
  updateExplanationVideoName,
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
  "Front Lever",
  "Planche",
  "Mentality"
];

const AcademyManager: React.FC<Props> = ({ accentColor, clients, onToggleAssignment, onUnsyncAll }) => {
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [explanationVideos, setExplanationVideos] = useState<ExplanationVideo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [pendingSkillVideo, setPendingSkillVideo] = useState<File | null>(null);
  const [showFramePicker, setShowFramePicker] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState<{cat: 'explanation' | 'skill', sub: string} | null>(null);
  const [isRearrangeMode, setIsRearrangeMode] = useState(false);
  const [draggedId, setDraggedId] = useState<number | string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
const [assignedExplanationUids, setAssignedExplanationUids] = useState<string[]>([]);


const loadVideos = async () => {
  const vids = await getSkillVideos();

  const normalized: VideoFile[] = vids.map(v => ({
    id: v.id,
    uid: v.uid,
    name: v.name,
    url: v.url,
    thumbnail: v.thumbnailURL ?? "",
    category: "skill",
    subCategory: v.subCategory,
    uploadDate: v.createdAt,
    order: v.order,
  }));

  setVideos(normalized);
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
  await uploadExplanationVideo(
    file,
    null,  // thumbnail added later via card button
    file.name.split(".")[0].toUpperCase(),
    activeFolder.sub,
    (pct) => setUploadProgress(pct)
  );

  await loadExplanationVideos();
} else {
  /* SKILLS — show frame picker first */
  setPendingSkillVideo(file);
  setShowFramePicker(true);
  setIsUploading(false);
  if (e?.target) e.target.value = "";
  return;
}


  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    alert("Upload failed");
  } finally {
    setIsUploading(false);
  }
};

const handleSkillVideoUpload = async (thumbnailFile: File | null) => {
  if (!activeFolder || !pendingSkillVideo) return;
  setShowFramePicker(false);
  setIsUploading(true);
  setUploadProgress(0);
  try {
    const folderVideos = videos.filter(
      v => v.category === activeFolder.cat && v.subCategory === activeFolder.sub
    );
    const maxOrder = folderVideos.length > 0 ? Math.max(...folderVideos.map(v => v.order)) : 0;
    const videoId = `v-${Date.now()}`;

    // Upload video with progress tracking
    const videoRef = ref(storage, `academy/${videoId}.mp4`);
    const videoUrl = await new Promise<string>((resolve, reject) => {
      const task = uploadBytesResumable(videoRef, pendingSkillVideo);
      task.on('state_changed',
        (snap) => {
          const pct = snap.totalBytes > 0 ? Math.round((snap.bytesTransferred / snap.totalBytes) * 100) : 0;
          setUploadProgress(pct);
        },
        reject,
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        }
      );
    });

    let thumbnailURL: string | undefined;
    if (thumbnailFile) {
      const storageRef = ref(storage, `skill_thumbnails/${videoId}`);
      await uploadBytes(storageRef, thumbnailFile, { contentType: thumbnailFile.type });
      thumbnailURL = await getDownloadURL(storageRef);
    }

    await createSkillVideo({
      uid: videoId,
      name: pendingSkillVideo.name.split(".")[0].toUpperCase(),
      url: videoUrl,
      subCategory: activeFolder.sub,
      order: maxOrder + 1,
      ...(thumbnailURL ? { thumbnailURL } : {}),
    } as any);
    await loadVideos();
  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    alert("Upload failed");
  } finally {
    setIsUploading(false);
    setUploadProgress(0);
    setPendingSkillVideo(null);
  }
};

  const deleteVideo = async (video: VideoFile) => {
    if (!window.confirm(`Delete "${video.name}"? This cannot be undone.`)) return;
    try {
      if (activeFolder?.cat === 'skill' && video.id) {
        await deleteSkillVideo(String(video.id));
        setVideos(prev => prev.filter(v => v.id !== video.id));
      } else if (activeFolder?.cat === 'explanation' && video.uid) {
        await deleteExplanationVideo(video.uid);
        setVideos(prev => prev.filter(v => v.uid !== video.uid));
      }
    } catch (e) {
      alert('Failed to delete video. Please try again.');
    }
  };


  const updateVideo = async (video: VideoFile, updates: Partial<VideoFile>) => {
    try {
      if (updates.name) {
        if (activeFolder?.cat === 'skill' && video.id) {
          await updateSkillVideo(String(video.id), { name: updates.name });
        } else if (activeFolder?.cat === 'explanation' && video.uid) {
          await updateExplanationVideoName(video.uid, updates.name);
        }
      }
      // Update local state (name + thumbnail)
      if (activeFolder?.cat === 'explanation') {
        setExplanationVideos(prev => prev.map(v =>
          v.uid === video.uid
            ? {
                ...v,
                ...(updates.name ? { name: updates.name! } : {}),
                ...(updates.thumbnail !== undefined ? { thumbnailURL: updates.thumbnail } : {}),
              }
            : v
        ));
      } else {
        setVideos(prev => prev.map(v =>
          (video.id ? v.id === video.id : v.uid === video.uid)
            ? { ...v, ...(updates.name ? { name: updates.name! } : {}), ...(updates.thumbnail !== undefined ? { thumbnail: updates.thumbnail } : {}) }
            : v
        ));
      }
    } catch (e) {
      alert('Failed to save. Please try again.');
    }
  };


  const [dragOverVideoId, setDragOverVideoId] = useState<number | string | null>(null);

const onDragStart = (id: number | string) => {
  if (!isRearrangeMode) return;
  setDraggedId(id);
};

  const onDragOver = (e: React.DragEvent, targetId: number | string) => {
    e.preventDefault();
    if (!isRearrangeMode || draggedId === null || draggedId === targetId) return;
    setDragOverVideoId(targetId);
  };

  const onDragEnd = async () => {
    if (draggedId !== null && dragOverVideoId !== null && draggedId !== dragOverVideoId) {
      if (activeFolder?.cat === 'skill') {
        const draggedIdx = videos.findIndex(v => v.id === draggedId);
        const targetIdx = videos.findIndex(v => v.id === dragOverVideoId);
        const newVideos = [...videos];
        const [removed] = newVideos.splice(draggedIdx, 1);
        newVideos.splice(targetIdx, 0, removed);
        const reordered = newVideos.map((v, i) => ({ ...v, order: i + 1 }));
        setVideos(reordered);
        try {
          await updateSkillVideoOrders(
            reordered.filter(v => v.id !== undefined).map(v => ({ id: String(v.id), order: v.order }))
          );
        } catch (e) { console.error("Failed to save skill video order:", e); }
      } else if (activeFolder?.cat === 'explanation') {
        const draggedIdx = explanationVideos.findIndex(v => v.uid === draggedId || v.id === String(draggedId));
        const targetIdx = explanationVideos.findIndex(v => v.uid === dragOverVideoId || v.id === String(dragOverVideoId));
        const newVideos = [...explanationVideos];
        const [removed] = newVideos.splice(draggedIdx, 1);
        newVideos.splice(targetIdx, 0, removed);
        const reordered = newVideos.map((v, i) => ({ ...v, order: i + 1 }));
        setExplanationVideos(reordered);
        try {
          await updateExplanationVideoOrders(
            reordered.map(v => ({ uid: v.uid, order: v.order ?? 0 }))
          );
        } catch (e) { console.error("Failed to save explanation video order:", e); }
      }
    }
    setDraggedId(null);
    setDragOverVideoId(null);
  };

  return (
    <>
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
  {/* Video picker */}
  <label className="cursor-pointer">
    <input
      type="file"
      accept="video/*"
      className="hidden"
      onChange={handleFileUpload}
    />
    <div className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black text-xs tracking-widest uppercase flex items-center gap-3 shadow-2xl transition-all active:scale-95 relative overflow-hidden">
      {isUploading && (
        <span className="absolute inset-0 bg-blue-400/30 origin-left transition-all duration-500" style={{ transform: `scaleX(${uploadProgress > 0 ? uploadProgress / 100 : 0.05})` }} />
      )}
      <span className="relative flex items-center gap-3">
        <Plus size={18} />
        {isUploading
          ? uploadProgress > 0 ? `UPLOADING ${uploadProgress}%` : 'PREPARING...'
          : showFramePicker ? 'PICKING FRAME...' : 'ADD VIDEO'}
      </span>
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
  isDragOver={dragOverVideoId === video.id || dragOverVideoId === video.uid}
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

  onDelete={() => deleteVideo(video)}

  onUpdate={(updates) => updateVideo(video, updates)}

  onDragStart={() => {
    if (activeFolder?.cat === "skill" && video.id) {
      onDragStart(video.id);
    } else if (activeFolder?.cat === "explanation" && video.uid) {
      onDragStart(video.uid);
    }
  }}

  onDragOver={(e) => {
    if (activeFolder?.cat === "skill" && video.id) {
      onDragOver(e, video.id);
    } else if (activeFolder?.cat === "explanation" && video.uid) {
      onDragOver(e, video.uid);
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

    {/* Frame picker modal for skill videos */}
    {showFramePicker && pendingSkillVideo && (
      <FramePickerModal
        file={pendingSkillVideo}
        onUse={(thumb) => handleSkillVideoUpload(thumb)}
        onSkip={() => handleSkillVideoUpload(null)}
        onCancel={() => { setShowFramePicker(false); setPendingSkillVideo(null); }}
      />
    )}
  </>
  );
};

const FramePickerModal: React.FC<{
  file: File;
  onUse: (thumb: File) => void;
  onSkip: () => void;
  onCancel: () => void;
}> = ({ file, onUse, onSkip, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [captureDataUrl, setCaptureDataUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const objUrl = React.useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => () => URL.revokeObjectURL(objUrl), [objUrl]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCaptureDataUrl(dataUrl);
    canvas.toBlob(blob => { if (blob) setCapturedBlob(blob); }, 'image/jpeg', 0.85);
  };

  const handleUse = () => {
    if (!capturedBlob) return;
    onUse(new File([capturedBlob], 'thumbnail.jpg', { type: 'image/jpeg' }));
  };

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onCancel} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-2xl w-full space-y-5 shadow-2xl">
        <div>
          <h3 className="text-white font-black uppercase tracking-widest text-sm">Choose Thumbnail Frame</h3>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Scrub to the moment you want, then capture</p>
        </div>

        <div className="bg-black rounded-2xl overflow-hidden aspect-video">
          <video
            ref={videoRef}
            src={objUrl}
            className="w-full h-full object-contain"
            onLoadedMetadata={() => {
              const d = videoRef.current?.duration || 0;
              setDuration(d);
              if (videoRef.current) videoRef.current.currentTime = d * 0.1;
            }}
            onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        </div>

        <div className="space-y-2">
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.05}
            value={currentTime}
            onChange={e => {
              const t = parseFloat(e.target.value);
              if (videoRef.current) { videoRef.current.currentTime = t; videoRef.current.pause(); }
              setCurrentTime(t);
            }}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-[9px] font-black text-slate-600 uppercase tracking-widest">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => isPlaying ? videoRef.current?.pause() : videoRef.current?.play()}
              className="px-6 py-3 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all flex items-center gap-2"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={capture}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center justify-center gap-2"
            >
              <ImageIcon size={14} /> Capture This Frame
            </button>
          </div>
        </div>

        {captureDataUrl && (
          <div className="flex items-center gap-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl animate-in fade-in duration-300">
            <img src={captureDataUrl} className="w-24 h-14 object-cover rounded-xl shrink-0" alt="captured" />
            <div>
              <p className="text-emerald-400 font-black text-xs uppercase tracking-widest">Frame captured ✓</p>
              <p className="text-slate-500 text-[9px] font-black uppercase mt-1">Scrub to a different frame and capture again to replace</p>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />

        <div className="flex gap-3 pt-1">
          <button onClick={onSkip} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all">
            Upload Without Thumbnail
          </button>
          {captureDataUrl && (
            <button onClick={handleUse} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-all">
              ✓ Use This Frame
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const VideoManagementCard: React.FC<{ 
  video: VideoFile; 
  isRearrangeMode: boolean;
  isDragOver: boolean;
  selectedClientId: string | null;
  selectedClientName?: string;
  isAssigned: boolean;
  onToggleAssignment: () => void;
  onDelete: () => void; 
  onUpdate: (u: Partial<VideoFile>) => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}> = ({ video, isRearrangeMode, isDragOver, selectedClientId, selectedClientName, isAssigned, onToggleAssignment, onDelete, onUpdate, onDragStart, onDragOver, onDragEnd }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tempName, setTempName] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const handleNameSave = () => {
    const finalName = tempName.trim() ? tempName.toUpperCase() : video.name;
    if (finalName === video.name) { setIsEditing(false); setTempName(""); return; }
    if (!window.confirm(`Rename to "${finalName}"?`)) return;
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
    } catch (err) {
      console.error(err);
      alert("Failed to upload thumbnail.");
    }
    return;
  }

  // Skill videos — upload to Firebase Storage + update Firestore
  if (video.category === "skill" && video.id) {
    try {
      const newURL = await uploadSkillThumbnail(String(video.id), file);
      onUpdate({ thumbnail: newURL });
    } catch (err) {
      console.error(err);
      alert("Failed to upload thumbnail.");
    }
    return;
  }
};




  return (
    <div 
      draggable={isRearrangeMode}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={`glass-card rounded-[2.5rem] border-slate-800/50 overflow-hidden group shadow-xl transition-all flex flex-col relative ${isRearrangeMode ? 'ring-2 ring-blue-500/50 scale-[0.98] cursor-grab active:cursor-grabbing' : 'hover:border-blue-500/30'} ${isDragOver ? 'ring-2 ring-amber-400/80 border-amber-400/40 scale-[1.02]' : ''} ${selectedClientId && isAssigned ? 'ring-2 ring-emerald-500/50 border-emerald-500/20' : ''}`}
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