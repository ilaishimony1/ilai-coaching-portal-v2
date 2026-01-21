import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { syncService } from "../firebaseService";

/* =========================
   TYPES
========================= */
export type ExplanationVideo = {
  id: string;            // Firestore doc ID
  name: string;          // ✅ SINGLE SOURCE OF TRUTH
  downloadURL: string;
  subCategory: string;
  createdAt?: any;
};

/* =========================
   READ
========================= */
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

/* =========================
   WRITE
========================= */
export async function uploadExplanationVideo(
  file: File,
  name: string,
  subCategory: string
) {
  const db = syncService.getDb();
  const storage = getStorage();

  const fileId = `v-${Date.now()}`;
  const storagePath = `videos/explanations/${fileId}.mp4`;

  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file);

  const downloadURL = await getDownloadURL(storageRef);

  await addDoc(collection(db, "explanation_videos"), {
    name,                // ✅ FIXED
    subCategory,
    downloadURL,
    storagePath,
    createdAt: serverTimestamp(),
  });

  return {
    name,
    downloadURL,
    subCategory,
  };
}
