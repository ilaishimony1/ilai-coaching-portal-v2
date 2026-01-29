import React, { useState, useEffect, useMemo, useRef } from "react";
import { Play, Search, X, Lock } from "lucide-react";
import { VideoFile } from "../db";
import { ClientData } from "../types";
import { getAssignedExplanationUids } from "../firebase/explanationVideos";
import { getExplanationVideos } from "../firebase/explanationVideos";

interface Props {
  client: ClientData;
}

const AcademyLibrary: React.FC<Props> = ({ client }) => {
  const [allVideos, setAllVideos] = useState<VideoFile[]>([]);
const [activeVideo, setActiveVideo] = useState<VideoFile | null>(null);
const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
const [search, setSearch] = useState("");
const fullscreenVideoRef = useRef<HTMLVideoElement | null>(null);
const [assignedUids, setAssignedUids] = useState<Set<string>>(new Set());
const [assignmentsLoaded, setAssignmentsLoaded] = useState(false);

const closeVideo = () => {
  if (fullscreenVideoRef.current) {
    fullscreenVideoRef.current.pause();
    fullscreenVideoRef.current.removeAttribute("src");
    fullscreenVideoRef.current.load();
  }

  setActiveVideo(null);
  setActiveVideoUrl(null);
};
useEffect(() => {
  if (!client?.id) return;

  setAssignmentsLoaded(false);

  getAssignedExplanationUids(client.id).then(uids => {
    setAssignedUids(new Set(uids));
    setAssignmentsLoaded(true);
  });
}, [client?.id]);


  // Resolve Firebase URL when active video changes
 useEffect(() => {
  if (!activeVideo) {
    setActiveVideoUrl(null);
    return;
  }

  setActiveVideoUrl(activeVideo.url);
}, [activeVideo]);


  // Load local DB videos
useEffect(() => {
  getExplanationVideos().then((vids) => {
    const mapped = vids.map(v => ({
      id: undefined,
      uid: v.uid,
      name: v.name,
      url: v.downloadURL,
      thumbnail: v.thumbnail || "/video-placeholder.jpg",
      category: "explanation",
      subCategory: v.subCategory,
      uploadDate: v.createdAt,
      order: 0,
    }));

    setAllVideos(mapped);
  });
}, []);


const assignedVideos = useMemo(() => {
  return allVideos.filter(
    v => v.category === "explanation" && assignedUids.has(v.uid)
  );
}, [allVideos, assignedUids]);



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
  {!assignmentsLoaded ? (
    <div className="col-span-full text-center text-slate-500 uppercase text-xs">
      Loading videos…
    </div>
  ) : assignedVideos.length === 0 ? (
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
        key={video.uid}
        video={video}
        onPlay={() => setActiveVideo(video)}
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
            onClick={closeVideo}

          />

          <div className="relative w-full max-w-5xl bg-black rounded-3xl overflow-hidden">
            <button
              onClick={closeVideo}
              className="absolute top-4 right-4 z-10 p-3 bg-black/60 rounded-full text-white"
            >
              <X size={20} />
            </button>

    <video
  ref={fullscreenVideoRef}
  src={activeVideoUrl || undefined}
  controls
  playsInline
  preload="metadata"
  className="w-full max-h-[80vh] object-contain"
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
  onPlay: () => void;
}> = ({ video, onPlay }) => {
  return (
    <div className="rounded-3xl overflow-hidden border border-slate-800 bg-slate-900">
      <div className="aspect-video bg-black relative">
  <img
  src={video.thumbnail || "/video-placeholder.jpg"}
  alt={video.name}
  loading="eager"
  decoding="async"
  className="w-full h-full object-cover cursor-pointer"
  style={{ display: "block" }}
  onClick={onPlay}
/>



        {/* ✅ No extra buttons/icons for clients */}
      </div>
    </div>
  );
};
