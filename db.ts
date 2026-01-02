
import Dexie from 'dexie';
import type { Table } from 'dexie';

export interface VideoFile {
  id?: number;
  uid: string;
  name: string;
  blob: Blob;
  thumbnail?: string; // Base64 or Object URL for the custom thumbnail
  category: 'explanation' | 'skill';
  subCategory: string;
  uploadDate: Date;
  order: number; // For manual reordering within sub-categories
}

export interface ClientSubmission {
  id?: number;
  uid: string;
  blob: Blob;
  createdAt: Date;
}

/**
 * AcademyDatabase manages technical video storage for the coaching portal.
 * Inherits from Dexie to provide IndexedDB functionality.
 */
export class AcademyDatabase extends Dexie {
  videos!: Table<VideoFile>;
  clientSubmissions!: Table<ClientSubmission>;

  constructor() {
    super('IlaiShimonyAcademyDB');
    (this as Dexie).version(3).stores({
      videos: '++id, uid, name, category, subCategory, order',
      clientSubmissions: '++id, uid'
    });
  }
}

export const db = new AcademyDatabase();
