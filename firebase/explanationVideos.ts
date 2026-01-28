import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  deleteDoc,
  serverTimestamp,
  doc,
  updateDoc,
  setDoc,
} from "firebase/firestore";

import { syncService } from "../firebaseService";


import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { getApp } from "firebase/app";

const storage = getStorage(getApp());


/* =========================
   TYPES
========================= */
export type ExplanationVideo = {
  id?: string; // 👈 optional
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

  try {
    console.log("📡 Fetching explanation_videos...");

    const snapshot = await getDocs(
      collection(db, "explanation_videos")
    );

    console.log("📦 Snapshot size:", snapshot.size);

    snapshot.docs.forEach(doc => {
      console.log("📄 DOC:", doc.id, doc.data());
    });

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<ExplanationVideo, "id">),
    }));
  } catch (err) {
    console.error("❌ READ FAILED:", err);
    throw err;
  }
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
  const db = syncService.getDb();
  const uid = `v-${Date.now()}`;

  console.log("▶️ START upload", uid);

  /* VIDEO */
  const videoRef = ref(storage, `videos/explanations/${uid}.mp4`);
  await uploadBytes(videoRef, videoFile);
  const downloadURL = await getDownloadURL(videoRef);

  /* THUMBNAIL */
  if (!thumbnailFile.type.startsWith("image/")) {
    throw new Error("Thumbnail must be an image file");
  }

  const thumbRef = ref(storage, `videos/explanations/${uid}.jpg`);
  await uploadBytes(thumbRef, thumbnailFile);
  const thumbnailURL = await getDownloadURL(thumbRef);

  /* FIRESTORE (FIXED ID) */
  const videoDocRef = doc(db, "explanation_videos", uid);

  await setDoc(videoDocRef, {
    uid,
    name,
    subCategory,
    downloadURL,
    thumbnailURL,
    createdAt: serverTimestamp(),
  });

  console.log("🎉 DONE");
  return { success: true };
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
export async function getAssignedExplanationUids(
  clientId: string
): Promise<string[]> {
  const db = syncService.getDb();

  const q = query(
    collection(db, "explanation_assignments"),
    where("clientId", "==", clientId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => d.data().videoUid);
}

export const uploadExplanationThumbnail = async (
  videoUid: string,
  file: File
) => {
  const db = syncService.getDb(); // 👈 REQUIRED

  const storageRef = ref(storage, `explanation_thumbnails/${videoUid}`);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);

  const videoDocRef = doc(db, "explanation_videos", videoUid); // 👈 FIXED NAME
  await updateDoc(videoDocRef, { thumbnailURL: downloadURL });

  return downloadURL;
};
