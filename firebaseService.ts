// ===============================
// Firebase Core Imports
// ===============================
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc,
  collection,
  writeBatch,
  serverTimestamp,
  deleteDoc,
  enableNetwork,
  waitForPendingWrites,
  query,
  limit,
  getDocs,
  getDoc,
  addDoc
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { ClientData, LandingPageConfig, WorkoutTemplate, WeeklyCheckIn } from "./types";

// ===============================
// Firebase Config
// ===============================
const firebaseConfig = {
  apiKey: "AIzaSyCK3MMANVameEK39oKGONkgjpqHyTIC0OM",
  authDomain: "ilai-portal.firebaseapp.com",
  projectId: "ilai-portal",
  storageBucket: "ilai-portal.firebasestorage.app",
  messagingSenderId: "1065589317308",
  appId: "1:1065589317308:web:f8014a9558afd429b6bab9",
  measurementId: "G-6T4QLBZ5FL"
};

// ===============================
// Firebase Sync Service
// ===============================
export class FirebaseSyncService {
  private db;

  constructor() {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    this.db = getFirestore(app);

    enableNetwork(this.db).catch(err =>
      console.warn("Network initialization warning:", err)
    );

    console.log("🚀 Firebase Engine Initialized");
  }

  // 🔑 Expose Firestore instance
  getDb() {
    return this.db;
  }

  async testConnection() {
    try {
      const q = query(collection(this.db, "clients"), limit(1));
      await getDocs(q);
      return { success: true };
    } catch (e: any) {
      return {
        success: false,
        error:
          e.code === "permission-denied"
            ? "PERMISSION DENIED: Check Firestore Rules"
            : e.message
      };
    }
  }

  listenToStore(
    onUpdate: (data: { type: string; payload: any }) => void,
    onError: (err: any) => void
  ) {
    const unsubClients = onSnapshot(
      collection(this.db, "clients"),
      snap => {
        const clients = snap.docs.map(d => ({
          ...(d.data() as ClientData),
          id: d.id
        }));
        onUpdate({ type: "clients", payload: clients });
      },
      onError
    );

    const unsubArchived = onSnapshot(
      collection(this.db, "archived_clients"),
      snap => {
        const archived = snap.docs.map(d => ({
          ...(d.data() as ClientData),
          id: d.id
        }));
        onUpdate({ type: "archived", payload: archived });
      },
      onError
    );

    const unsubLibrary = onSnapshot(
      collection(this.db, "master_library"),
      snap => {
        const templates = snap.docs.map(d => ({
          ...(d.data() as WorkoutTemplate),
          id: d.id
        }));
        onUpdate({ type: "library", payload: templates });
      },
      onError
    );

    const unsubBranding = onSnapshot(
      doc(this.db, "settings", "branding"),
      snap => {
        if (snap.exists()) {
          onUpdate({
            type: "config",
            payload: snap.data() as LandingPageConfig
          });
        }
      },
      onError
    );

    const unsubCheckIns = onSnapshot(
      collection(this.db, "check_ins"),
      snap => {
        const checkIns = snap.docs.map(d => ({
          ...(d.data() as WeeklyCheckIn),
          id: d.id
        }));
        onUpdate({ type: "checkIns", payload: checkIns });
      },
      (err) => {
        // Isolated — don't let check_ins permission errors break the main app
        console.warn("check_ins listener:", err.message);
        onUpdate({ type: "checkIns", payload: [] });
      }
    );

    return () => {
      unsubClients();
      unsubArchived();
      unsubLibrary();
      unsubBranding();
      unsubCheckIns();
    };
  }

  async deleteDocument(collectionName: string, id: string) {
    await deleteDoc(doc(this.db, collectionName, id));
  }

  async updateDocument(collectionName: string, id: string, data: any) {
    const ref = doc(this.db, collectionName, id);
    const cleanData = JSON.parse(JSON.stringify(data));

    await setDoc(
      ref,
      { ...cleanData, lastSync: serverTimestamp() },
      { merge: true }
    );

    await waitForPendingWrites(this.db);
  }

  async archiveClient(client: ClientData) {
    if (!client.id) return;

    const batch = writeBatch(this.db);
    batch.delete(doc(this.db, "clients", client.id));
    batch.set(doc(this.db, "archived_clients", client.id), {
      ...client,
      lastSync: serverTimestamp()
    });

    await batch.commit();
  }

  async restoreClient(client: ClientData) {
    if (!client.id) return;

    const batch = writeBatch(this.db);
    batch.delete(doc(this.db, "archived_clients", client.id));
    batch.set(doc(this.db, "clients", client.id), {
      ...client,
      lastSync: serverTimestamp()
    });

    await batch.commit();
  }

  async submitCheckIn(checkIn: Omit<WeeklyCheckIn, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(this.db, "check_ins"), {
      ...checkIn,
      lastSync: serverTimestamp()
    });
    return docRef.id;
  }

  async markCheckInRead(id: string): Promise<void> {
    await this.updateDocument("check_ins", id, { readByCoach: true });
  }

  async deletePermanent(clientId: string, fromArchive = true) {
    const col = fromArchive ? "archived_clients" : "clients";
    await deleteDoc(doc(this.db, col, clientId));
  }

  async pushFullSync(
    clients: ClientData[],
    config: LandingPageConfig,
    library: WorkoutTemplate[]
  ) {
    const batch = writeBatch(this.db);

    clients.forEach(c => {
      if (c.id) {
        batch.set(
          doc(this.db, "clients", c.id),
          { ...JSON.parse(JSON.stringify(c)), lastSync: serverTimestamp() },
          { merge: true }
        );
      }
    });

    library.forEach(t => {
      if (t.id) {
        batch.set(
          doc(this.db, "master_library", t.id),
          { ...JSON.parse(JSON.stringify(t)), lastSync: serverTimestamp() },
          { merge: true }
        );
      }
    });

    batch.set(
      doc(this.db, "settings", "branding"),
      { ...JSON.parse(JSON.stringify(config)), lastSync: serverTimestamp() },
      { merge: true }
    );

    await batch.commit();
    await waitForPendingWrites(this.db);
  }
}

// ===============================
// Singleton Export (IMPORTANT)
// ===============================
export const syncService = new FirebaseSyncService();

// ===============================
// Firebase Storage (Videos)
// ===============================
const storage = getStorage(getApp());

export async function uploadVideoToFirebase(
  file: File,
  videoId: string
): Promise<string> {
  const videoRef = ref(storage, `academy/${videoId}.mp4`);

  await uploadBytes(videoRef, file);
  return await getDownloadURL(videoRef);
}

// ===============================
// 🔥 Academy Video Resolver (KEY FIX)
// ===============================
export async function resolveAcademyVideoUrl(
  videoId: string
): Promise<string> {
  const videoRef = ref(storage, `academy/${videoId}.mp4`);
  return await getDownloadURL(videoRef);
}