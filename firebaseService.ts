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
  getDocs
} from "firebase/firestore";
import { ClientData, LandingPageConfig, WorkoutTemplate } from "./types";

const firebaseConfig = {
  apiKey: "AIzaSyCK3MMANVameEK39oKGONkgjpqHyTIC0OM",
  authDomain: "ilai-portal.firebaseapp.com",
  projectId: "ilai-portal",
  storageBucket: "ilai-portal.firebasestorage.app",
  messagingSenderId: "1065589317308",
  appId: "1:1065589317308:web:f8014a9558afd429b6bab9",
  measurementId: "G-6T4QLBZ5FL"
};

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

    return () => {
      unsubClients();
      unsubArchived();
      unsubLibrary();
      unsubBranding();
    };
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

/* ✅ THIS IS THE MISSING EXPORT THAT FIXES VERCEL */
export const syncService = new FirebaseSyncService();
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const storage = getStorage();

/**
 * Uploads an MP4 to Firebase Storage and returns a public URL
 */
export async function uploadVideoToFirebase(
  file: File,
  videoId: string
): Promise<string> {
  const videoRef = ref(storage, `videos/${videoId}.mp4`);

  await uploadBytes(videoRef, file);

  const downloadURL = await getDownloadURL(videoRef);

  return downloadURL;
}
