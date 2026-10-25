import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { ClientData, LandingPageConfig, WorkoutTemplate, WeeklyCheckIn, WorkoutLog } from './types';
import { TEST_CLIENT, INITIAL_CONFIG, COACH_EMAIL } from './constants';
import { FirebaseSyncService } from './firebaseService';

interface AppContextType {
  clients: ClientData[];
  setClients: React.Dispatch<React.SetStateAction<ClientData[]>>;
  archivedClients: ClientData[];
  setArchivedClients: React.Dispatch<React.SetStateAction<ClientData[]>>;
  savedWorkouts: WorkoutTemplate[];
  setSavedWorkouts: React.Dispatch<React.SetStateAction<WorkoutTemplate[]>>;
  landingConfig: LandingPageConfig;
  setLandingConfig: React.Dispatch<React.SetStateAction<LandingPageConfig>>;
  syncService: FirebaseSyncService;
  cloudSync: {
    isConnected: boolean;
    isSyncing: boolean;
    forceSync: () => Promise<void>;
  };
  cloudError: string | null;
  lastServerUpdate: Date | null;
  hasInitialCloudSync: boolean;
  checkIns: WeeklyCheckIn[];
  unreadCheckInsCount: number;
  submitCheckIn: (checkIn: Omit<WeeklyCheckIn, 'id'>) => Promise<void>;
  markCheckInRead: (id: string) => Promise<void>;
  workoutLogs: WorkoutLog[];
  unreadWorkoutLogsCount: number;
  submitWorkoutLog: (log: Omit<WorkoutLog, 'id'>) => Promise<void>;
  markWorkoutLogRead: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
const [clients, setClients] = useState<ClientData[] | null>(null);
  const [archivedClients, setArchivedClients] = useState<ClientData[]>([]);
  const [savedWorkouts, setSavedWorkouts] = useState<WorkoutTemplate[]>([]);
  const [landingConfig, setLandingConfig] = useState<LandingPageConfig>(INITIAL_CONFIG);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [lastServerUpdate, setLastServerUpdate] = useState<Date | null>(null);
  const [hasInitialCloudSync, setHasInitialCloudSync] = useState(false);

  const [checkIns, setCheckIns] = useState<WeeklyCheckIn[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);

  const syncService = useMemo(() => new FirebaseSyncService(), []);

  // Ref to track if the current state change is coming FROM the cloud
  // (to avoid circular updates, though Firestore onSnapshot handles most of this)
  const isIncomingUpdate = useRef(false);

  const unreadCheckInsCount = useMemo(
    () => checkIns.filter(c => !c.readByCoach).length,
    [checkIns]
  );

  const submitCheckIn = useCallback(async (checkIn: Omit<WeeklyCheckIn, 'id'>) => {
    await syncService.submitCheckIn(checkIn);
  }, [syncService]);

  const unreadWorkoutLogsCount = useMemo(
    () => workoutLogs.filter(l => !l.readByCoach).length,
    [workoutLogs]
  );

  const submitWorkoutLog = useCallback(async (log: Omit<WorkoutLog, 'id'>) => {
    await syncService.submitWorkoutLog(log);
  }, [syncService]);

  const markWorkoutLogRead = useCallback(async (id: string) => {
    setWorkoutLogs(prev => prev.map(l => l.id === id ? { ...l, readByCoach: true } : l));
    await syncService.markWorkoutLogRead(id);
  }, [syncService]);

  const markCheckInRead = useCallback(async (id: string) => {
    setCheckIns(prev => prev.map(c => c.id === id ? { ...c, readByCoach: true } : c));
    await syncService.markCheckInRead(id);
  }, [syncService]);

  // 1. Initial Load from Local Cache (Immediate UI)
  useEffect(() => {
    // Only branding is cached locally. Client records, archives and the
    // workout library are never written to this browser: a cached copy is
    // readable by anyone with the device, and every athlete who signed in
    // used to end up holding a copy of every other athlete's details.
    const savedConfig = localStorage.getItem('ilai_academy_config');
    if (savedConfig) setLandingConfig(JSON.parse(savedConfig));

    localStorage.removeItem('ilai_academy_clients');
    localStorage.removeItem('ilai_academy_archived');
    localStorage.removeItem('ilai_master_library');
  }, []);

  // 2. Continuous Cloud Sync
  const applyUpdate = useCallback(
      (update: { type: string, payload: any }) => {
        isIncomingUpdate.current = true;
        setLastServerUpdate(new Date());
        setIsConnected(true);
        setCloudError(null);

        switch (update.type) {
          case 'clients':
            setClients(update.payload || []);
            break;
          case 'archived':
            setArchivedClients(update.payload || []);
            break;
          case 'library':
            setSavedWorkouts(update.payload || []);
            break;
          case 'config':
            if (update.payload) {
              setLandingConfig(update.payload);
              localStorage.setItem('ilai_academy_config', JSON.stringify(update.payload));
            }
            break;
          case 'workoutLogs':
            setWorkoutLogs(update.payload || []);
            break;
          case 'checkIns':
            setCheckIns(update.payload || []);
            break;
        }

        setHasInitialCloudSync(true);
        setTimeout(() => { isIncomingUpdate.current = false; }, 500);
      },
    []);

  const handleSyncError = useCallback((err: any) => {
    console.error("Sync Error:", err);
    setIsConnected(false);
    if (err.code === 'permission-denied') {
      setCloudError("Permission denied — you may need to sign in again.");
    } else {
      setCloudError(err.message || "Cloud Connection Lost");
    }
  }, []);

  // 2a. Branding only — the login screen needs it before anyone signs in.
  useEffect(() => {
    const unsubscribe = syncService.listenToBranding(applyUpdate, handleSyncError);
    return () => unsubscribe();
  }, [syncService, applyUpdate, handleSyncError]);

  // 2b. Client data, workouts and logs load ONLY once someone is signed in,
  // so none of it is readable to a signed-out visitor.
  useEffect(() => {
    const auth = getAuth();
    let unsubStore: (() => void) | null = null;
    // Which account the current listeners belong to. If a different person
    // signs in on the same device, the old listeners have to go.
    let subscribedUid: string | null = null;
    // onAuthStateChanged fires asynchronously, so it can still deliver after
    // this effect has been torn down. Without this guard that late call would
    // subscribe listeners nothing ever unsubscribes.
    let cancelled = false;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (cancelled) return;

      if (user) {
        if (subscribedUid === user.uid) return;

        if (unsubStore) {
          unsubStore();
          unsubStore = null;
        }
        subscribedUid = user.uid;

        // The coach loads everyone. An athlete loads their own record and
        // nothing else, so one athlete can never pull up another's details.
        if (user.email === COACH_EMAIL) {
          unsubStore = syncService.listenToStore(applyUpdate, handleSyncError);
          return;
        }

        try {
          const own = await syncService.findClientForUser(user.uid, user.email || "");
          if (cancelled) return;
          if (!own?.id) {
            setClients([]);
            return;
          }
          const unsubOwn = syncService.listenToClient(
            own.id,
            client => applyUpdate({ type: 'clients', payload: [client] }),
            handleSyncError
          );
          if (cancelled) {
            unsubOwn();
            return;
          }
          unsubStore = unsubOwn;
          applyUpdate({ type: 'clients', payload: [own] });
        } catch (err) {
          if (!cancelled) handleSyncError(err);
        }
        return;
      }

      if (unsubStore) {
        unsubStore();
        unsubStore = null;
      }
      subscribedUid = null;
      setClients(null);
      setArchivedClients([]);
      setSavedWorkouts([]);
      setWorkoutLogs([]);
      setCheckIns([]);
      localStorage.removeItem('ilai_academy_clients');
      localStorage.removeItem('ilai_academy_archived');
      localStorage.removeItem('ilai_master_library');
    });

    return () => {
      cancelled = true;
      unsubAuth();
      if (unsubStore) unsubStore();
    };
  }, [syncService, applyUpdate, handleSyncError]);

  const forceSync = useCallback(async () => {
    setIsSyncing(true);
    setCloudError(null);
    try {
      // If we're syncing manually, we push current state to cloud
      await syncService.pushFullSync(clients, landingConfig, savedWorkouts);
      setIsConnected(true);
      alert("✅ CLOUD RE-SYNC COMPLETE: All data is now matching the server.");
    } catch (e: any) {
      setCloudError(e.message || "Manual sync failed");
      setIsConnected(false);
      alert(`❌ SYNC FAILED: ${e.message}`);
    }
    setIsSyncing(false);
  }, [clients, landingConfig, savedWorkouts, syncService]);

  return (
    <AppContext.Provider value={{
      clients, setClients,
      archivedClients, setArchivedClients,
      savedWorkouts, setSavedWorkouts,
      landingConfig, setLandingConfig,
      syncService,
      cloudSync: {
        isConnected,
        isSyncing,
        forceSync
      },
      cloudError,
      lastServerUpdate,
      hasInitialCloudSync,
      checkIns,
      unreadCheckInsCount,
      submitCheckIn,
      markCheckInRead,
      workoutLogs,
      unreadWorkoutLogsCount,
      submitWorkoutLog,
      markWorkoutLogRead,
    }}>
      {children}
    </AppContext.Provider>
  );
};