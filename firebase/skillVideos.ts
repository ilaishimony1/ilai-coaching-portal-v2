import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy
} from "firebase/firestore";

export interface SkillVideo {
  id?: string;
  uid: string;
  name: string;
  url: string;
  category: "skill";
  subCategory: string;
  order: number;
  createdAt: any;
}

const skillRef = collection(db, "skill_videos");

export const createSkillVideo = async (video: SkillVideo) => {
  await addDoc(skillRef, {
    ...video,
    createdAt: serverTimestamp(),
  });
};

export const getSkillVideos = async (): Promise<SkillVideo[]> => {
  const q = query(skillRef, orderBy("order", "asc"));
  const snap = await getDocs(q);

  return snap.docs.map(d => ({
    id: d.id,
    ...(d.data() as SkillVideo),
  }));
};
