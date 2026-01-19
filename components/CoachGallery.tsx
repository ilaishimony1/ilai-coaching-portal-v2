"use client";

import { useEffect, useState } from "react";
import {
  getExplanationVideos,
  uploadExplanationVideo,
  ExplanationVideo,
} from "../firebase/explanationVideos";

export default function CoachGallery() {
  const [explanationVideos, setExplanationVideos] =
    useState<ExplanationVideo[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const videos = await getExplanationVideos();
      setExplanationVideos(videos);
      setLoading(false);
    };

    loadData();
  }, []);

  const handleUpload = async () => {
    if (!file || !title) {
      alert("Select a video and enter a title");
      return;
    }

    setUploading(true);

    try {
      await uploadExplanationVideo(file, title);

      // Reload from Firestore (source of truth)
      const videos = await getExplanationVideos();
      setExplanationVideos(videos);

      setFile(null);
      setTitle("");
      alert("Upload successful");
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Upload section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Upload Explanation Video</h2>

        <input
          type="text"
          placeholder="Video title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border p-2 w-full"
        />

        <input
          type="file"
          accept="video/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <button
          onClick={handleUpload}
          disabled={uploading}
          className="bg-black text-white px-4 py-2 rounded"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>

      {/* Gallery section */}
      <h2 className="text-xl font-bold mb-4">Explanation Videos</h2>

      {loading && <p>Loading explanations...</p>}

      {!loading && explanationVideos.length === 0 && (
        <p>No explanation videos yet</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {explanationVideos.map((video) => (
          <div key={video.id} className="space-y-2">
            <p className="font-semibold">{video.title}</p>
            <video
              src={video.downloadURL}
              controls
              className="w-full rounded-xl"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
