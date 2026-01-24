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
  thumbnail?: string;
  storagePath?: string;
  thumbnailPath?: string;
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
  name: string,
  subCategory: string
) {
  const db = syncService.getDb();
  const storage = getStorage();

  const uid = `v-${Date.now()}`;
  const storagePath = `videos/explanations/${uid}.mp4`;

  const videoRef = ref(storage, storagePath);
  await uploadBytes(videoRef, videoFile);

  const downloadURL = await getDownloadURL(videoRef);

  await addDoc(collection(db, "explanation_videos"), {
    uid,
    name,
    subCategory,
    downloadURL,
    storagePath,
    createdAt: serverTimestamp(),
  });

  return { uid, name, subCategory, downloadURL };
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
