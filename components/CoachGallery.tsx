"use client";

import { useEffect, useState } from "react";
import {
  getExplanationVideos,
  ExplanationVideo,
} from "../firebase/explanationVideos";

export default function CoachGallery() {
  const [explanationVideos, setExplanationVideos] = useState<ExplanationVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const videos = await getExplanationVideos();
      setExplanationVideos(videos);
      setLoading(false);
    };

    loadData();
  }, []);

  return (
    <div className="space-y-8">
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
