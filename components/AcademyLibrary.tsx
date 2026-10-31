import React, { useState, useEffect, useMemo, useRef } from "react";
import { Play, Search, X, Lock } from "lucide-react";
import { VideoFile } from "../db";
import { ClientData } from "../types";
import { getAssignedExplanationUids } from "../firebase/explanationVideos";
import { getExplanationVideos } from "../firebase/explanationVideos";
import { doc, updateDoc } from "firebase/firestore";
import { syncService } from "../firebaseService";

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

  if (client.unseenVideoUids?.length) {
    updateDoc(doc(syncService.getDb(), "clients", client.id), {
      unseenVideoUids: [],
    }).catch(() => {});
  }
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
      thumbnail: v.thumbnailURL || "/video-placeholder.jpg",
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
    <div className="flex flex-col gap-3.5">
      <h2 className="text-2xl font-extrabold">Explanation videos</h2>

      <label className="flex items-center gap-2.5 h-12 rounded-[14px] border-[1.5px] border-edge bg-field px-3.5 text-muted focus-within:border-accent transition-colors">
        <Search size={18} className="shrink-0" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search…"
          aria-label="Search videos"
          className="flex-1 min-w-0 bg-transparent border-0 text-ink text-base font-medium outline-none"
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {!assignmentsLoaded ? (
          <p className="col-span-full text-center text-muted text-[15px] py-10">Loading videos…</p>
        ) : assignedVideos.length === 0 ? (
          <div className="col-span-full py-16 text-center border-[1.5px] border-dashed border-tick rounded-[18px]">
            <Lock size={36} className="mx-auto text-muted mb-3" />
            <p className="text-muted text-[15px] font-semibold">No videos for you yet</p>
          </div>
        ) : filteredVideos.length === 0 ? (
          <p className="col-span-full text-center text-muted text-[15px] py-10">No videos match that search</p>
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

          <div className="relative w-full max-w-5xl bg-black rounded-2xl overflow-hidden mx-4">
            <button
              onClick={closeVideo}
              aria-label="Close video"
              className="absolute top-3 right-3 z-10 w-11 h-11 flex items-center justify-center bg-black/60 rounded-full text-white"
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
    <button
      type="button"
      onClick={onPlay}
      aria-label={`Play: ${video.name}`}
      className="h-[180px] rounded-2xl overflow-hidden border border-edge bg-black p-0 block w-full"
    >
      <img
        src={video.thumbnail || "/video-placeholder.jpg"}
        alt={video.name}
        loading="eager"
        decoding="async"
        className="w-full h-full object-cover block"
      />
    </button>
  );
};
