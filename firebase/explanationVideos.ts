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

export type ExplanationVideo = {
  id: string;
  title: string;
  downloadURL: string;
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
  title: string
) {
  const db = syncService.getDb();
  const storage = getStorage();

  // 1️⃣ Generate unique filename
  const fileId = crypto.randomUUID();
  const storagePath = `videos/explanations/${fileId}.mp4`;

  // 2️⃣ Upload video to Firebase Storage
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file);

  // 3️⃣ Get public download URL
  const downloadURL = await getDownloadURL(storageRef);

  // 4️⃣ Save metadata in Firestore
  await addDoc(collection(db, "explanation_videos"), {
    title,
    downloadURL,
    storagePath,
    createdAt: serverTimestamp(),
  });
}
