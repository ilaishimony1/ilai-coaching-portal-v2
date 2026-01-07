import Dexie from "dexie";
import type { Table } from "dexie";

/**
 * Single source of truth for videos.
 * Firebase stores the actual video file.
 * IndexedDB (Dexie) stores metadata + URL.
 */
export interface VideoFile {
  id?: number;
  uid: string;
  name: string;
  url: string; // 🔥 Firebase Storage download URL
  category: "explanation" | "skill";
  subCategory: string;
  uploadDate: Date;
  order: number;
  thumbnail?: string;
}

export class AcademyDatabase extends Dexie {
  videos!: Table<VideoFile>;

  constructor() {
    super("IlaiShimonyAcademyDB");

    // Version bump required because schema changed
    this.version(4).stores({
      videos: "++id, uid, name, category, subCategory, order"
    });
  }
}

export const db = new AcademyDatabase();
