import React, { useState, useEffect, useMemo } from 'react';
import { Play, Search, X, Video, LayoutGrid, ArrowLeft, FolderOpen, Maximize2, Info, Lock } from 'lucide-react';
import { db, VideoFile } from '../db';
import { ClientData } from '../types';

interface Props {
  accentColor: string;
  client: ClientData;
}

const AcademyLibrary: React.FC<Props> = ({ accentColor, client }) => {
  const [allVideos, setAllVideos] = useState<VideoFile[]>([]);
  const [activeVideo, setActiveVideo] = useState<VideoFile | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    db.videos.orderBy('order').toArray().then(setAllVideos);
  }, []);

  // Filter videos that are explicitly assigned to the athlete in their protocol meta
  // REQUIREMENT: Only show 'explanation' category videos in this gallery.
  const assignedVideos = useMemo(() => {
    const assignedUids = new Set<string>(client?.assignedVideoUids || []);
    
    // We only want videos from the 'explanation' category in the main gallery.
    // Skill videos are accessed exclusively through the workout plan.
    return allVideos.filter(v => v.category === 'explanation' && assignedUids.has(v.uid));
  }, [allVideos, client?.assignedVideoUids]);

  const filteredVideos = useMemo(() => {
    return assignedVideos.filter(v => 
      (v.name || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [assignedVideos, search]);

  return (
    <div className="space-y-16 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-5xl font-black brand-font uppercase text-white tracking-tight leading-none">EXPLANATION GALLERY</h2>
            <p className="text-blue-500 font-bold uppercase text-[10px] tracking-[0.4em] mt-3">Elite Technical Training Vault</p>
          </div>
          <div className="bg-slate-900/50 border border-white/5 p-6 rounded-[2rem] max-w-xl">
             <p className="text-xs font-medium text-slate-300 leading-relaxed italic">
               In here you will find specific technique explanations and tutorials assigned to your current protocol.
               <span className="block mt-2 font-black uppercase text-[9px] tracking-widest text-slate-500">Skill specific videos are accessed directly via your workout movements.</span>
             </p>
          </div>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="SEARCH EXPLANATIONS..." 
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-16 pr-6 py-4 font-black text-white text-[10px] uppercase tracking-widest outline-none focus:ring-1 ring-blue-600 shadow-2xl"
          />
        </div>
      </header>

      {/* Main Video Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {assignedVideos.length === 0 ? (
          <div className="col-span-full py-32 text-center border-2 border-dashed border-white/5 rounded-[3rem] bg-slate-900/20">
            <Lock className="mx-auto text-slate-800 mb-6" size={64} />
            <h4 className="text-xl font-black text-slate-700 uppercase brand-font">Gallery Synchronizing</h4>
            <p className="text-slate-800 font-bold uppercase text-[9px] tracking-widest mt-2">No technical explanations have been assigned to your profile yet</p>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="col-span-full py-20 text-center">
            <p className="text-slate-600 font-black uppercase text-xs tracking-widest">No explanations match your search criteria</p>
          </div>
        ) : (
          filteredVideos.map(video => (
            <LibraryVideoCard key={video.id} video={video} onFullScreen={() => setActiveVideo(video)} />
          ))
        )}
      </div>

      {activeVideo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/98 backdrop-blur-3xl" onClick={() => setActiveVideo(null)}></div>
          <div className="relative w-full max-w-5xl bg-slate-900 rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl flex flex-col">
             <button onClick={() => setActiveVideo(null)} className="absolute top-6 right-6 z-20 p-4 bg-black/50 text-white rounded-full hover:bg-white hover:text-black transition-all backdrop-blur-md">
               <X size={24} />
             </button>
             <div className="bg-black flex items-center justify-center overflow-hidden">
               <video 
                 src={URL.createObjectURL(activeVideo.blob)} 
                 controls 
                 autoPlay 
                 className="w-full h-auto max-h-[75vh] object-contain"
               />
             </div>
             <div className="p-8 md:p-12 bg-slate-900 border-t border-slate-800 shrink-0">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-3xl font-black brand-font text-white uppercase tracking-tight">{activeVideo.name}</h3>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-blue-500 font-black uppercase text-[9px] tracking-widest">{activeVideo.subCategory}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                      <span className="text-slate-500 font-black uppercase text-[9px] tracking-widest">{activeVideo.category}</span>
                    </div>
                  </div>
                  <div className="text-[9px] text-slate-600 font-black uppercase tracking-widest bg-slate-950 px-4 py-2 rounded-xl border border-white/5">
                    SYNCED: {activeVideo.uploadDate.toLocaleDateString()}
                  </div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LibraryVideoCard: React.FC<{ video: VideoFile; onFullScreen: () => void }> = ({ video, onFullScreen }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="glass-card rounded-[2.5rem] border-slate-800 overflow-hidden group shadow-2xl flex flex-col transition-all hover:border-blue-500/30">
      <div className="aspect-video bg-black relative overflow-hidden">
        {isPlaying ? (
          <video 
            src={URL.createObjectURL(video.url)} 
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
                <Play className="text-slate-900 group-hover:text-blue-500 transition-all" size={32} />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
              <button onClick={() => setIsPlaying(true)} className="p-4 bg-white/10 hover:bg-blue-600 text-white rounded-full transition-all backdrop-blur-md">
                <Play size={24} fill="currentColor" />
              </button>
              <button onClick={onFullScreen} className="p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-md">
                <Maximize2 size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="p-6">
         <h4 className="text-lg font-black brand-font text-white uppercase truncate group-hover:text-blue-400 transition-colors">{video.name}</h4>
         <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <Info size={10} className="text-slate-700" />
              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Technique Guide</span>
            </div>
            <div className="w-2 h-2 rounded-full bg-blue-500/20 flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-blue-500"></div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default AcademyLibrary;
