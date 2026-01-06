"use client";
import React, { useState } from "react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { /* whatever you need */ } from "../../FirebaseService";


interface VideoUploaderProps {
  category: "exercise" | "tutorial"; // type of video
  onUpload?: () => void; // optional callback after upload
}

const VideoUploader: React.FC<VideoUploaderProps> = ({ category, onUpload }) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const storage = getStorage();

  const handleUpload = async () => {
if (!videoFile) {
  alert("No video selected");
  return;
}

if (videoFile.type !== "video/mp4") {
  alert("Only MP4 videos are allowed");
  return;
}

if (!thumbnailFile) {
  alert("Select a thumbnail image");
  return;
}

      const timestamp = Date.now();
      const videoRef = ref(storage, `videoBank/${timestamp}-${videoFile.name}`);
      await uploadBytes(videoRef, videoFile);
      const videoURL = await getDownloadURL(videoRef);

      const thumbRef = ref(storage, `videoBank/thumb-${timestamp}-${thumbnailFile.name}`);
      await uploadBytes(thumbRef, thumbnailFile);
      const thumbURL = await getDownloadURL(thumbRef);

      // Save to Firestore
      const newVideo = {
        id: `vid-${timestamp}`,
        title: videoFile.name.replace(/\.\w+$/, ""), // remove extension
        category,
        videoURL,
        thumbURL,
        uploadedAt: new Date().toISOString(),
        assignedTo: [],
      };

      await syncService.addDocument("videoBank", newVideo.id, newVideo);


      alert("Video uploaded successfully!");
      setVideoFile(null);
      setThumbnailFile(null);

      if (onUpload) onUpload();

    } catch (err) {
      console.error(err);
      alert("Upload failed, check console");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-md bg-slate-800">
      <input
  type="file"
  accept="video/mp4"
  onChange={(e) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    if (file.type !== "video/mp4") {
      alert("Only MP4 videos are allowed");
      return;
    }

    console.log("Selected video:", file.name, file.type);
    setVideoFile(file);
  }}
/>

      <input type="file" accept="image/*" onChange={e => setThumbnailFile(e.target.files?.[0] || null)} />
      <button
        disabled={uploading}
        onClick={handleUpload}
        className="px-4 py-2 bg-blue-600 rounded text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {uploading ? "Uploading..." : "Upload Video + Thumbnail"}
      </button>
    </div>
  );
};

export default VideoUploader;
