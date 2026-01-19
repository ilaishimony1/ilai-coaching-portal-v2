import { collection, getDocs } from "firebase/firestore";
import { syncService } from "../firebaseService";

export type ExplanationVideo = {
  id: string;
  title: string;
  downloadURL: string;
};

export async function getExplanationVideos(): Promise<ExplanationVideo[]> {
  const db = syncService.getDb();

  const snapshot = await getDocs(
    collection(db, "explanation_videos")
  );

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<ExplanationVideo, "id">),
  }));
}
