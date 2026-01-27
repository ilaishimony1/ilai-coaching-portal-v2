import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  deleteDoc,
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
  id: string;
  uid: string;
  name: string;
  downloadURL: string;

  // 👇 ADD / CONFIRM THESE
  thumbnailURL?: string;
  thumbnailPath?: string;

  storagePath?: string;
  subCategory: string;
  createdAt?: any;
};




/* =========================
   READ
========================= */

// Get ALL explanation videos (coach gallery)
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

// Get assigned explanation VIDEO UIDs for a client
export async function getAssignedExplanationUids(
  clientId: string
): Promise<string[]> {
  const db = syncService.getDb();

  const q = query(
    collection(db, "explanation_assignments"),
    where("clientId", "==", clientId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => doc.data().videoUid);
}

/* =========================
   WRITE
========================= */

// Upload explanation video (coach)
 export async function uploadExplanationVideo(
  videoFile: File,
  thumbnailFile: File,
  name: string,
  subCategory: string
) {
  if (!videoFile) throw new Error("Missing video file");
  if (!thumbnailFile) throw new Error("Missing thumbnail file");
  if (!name.trim()) throw new Error("Missing name");

  const db = syncService.getDb();
  const storage = getStorage();

  const uid = `v-${Date.now()}`;

  const videoPath = `videos/explanations/${uid}.mp4`;
  const thumbnailPath = `videos/explanations/${uid}.jpg`;

  // 🎥 Upload video
  const videoRef = ref(storage, videoPath);
  await uploadBytes(videoRef, videoFile);
  const downloadURL = await getDownloadURL(videoRef);

  // 🖼 Upload thumbnail
  const thumbnailRef = ref(storage, thumbnailPath);
  await uploadBytes(thumbnailRef, thumbnailFile);
  const thumbnailURL = await getDownloadURL(thumbnailRef);

  // 📄 Firestore document
  await addDoc(collection(db, "explanation_videos"), {
    uid,
    name,
    subCategory,
    downloadURL,
    thumbnailURL,
    storagePath: videoPath,
    thumbnailPath,
    createdAt: serverTimestamp(),
  });

  return {
    uid,
    name,
    subCategory,
    downloadURL,
    thumbnailURL,
  };
}



// Assign explanation to a client
export async function assignExplanationToClient(
  videoUid: string,
  clientId: string
) {
  const db = syncService.getDb();

  await addDoc(collection(db, "explanation_assignments"), {
    videoUid,
    clientId,
    assignedAt: serverTimestamp(),
  });
}


export async function unassignExplanationFromClient(
  videoUid: string,
  clientId: string
) {
  const db = syncService.getDb();

  const q = query(
    collection(db, "explanation_assignments"),
    where("videoUid", "==", videoUid),
    where("clientId", "==", clientId)
  );

  const snapshot = await getDocs(q);

  for (const docSnap of snapshot.docs) {
    await deleteDoc(docSnap.ref);
  }
}
