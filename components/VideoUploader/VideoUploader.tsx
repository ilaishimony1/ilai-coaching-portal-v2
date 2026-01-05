"use client";
import React, { useState } from "react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { AppProvider, useApp } from "../AppContext"; // for syncing if needed
import { syncService } from "../FirebaseService"; // adjust path

interface VideoUploaderProps {
  clientId: string;        // the client for whom we upload
  workoutId?: string;      // optional, for linking to specific workout
}

const VideoUploader: React.FC<VideoUploaderProps> = ({ clientId, workoutId }) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const storage = getStorage();

  const handleUpload = async () => {
    if (!videoFile || !thumbnailFile) return alert("Select both video and thumbnail");

    setUploading(true);
    try {
      // 1️⃣ Upload video
      const videoRef = ref(storage, `videos/${clientId}/${Date.now()}-${videoFile.name}`);
      await uploadBytes(videoRef, videoFile);
      const videoURL = await getDownloadURL(videoRef);

      // 2️⃣ Upload thumbnail
      const thumbRef = ref(storage, `videos/${clientId}/thumb-${Date.now()}-${thumbnailFile.name}`);
      await uploadBytes(thumbRef, thumbnailFile);
      const thumbURL = await getDownloadURL(thumbRef);

      // 3️⃣ Save URLs to Firestore
      await syncService.updateDocument("clients", clientId, {
        videos: [
          ...(workoutId ? [] : []), // we’ll handle workouts later
          { videoURL, thumbURL, workoutId: workoutId || null, uploadedAt: new Date().toISOString() }
        ],
      });

      alert("Upload successful!");
      setVideoFile(null);
      setThumbnailFile(null);
    } catch (e) {
      console.error("Upload error:", e);
      alert("Upload failed, check console");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-md bg-slate-800">
      <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
      <input type="file" accept="image/*" onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)} />
      <button
        disabled={uploading}
        onClick={handleUpload}
        className="px-4 py-2 bg-blue-600 rounded text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {uploading ? `Uploading ${progress}%` : "Upload Video + Thumbnail"}
      </button>
    </div>
  );
};

export default VideoUploader;
