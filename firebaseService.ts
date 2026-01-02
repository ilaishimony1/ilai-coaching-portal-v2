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
    try {
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      this.db = getFirestore(app);
      
      enableNetwork(this.db).catch(err => console.warn("Network initialization warning:", err));
      
      console.log("🚀 Firebase Engine Initialized");
    } catch (e) {
      console.error("❌ Firebase Initialization Failed:", e);
      throw e;
    }
  }

  /**
   * Verified connectivity test. 
   * Attempts to read a restricted collection to check if Rules are active.
   */
  async testConnection() {
    try {
      const q = query(collection(this.db, "clients"), limit(1));
      await getDocs(q);
      return { success: true };
    } catch (e: any) {
      console.error("🚨 CONNECTION TEST FAILED:", e);
      return { 
        success: false, 
        error: e.code === 'permission-denied' 
          ? "PERMISSION DENIED: Update your Firestore Rules to 'allow read, write: if true;'" 
          : e.message 
      };
    }
  }

  listenToStore(onUpdate: (data: { type: string, payload: any }) => void, onError: (err: any) => void) {
    console.log("🔭 Starting Cloud Listeners...");
    
    const unsubClients = onSnapshot(collection(this.db, "clients"), (snapshot) => {
      const clients = snapshot.docs.map(d => ({ ...d.data() as ClientData, id: d.id }));
      onUpdate({ type: 'clients', payload: clients });
    }, (err) => {
      console.error("Cloud Listener Error (Clients):", err);
      onError(err);
    });

    const unsubArchived = onSnapshot(collection(this.db, "archived_clients"), (snapshot) => {
      const archived = snapshot.docs.map(d => ({ ...d.data() as ClientData, id: d.id }));
      onUpdate({ type: 'archived', payload: archived });
    }, onError);

    const unsubLibrary = onSnapshot(collection(this.db, "master_library"), (snapshot) => {
      const templates = snapshot.docs.map(d => ({ ...d.data() as WorkoutTemplate, id: d.id }));
      onUpdate({ type: 'library', payload: templates });
    }, onError);

    const unsubBranding = onSnapshot(doc(this.db, "settings", "branding"), (snapshot) => {
      if (snapshot.exists()) {
        onUpdate({ type: 'config', payload: snapshot.data() as LandingPageConfig });
      }
    }, onError);

    return () => {
      unsubClients();
      unsubArchived();
      unsubLibrary();
      unsubBranding();
    };
  }

  async updateDocument(collectionName: string, id: string, data: any) {
    if (!id) throw new Error("Document ID missing.");
    const ref = doc(this.db, collectionName, id);
    
    try {
      // Clean undefined values which Firestore hates
      const cleanData = JSON.parse(JSON.stringify(data));
      
      await setDoc(ref, { ...cleanData, lastSync: serverTimestamp() }, { merge: true });
      await waitForPendingWrites(this.db);
      
      console.log(`✅ Cloud Saved: ${collectionName}/${id}`);
      return true;
    } catch (e: any) {
      console.error(`❌ Cloud Save Failed:`, e);
      throw new Error(e.code === 'permission-denied' 
        ? "Access Denied: Check Firestore Security Rules" 
        : `Save Error: ${e.message}`);
    }
  }

  async archiveClient(client: ClientData) {
    if (!client.id) return;
    const batch = writeBatch(this.db);
    batch.delete(doc(this.db, "clients", client.id));
    batch.set(doc(this.db, "archived_clients", client.id), { ...client, lastSync: serverTimestamp() });
    await batch.commit();
  }

  async restoreClient(client: ClientData) {
    if (!client.id) return;
    const batch = writeBatch(this.db);
    batch.delete(doc(this.db, "archived_clients", client.id));
    batch.set(doc(this.db, "clients", client.id), { ...client, lastSync: serverTimestamp() });
    await batch.commit();
  }

  async deletePermanent(clientId: string, fromArchive: boolean = true) {
    const col = fromArchive ? "archived_clients" : "clients";
    await deleteDoc(doc(this.db, col, clientId));
  }

  async pushFullSync(clients: ClientData[], config: LandingPageConfig, library: WorkoutTemplate[]) {
    try {
      const batch = writeBatch(this.db);
      
      clients.forEach(c => {
        if (c.id) {
          const cleanClient = JSON.parse(JSON.stringify(c));
          batch.set(doc(this.db, "clients", c.id), { ...cleanClient, lastSync: serverTimestamp() }, { merge: true });
        }
      });
      
      library.forEach(t => {
        if (t.id) {
          const cleanTmpl = JSON.parse(JSON.stringify(t));
          batch.set(doc(this.db, "master_library", t.id), { ...cleanTmpl, lastSync: serverTimestamp() }, { merge: true });
        }
      });

      const cleanConfig = JSON.parse(JSON.stringify(config));
      batch.set(doc(this.db, "settings", "branding"), { ...cleanConfig, lastSync: serverTimestamp() }, { merge: true });
      
      await batch.commit();
      await waitForPendingWrites(this.db);
      return true;
    } catch (e: any) {
      console.error("Full Sync Error:", e);
      throw e;
    }
  }
}