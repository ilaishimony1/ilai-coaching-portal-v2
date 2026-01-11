import { useEffect, useState } from "react";
import { resolveAcademyVideoUrl } from "../firebase"; // adjust path if needed

interface ExerciseVideoProps {
  videoId?: string;
}

export function ExerciseVideo({ videoId }: ExerciseVideoProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!videoId) {
      setVideoUrl(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    resolveAcademyVideoUrl(videoId).then(url => {
      if (isMounted) {
        setVideoUrl(url);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [videoId]);

  if (!videoId) return null;
  if (loading) return <div style={{ opacity: 0.6 }}>Loading video…</div>;
  if (!videoUrl) return null;

  return (
    <video
      src={videoUrl}
      controls
      playsInline
      preload="metadata"
      style={{
        width: "100%",
        maxHeight: 400,
        borderRadius: 8,
        background: "#000"
      }}
    />
  );
}
