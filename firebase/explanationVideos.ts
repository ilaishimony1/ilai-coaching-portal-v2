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
  writeBatch,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";

import { syncService } from "../firebaseService";


import {
  getStorage,
  ref,
  uploadBytes,
  uploadBytesResumable,
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
  order?: number;
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

 return snapshot.docs.map((doc) => {
  const data = doc.data() as ExplanationVideo;
  return {
    id: doc.id,
    uid: data.uid,
    name: data.name,
    downloadURL: data.downloadURL,
    thumbnailURL: data.thumbnailURL || null,
    subCategory: data.subCategory,
    order: data.order ?? undefined,
    createdAt: data.createdAt,
  };
}).sort((a, b) => {
  if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
  if (a.order !== undefined) return -1;
  if (b.order !== undefined) return 1;
  return 0;
});

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
  thumbnailFile: File | null,
  name: string,
  subCategory: string
) {
  const db = syncService.getDb();
  const uid = `v-${Date.now()}`;

  console.log("▶️ START upload", uid);

  /* VIDEO */
const videoRef = ref(storage, `videos/explanations/${uid}.mp4`);
await new Promise<void>((resolve, reject) => {
  const uploadTask = uploadBytesResumable(videoRef, videoFile, {
    contentType: videoFile.type,
  });

  uploadTask.on(
    "state_changed",
    (snapshot) => {
      const progress =
        (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      console.log(`📤 Upload ${progress.toFixed(1)}%`);
    },
    (error) => reject(error),
    () => resolve()
  );
});

const downloadURL = await getDownloadURL(videoRef);

  /* THUMBNAIL (optional) */
  let thumbnailURL: string | null = null;
  if (thumbnailFile) {
    if (!thumbnailFile.type.startsWith("image/")) {
      throw new Error("Thumbnail must be an image file");
    }
    const thumbRef = ref(storage, `videos/explanations/${uid}.jpg`);
    await uploadBytes(thumbRef, thumbnailFile, { contentType: thumbnailFile.type });
    thumbnailURL = await getDownloadURL(thumbRef);
  }

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


/* =========================
   REORDER
========================= */
export async function updateExplanationVideoOrders(videos: { uid: string; order: number }[]) {
  const db = syncService.getDb();
  const batch = writeBatch(db);
  videos.forEach(({ uid, order }) => {
    batch.update(doc(db, "explanation_videos", uid), { order });
  });
  await batch.commit();
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

  await updateDoc(doc(db, "clients", clientId), {
    unseenVideoUids: arrayUnion(videoUid),
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

  await updateDoc(doc(db, "clients", clientId), {
    unseenVideoUids: arrayRemove(videoUid),
  });
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

/* =========================
   UPDATE NAME
========================= */
export async function updateExplanationVideoName(uid: string, name: string) {
  const db = syncService.getDb();
  await updateDoc(doc(db, "explanation_videos", uid), { name });
}

/* =========================
   DELETE
========================= */
export async function deleteExplanationVideo(uid: string) {
  const db = syncService.getDb();

  // Delete the video document
  await deleteDoc(doc(db, "explanation_videos", uid));

  // Delete all client assignments for this video
  const q = query(
    collection(db, "explanation_assignments"),
    where("videoUid", "==", uid)
  );
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

export const uploadExplanationThumbnail = async (
  videoUid: string,
  file: File
) => {
  const db = syncService.getDb(); // 👈 REQUIRED

  const storageRef = ref(storage, `explanation_thumbnails/${videoUid}`);
  await uploadBytes(storageRef, file, {
  contentType: file.type,
});
  const downloadURL = await getDownloadURL(storageRef);

  const videoDocRef = doc(db, "explanation_videos", videoUid); // 👈 FIXED NAME
  await updateDoc(videoDocRef, { thumbnailURL: downloadURL });

  return downloadURL;
};