// ===============================
// Skill Videos – Firestore Source of Truth
// ===============================

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  writeBatch,
  doc,
} from "firebase/firestore";

import { syncService } from "../firebaseService";

// 🔥 Get Firestore instance from the singleton
const db = syncService.getDb();

// ===============================
// Types
// ===============================
export interface SkillVideo {
  id?: string;
  uid: string;
  name: string;
  url: string;
  category: "skill";
  subCategory: string;
  order: number;
  createdAt?: any;
}

// ===============================
// Collection Reference
// ===============================
const skillRef = collection(db, "skill_videos");

// ===============================
// Create Skill Video
// ===============================
export const createSkillVideo = async (
  video: Omit<SkillVideo, "id" | "createdAt">
) => {
  await addDoc(skillRef, {
    ...video,
    category: "skill",
    createdAt: serverTimestamp(),
  });
};

// ===============================
// Update Order of Multiple Skill Videos (batch write)
// ===============================
export const updateSkillVideoOrders = async (videos: { id: string; order: number }[]) => {
  const batch = writeBatch(db);
  videos.forEach(({ id, order }) => {
    batch.update(doc(db, "skill_videos", id), { order });
  });
  await batch.commit();
};

// ===============================
// Delete Skill Video
// ===============================
export const deleteSkillVideo = async (id: string) => {
  await deleteDoc(doc(db, "skill_videos", id));
};

// ===============================
// Update Skill Video (name etc.)
// ===============================
export const updateSkillVideo = async (id: string, updates: { name?: string }) => {
  await updateDoc(doc(db, "skill_videos", id), updates);
};

// ===============================
// Get Skill Videos
// ===============================
export const getSkillVideos = async (): Promise<SkillVideo[]> => {
  const q = query(skillRef, orderBy("order", "asc"));
  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as SkillVideo),
  }));
};