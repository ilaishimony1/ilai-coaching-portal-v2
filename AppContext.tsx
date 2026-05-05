import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ClientData, LandingPageConfig, WorkoutTemplate, WeeklyCheckIn, WorkoutLog } from './types';
import { TEST_CLIENT, INITIAL_CONFIG } from './constants';
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
  submitWorkoutLog: (log: Omit<WorkoutLog, 'id'>) => Promise<void>;
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

  const submitWorkoutLog = useCallback(async (log: Omit<WorkoutLog, 'id'>) => {
    await syncService.submitWorkoutLog(log);
  }, [syncService]);

  const markCheckInRead = useCallback(async (id: string) => {
    setCheckIns(prev => prev.map(c => c.id === id ? { ...c, readByCoach: true } : c));
    await syncService.markCheckInRead(id);
  }, [syncService]);

  // 1. Initial Load from Local Cache (Immediate UI)
  useEffect(() => {
    const savedClients = localStorage.getItem('ilai_academy_clients');
    const savedArchived = localStorage.getItem('ilai_academy_archived');
    const savedConfig = localStorage.getItem('ilai_academy_config');
    const savedLibrary = localStorage.getItem('ilai_master_library');

    if (savedClients) setClients(JSON.parse(savedClients));
    if (savedArchived) setArchivedClients(JSON.parse(savedArchived));
    if (savedConfig) setLandingConfig(JSON.parse(savedConfig));
    if (savedLibrary) setSavedWorkouts(JSON.parse(savedLibrary));
  }, []);

  // 2. Continuous Cloud Sync
  useEffect(() => {
    const unsubscribe = syncService.listenToStore(
      (update: { type: string, payload: any }) => {
        isIncomingUpdate.current = true;
        setLastServerUpdate(new Date());
        setIsConnected(true);
        setCloudError(null);
        
        switch (update.type) {
          case 'clients':
            setClients(update.payload || []);
            localStorage.setItem('ilai_academy_clients', JSON.stringify(update.payload || []));
            break;
          case 'archived':
            setArchivedClients(update.payload || []);
            localStorage.setItem('ilai_academy_archived', JSON.stringify(update.payload || []));
            break;
          case 'library':
            setSavedWorkouts(update.payload || []);
            localStorage.setItem('ilai_master_library', JSON.stringify(update.payload || []));
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
      (err: any) => {
        console.error("Sync Error:", err);
        setIsConnected(false);
        if (err.code === 'permission-denied') {
          setCloudError("PERMISSION DENIED: Update Firestore Rules to 'allow read, write: if true;'");
        } else {
          setCloudError(err.message || "Cloud Connection Lost");
        }
      }
    );

    return () => unsubscribe();
  }, [syncService]);

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
      submitWorkoutLog,
    }}>
      {children}
    </AppContext.Provider>
  );
};