import React, { useState, useEffect, useMemo } from "react";
import { Play, Search, X, Maximize2, Info, Lock } from "lucide-react";
import { db, VideoFile } from "../db";
import { ClientData } from "../types";
import { resolveAcademyVideoUrl } from "../firebaseService";

interface Props {
  accentColor: string;
  client: ClientData;
}

const AcademyLibrary: React.FC<Props> = ({ client }) => {
  const [allVideos, setAllVideos] = useState<VideoFile[]>([]);
const [activeVideo, setActiveVideo] = useState<VideoFile | null>(null);
const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
const [inlinePlayingUid, setInlinePlayingUid] = useState<string | null>(null);
const [search, setSearch] = useState("");

  // Resolve Firebase URL when active video changes
  useEffect(() => {
    if (!activeVideo) {
      setActiveVideoUrl(null);
      return;
    }

    resolveAcademyVideoUrl(activeVideo.uid).then(setActiveVideoUrl);
  }, [activeVideo]);

  // Load local DB videos
  useEffect(() => {
    db.videos.orderBy("order").toArray().then(setAllVideos);
  }, []);

  const assignedVideos = useMemo(() => {
    const assignedUids = new Set(client?.assignedVideoUids || []);
    return allVideos.filter(
      v => v.category === "explanation" && assignedUids.has(v.uid)
    );
  }, [allVideos, client?.assignedVideoUids]);

  const filteredVideos = useMemo(() => {
    return assignedVideos.filter(v =>
      (v.name || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [assignedVideos, search]);

  return (
    <div className="space-y-16 pb-20">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between gap-6">
        <div>
          <h2 className="text-5xl font-black uppercase text-white">
            Explanation Gallery
          </h2>
          <p className="text-blue-500 text-xs font-bold uppercase tracking-widest mt-2">
            Technical Video Vault
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-white text-xs uppercase tracking-widest"
          />
        </div>
      </header>

    {/* GRID */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
  {assignedVideos.length === 0 ? (
    <div className="col-span-full py-32 text-center border border-dashed border-slate-800 rounded-3xl">
      <Lock size={48} className="mx-auto text-slate-700 mb-4" />
      <p className="text-slate-600 uppercase text-xs font-bold">
        No videos assigned yet
      </p>
    </div>
  ) : filteredVideos.length === 0 ? (
    <div className="col-span-full text-center text-slate-600 uppercase text-xs">
      No results
    </div>
  ) : (
    filteredVideos.map(video => (
      <LibraryVideoCard
        key={video.id}
        video={video}
        isInlinePlaying={inlinePlayingUid === video.uid}
        inlineVideoUrl={
          inlinePlayingUid === video.uid ? activeVideoUrl : null
        }
        onPlay={() => {
          setInlinePlayingUid(video.uid);
          setActiveVideo(video);
        }}
        onFullScreen={() => setActiveVideo(video)}
      />
    ))
  )}
</div>


      {/* FULLSCREEN MODAL */}
     <div
  className="fixed inset-0 z-[100] flex items-center justify-center"
  style={{ display: activeVideo ? "flex" : "none" }}
>
          <div
            className="absolute inset-0 bg-black/90"
            onClick={() => setActiveVideo(null)}
          />

          <div className="relative w-full max-w-5xl bg-black rounded-3xl overflow-hidden">
            <button
              onClick={() => setActiveVideo(null)}
              className="absolute top-4 right-4 z-10 p-3 bg-black/60 rounded-full text-white"
            >
              <X size={20} />
            </button>

           <video
  src={activeVideoUrl || undefined}
  controls
  playsInline
  webkit-playsinline
  preload="metadata"
  className="w-full max-h-[80vh] object-contain"
  style={{ display: activeVideoUrl ? "block" : "none" }}
/>
          </div>
        </div>
    </div>
  );
};

export default AcademyLibrary;

/* ========================= */
/* ===== VIDEO CARD ======== */
/* ========================= */

const LibraryVideoCard: React.FC<{
  video: VideoFile;
  isInlinePlaying: boolean;
  inlineVideoUrl: string | null;
  onPlay: () => void;
  onFullScreen: () => void;
}> = ({ video, isInlinePlaying, inlineVideoUrl, onPlay, onFullScreen }) => {

return (
  <div className="rounded-3xl overflow-hidden border border-slate-800 bg-slate-900">
    <div className="aspect-video bg-black relative">

      <video
        src={inlineVideoUrl || undefined}
        controls
        playsInline
        webkit-playsinline
        preload="metadata"
        className="w-full h-full"
        style={{ display: isInlinePlaying ? "block" : "none" }}
      />

      {!isInlinePlaying && (
        <>
          {video.thumbnail ? (
            <img
              src={video.thumbnail}
              alt={video.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play size={32} />
            </div>
          )}

          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition flex items-center justify-center gap-4">
            <button
              onClick={onPlay}
              className="p-3 bg-blue-600 rounded-full text-white"
            >
              <Play size={18} />
            </button>

            <button
              onClick={onFullScreen}
              className="p-3 bg-white/20 rounded-full text-white"
            >
              <Maximize2 size={18} />
            </button>
          </div>
        </>
      )}

    </div>
  </div>
);
