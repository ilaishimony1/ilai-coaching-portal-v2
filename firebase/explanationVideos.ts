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
  name: string;          // TITLE used by AcademyManager
  downloadURL: string;   // VIDEO SRC
  subCategory: string;   // REQUIRED for filtering
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
  title: string,
  subCategory: string
) {
  const db = syncService.getDb();
  const storage = getStorage();

  // 1️⃣ Stable ID (same pattern as skills)
  const fileId = `v-${Date.now()}`;

  // 2️⃣ Storage path
  const storagePath = `videos/explanations/${fileId}.mp4`;

  // 3️⃣ Upload video
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file);

  // 4️⃣ Get playable URL
  const downloadURL = await getDownloadURL(storageRef);

  // 5️⃣ Save Firestore document
 await addDoc(collection(db, "explanation_videos"), {
  title,
  subCategory,          // 🔥 THIS IS THE FIX
  downloadURL,
  storagePath,
  createdAt: serverTimestamp(),
});


  return {
    name: title,
    downloadURL,
    subCategory,
  };
}
