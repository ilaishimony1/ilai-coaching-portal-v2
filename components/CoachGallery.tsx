"use client";

import { useEffect, useState } from "react";
import {
  getExplanationVideos,
  uploadExplanationVideo,
  ExplanationVideo,
} from "../firebase/explanationVideos";

export default function CoachGallery() {
  const [explanationVideos, setExplanationVideos] = useState<ExplanationVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");

  async function loadVideos() {
    setLoading(true);
    const videos = await getExplanationVideos();
    setExplanationVideos(videos);
    setLoading(false);
  }

  useEffect(() => {
    loadVideos();
  }, []);

  async function handleUpload() {
    if (!file || !title) {
      alert("Select a file and enter a title");
      return;
    }

    setUploading(true);

    try {
      await uploadExplanationVideo(file, title, "general");
      setFile(null);
      setTitle("");
      await loadVideos();
      alert("Upload successful");
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    }

    setUploading(false);
  }

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold">Explanation Videos</h2>
<p className="text-sm text-red-500">
  UPLOAD TEST BUILD
</p>

      {/* 🔼 TEMP UPLOAD UI */}
      <div className="space-y-2 border p-4 rounded">
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
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        <button
          onClick={handleUpload}
          disabled={uploading}
          className="px-4 py-2 bg-black text-white rounded"
        >
          {uploading ? "Uploading..." : "Upload Video"}
        </button>
      </div>

      {/* 📺 GALLERY */}
      {loading && <p>Loading explanations...</p>}

      {!loading && explanationVideos.length === 0 && (
        <p>No explanation videos yet</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {explanationVideos.map((video) => (
          <div key={video.id} className="space-y-2">
            <p className="font-semibold">{video.name}</p>
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
