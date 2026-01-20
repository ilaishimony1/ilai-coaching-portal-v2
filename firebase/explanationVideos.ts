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
  id: string;              // Firestore doc ID (REQUIRED)
  title: string;
  downloadURL: string;
  storagePath: string;
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
    id: doc.id, // 🔥 THIS IS THE KEY FIX
    ...(doc.data() as Omit<ExplanationVideo, "id">),
  }));
}

/* =========================
   WRITE
========================= */
export async function uploadExplanationVideo(
  file: File,
  title: string
) {
  const db = syncService.getDb();
  const storage = getStorage();

  // 1️⃣ Generate stable unique ID
  const fileId = `v-${Date.now()}`;

  // 2️⃣ Storage path (KEEP THIS — works with your rules)
  const storagePath = `videos/explanations/${fileId}.mp4`;

  // 3️⃣ Upload to Firebase Storage
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file);

  // 4️⃣ Get download URL
  const downloadURL = await getDownloadURL(storageRef);

  // 5️⃣ Save Firestore document
  await addDoc(collection(db, "explanation_videos"), {
    title,
    downloadURL,
    storagePath,
    createdAt: serverTimestamp(),
  });

  // Optional return (useful later)
  return {
    title,
    downloadURL,
    storagePath,
  };
}
