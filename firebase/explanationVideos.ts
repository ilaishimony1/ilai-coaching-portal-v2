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
  uid: string;           // 🔥 ASSIGNMENT ID (REQUIRED)
  name: string;
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

  // 🔥 SINGLE SOURCE OF TRUTH
  const uid = `v-${Date.now()}`;
  const storagePath = `videos/explanations/${uid}.mp4`;

  // Upload to storage
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file);

  // Get playable URL
  const downloadURL = await getDownloadURL(storageRef);

  // 🔥 SAVE uid TO FIRESTORE
  await addDoc(collection(db, "explanation_videos"), {
    uid,                 // ✅ THIS WAS MISSING
    name,
    subCategory,
    downloadURL,
    storagePath,
    createdAt: serverTimestamp(),
  });

  return {
    uid,
    name,
    downloadURL,
    subCategory,
  };
}
