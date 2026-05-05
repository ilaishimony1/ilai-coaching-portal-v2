import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  inMemoryPersistence
} from "firebase/auth";
import React, { useState, useRef, useEffect } from 'react';
import { Home, LogOut, Palette, User, ChevronLeft, Archive, BookOpen, Video, Camera, Library, ClipboardList, Bell, BellOff } from 'lucide-react';
import { ViewMode, AuthStatus, ClientData } from './types';
import LoginPage from './components/LoginPage'; 
import GoalTracker from './components/GoalTracker';
import CoachDirectives from './components/CoachDirectives';
import AdminDashboard from './components/AdminDashboard';
import TrainerTemplateEditor from './components/TrainerTemplateEditor';
import WorkoutLibrary from './components/WorkoutLibrary';
import LandingPageEditor from './components/LandingPageEditor';
import AcademyManager from './components/AcademyManager';
import AcademyLibrary from './components/AcademyLibrary';
import ArchivedDashboard from './components/ArchivedDashboard';
import MasterLibrary from './components/MasterLibrary';
import WeeklyCheckInComponent from './components/WeeklyCheckIn';
import CoachCheckIns from './components/CoachCheckIns';
import { AppProvider, useApp } from './AppContext';
import { useCoachNotifications } from './hooks/useCoachNotifications';

const APP_VERSION = "2.10.0";

const EMPTY_CLIENT: ClientData = {
  id: '',
  name: '',
  avatar: '',
  username: '',
  password: '',
  goals: [],
  schedule: [],
  workouts: [
    {
      id: `w-init-${Date.now()}`,
      name: 'A',
      title: 'INITIAL PROTOCOL',
      exercises: [],
    },
  ],
};

const mergeClient = (client: ClientData): ClientData => ({
  ...EMPTY_CLIENT,
  ...client,
  avatar: client.avatar ?? '',
});

const MainApp: React.FC = () => {
  const { clients, setClients, archivedClients, setArchivedClients, landingConfig, setLandingConfig, cloudSync, syncService, unreadCheckInsCount, unreadWorkoutLogsCount, checkIns } = useApp();
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ type: 'NONE' });
  const [viewMode, setViewMode] = useState<ViewMode>('ADMIN');
  const [currentClientData, setCurrentClientData] = useState<ClientData | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { permission: notifPermission, requestPermission: requestNotifPermission } = useCoachNotifications(authStatus.type === 'COACH');

  const NavButtons = (
    <>
      {authStatus.type === 'CLIENT' ? (
        <>
          <NavBtn active={viewMode === 'CLIENT'} onClick={() => setViewMode('CLIENT')} icon={<User />} color={landingConfig.accentColor} />
          <NavBtn active={viewMode === 'ACADEMY'} onClick={() => setViewMode('ACADEMY')} icon={<BookOpen />} color={landingConfig.accentColor} />
        </>
      ) : (
        <>
          <NavBtn active={viewMode === 'ADMIN'} onClick={() => setViewMode('ADMIN')} icon={<Home />} color={landingConfig.accentColor} />
          <NavBtn active={viewMode === 'ACADEMY'} onClick={() => setViewMode('ACADEMY')} icon={<Video />} color={landingConfig.accentColor} />
          <NavBtn active={viewMode === 'SAVED_PROGRAMS'} onClick={() => setViewMode('SAVED_PROGRAMS')} icon={<Library />} color={landingConfig.accentColor} />
          <NavBtn active={viewMode === 'ARCHIVE'} onClick={() => setViewMode('ARCHIVE')} icon={<Archive />} color={landingConfig.accentColor} />
          <NavBtn active={viewMode === 'WEEKLY_CHECKIN'} onClick={() => setViewMode('WEEKLY_CHECKIN')} icon={<ClipboardList />} color={landingConfig.accentColor} badge={unreadCheckInsCount + unreadWorkoutLogsCount} />
          <NavBtn active={viewMode === 'LANDING_EDITOR'} onClick={() => setViewMode('LANDING_EDITOR')} icon={<Palette />} color={landingConfig.accentColor} />
        </>
      )}
    </>
  );

  if (cloudSync === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617] text-slate-400">
        Connecting to cloud…
      </div>
    );
  }

  if (cloudSync === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617] text-red-400">
        Firebase connection failed
      </div>
    );
  }

  const handleLogin = async (email: string, password: string): Promise<boolean> => {
    const auth = getAuth();
    try {
      if (email === "ilaishimony1@gmail.com") {
        await setPersistence(auth, inMemoryPersistence);
      } else {
        await setPersistence(auth, browserLocalPersistence);
      }

      const cred = await signInWithEmailAndPassword(auth, email, password);

      if (cred.user.email === "ilaishimony1@gmail.com") {
        setAuthStatus({ type: "COACH" });
        setViewMode("ADMIN");
        return true;
      }

      const client = clients.find(c => c.email === cred.user.email);
      if (client) {
        localStorage.setItem("loginTime", Date.now().toString());
        setAuthStatus({ type: "CLIENT", clientId: client.id });
        setCurrentClientData(mergeClient(client));
        setViewMode("CLIENT");
        return true;
      }

      return false;
    } catch (err) {
      console.error("Login failed:", err);
      return false;
    }
  };

  const handleAddOrUpdateClient = async (data: ClientData) => {
    if (!data.id) return;
    setClients(prev => {
      const exists = prev.find(c => c.id === data.id);
      if (exists) return prev.map(c => c.id === data.id ? data : c);
      return [...prev, data];
    });
    try {
      await syncService.updateDocument('clients', data.id, data);
      setViewMode('ADMIN');
    } catch (e: any) {
      console.error("Cloud Save Error:", e);
      alert(`❌ CLOUD SYNC FAILED: ${e.message || "Unknown Error"}.`);
    }
  };

  const handleArchiveClient = async (clientOrId: string | ClientData) => {
    const target = typeof clientOrId === 'string'
      ? clients.find(c => c.id === clientOrId)
      : clientOrId;
    if (target && window.confirm(`Archive ${target.name}? Protocol will be moved to The Vault.`)) {
      try {
        await syncService.archiveClient(target);
        setViewMode('ADMIN');
      } catch (e) {
        alert("Sync error during archiving.");
      }
    }
  };

  const handleRestoreClient = async (id: string) => {
    const client = archivedClients.find(c => c.id === id);
    if (client) {
      try {
        await syncService.restoreClient(client);
      } catch (e) {
        alert("Cloud Restore Error");
      }
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (window.confirm("Permanently erase this protocol?")) {
      try {
        await syncService.deletePermanent(id, true);
      } catch (e) {
        alert("Cloud Delete Error");
      }
    }
  };

  const handleToggleMiniGoal = (clientId: string, goalId: string, miniIdx: number) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    const updatedGoals = client.goals.map(g => {
      if (g.id !== goalId) return g;
      const newMini = [...(g.miniGoals || [])];
      newMini[miniIdx] = { ...newMini[miniIdx], completed: !newMini[miniIdx].completed };
      return { ...g, miniGoals: newMini };
    });
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, goals: updatedGoals } : c));
    syncService.updateDocument('clients', clientId, { goals: updatedGoals });
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentClientData) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const clientId = currentClientData.id;
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, avatar: base64 } : c));
      setCurrentClientData(prev => prev ? { ...prev, avatar: base64 } : prev);
      await syncService.updateDocument("clients", clientId, { avatar: base64 });
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  const resolvedClientAvatar =
    currentClientData?.avatar?.length
      ? currentClientData.avatar
      : "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop";

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setAuthStatus({ type: "NONE" });
        return;
      }
      if (user.email === "ilaishimony1@gmail.com") {
        setAuthStatus({ type: "COACH" });
        setViewMode("ADMIN");
        return;
      }
      const client = clients.find(c => c.email === user.email);
      if (client) {
        setAuthStatus({ type: "CLIENT", clientId: client.id });
        setCurrentClientData(mergeClient(client));
        setViewMode("CLIENT");
      }
    });
    return () => unsubscribe();
  }, [clients]);

  useEffect(() => {
    const auth = getAuth();
    const loginTime = localStorage.getItem("loginTime");
    if (authStatus.type === "CLIENT") {
      if (!loginTime) {
        setAuthStatus({ type: "NONE" });
        return;
      }
      const oneHour = 60 * 60 * 1000;
      if (Date.now() - parseInt(loginTime) > oneHour) {
        localStorage.removeItem("loginTime");
        signOut(auth);
        setAuthStatus({ type: "NONE" });
      }
    }
  }, [authStatus]);

  if (authStatus.type === 'NONE') {
    return <LoginPage onLogin={handleLogin} config={landingConfig} version={APP_VERSION} />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#020617] text-slate-200">

      <nav className="hidden md:flex w-24 bg-[#010409]/80 backdrop-blur-xl border-r border-slate-900 flex-col items-center py-10 z-50">
        <button
          onClick={() => setViewMode(authStatus.type === 'COACH' ? 'ADMIN' : 'CLIENT')}
          className="w-12 h-12 rounded-2xl bg-slate-800 border-2 border-white/5 overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-xl group mb-12"
        >
          {landingConfig.coachAvatar ? (
            <img src={landingConfig.coachAvatar} className="w-full h-full object-cover group-hover:brightness-110" alt="Coach" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white font-black text-[10px]">IS</div>
          )}
        </button>
        <div className="flex-1 space-y-8 flex flex-col items-center">
          {NavButtons}
        </div>
        {authStatus.type === 'COACH' && notifPermission !== 'granted' && (
          <button onClick={requestNotifPermission} title="Enable notifications" className="p-4 text-slate-600 hover:text-yellow-400 transition-colors">
            <BellOff size={20} />
          </button>
        )}
        <button onClick={() => setAuthStatus({ type: 'NONE' })} className="mt-auto p-4 text-slate-700 hover:text-red-500 transition-colors">
          <LogOut size={24} />
        </button>
      </nav>

      {/* 📱 Mobile Top Navigation */}
      <nav className="md:hidden sticky top-0 z-50 bg-[#010409]/90 backdrop-blur-xl border-b border-slate-900">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setViewMode(authStatus.type === 'COACH' ? 'ADMIN' : 'CLIENT')}
            className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800"
          >
            {landingConfig.coachAvatar ? (
              <img src={landingConfig.coachAvatar} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold">IS</div>
            )}
          </button>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {NavButtons}
          </div>
          <div className="flex items-center gap-1">
            {authStatus.type === 'COACH' && notifPermission !== 'granted' && (
              <button onClick={requestNotifPermission} title="Enable notifications" className="p-2 text-slate-600 hover:text-yellow-400 transition-colors">
                <BellOff size={18} />
              </button>
            )}
            <button onClick={() => setAuthStatus({ type: 'NONE' })} className="text-slate-500 p-2">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto p-4 md:p-12 pb-24 md:pb-12 no-scrollbar">
        <div className="max-w-6xl mx-auto">

          {viewMode === 'ADMIN' && (
            <AdminDashboard
              clients={clients}
              fullClients={clients}
              onOpenPortal={(id) => { setCurrentClientData(mergeClient(clients.find(c => c.id === id)!)); setViewMode('CLIENT'); }}
              onEditPortal={(id) => { setCurrentClientData(mergeClient(clients.find(c => c.id === id)!)); setViewMode('TRAINER'); }}
              onArchiveClient={handleArchiveClient}
              onAddClient={() => {
                const newId = `client-${Date.now()}`;
                setCurrentClientData({ ...EMPTY_CLIENT, id: newId });
                setViewMode('TRAINER');
              }}
              onOpenBranding={() => setViewMode('LANDING_EDITOR')}
              version={APP_VERSION}
              isMasterNode={true}
            />
          )}

          {viewMode === 'SAVED_PROGRAMS' && (
            <MasterLibrary
              onLoadIntoEditor={(clientId, templateWorkout, targetModuleId) => {
                const client = clients.find(c => c.id === clientId);
                if (!client) return;
                // Inject the template into the client's workouts
                let updatedWorkouts = [...client.workouts];
                if (targetModuleId === 'NEW') {
                  const usedLetters = updatedWorkouts.map(w => w.name.toUpperCase());
                  const nextLetter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').find(l => !usedLetters.includes(l)) || 'X';
                  updatedWorkouts.push({ ...templateWorkout, name: nextLetter });
                } else {
                  updatedWorkouts = updatedWorkouts.map(w =>
                    w.id === targetModuleId ? { ...templateWorkout, name: w.name } : w
                  );
                }
                const updatedClient = mergeClient({ ...client, workouts: updatedWorkouts });
                setCurrentClientData(updatedClient);
                setViewMode('TRAINER');
              }}
            />
          )}

          {viewMode === 'ARCHIVE' && (
            <ArchivedDashboard
              clients={archivedClients}
              onRestore={handleRestoreClient}
              onDelete={handleDeleteClient}
              onOpenPortal={(id) => { setCurrentClientData(archivedClients.find(c => c.id === id)!); setViewMode('CLIENT'); }}
            />
          )}

          {viewMode === 'TRAINER' && (
            <TrainerTemplateEditor
              client={currentClientData || { ...EMPTY_CLIENT, id: `client-${Date.now()}` }}
              isEditing={!!currentClientData && (clients.some(c => c.id === currentClientData.id) || archivedClients.some(c => c.id === currentClientData.id))}
              onUpdate={setCurrentClientData}
              onAddClient={handleAddOrUpdateClient}
              onArchive={handleArchiveClient}
            />
          )}

          {viewMode === 'ACADEMY' && authStatus.type === 'COACH' && (
            <AcademyManager
              accentColor={landingConfig.accentColor}
              clients={clients}
            />
          )}

          {viewMode === 'ACADEMY' && authStatus.type === 'CLIENT' && currentClientData && (
            <AcademyLibrary
              accentColor={landingConfig.accentColor}
              client={currentClientData}
            />
          )}

          {viewMode === 'CLIENT' && currentClientData && (
            <div className="space-y-12 animate-in fade-in duration-1000">
              <header className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="relative group text-center md:text-left flex items-center gap-6">
                  <div onClick={() => avatarInputRef.current?.click()} className="w-20 h-20 md:w-24 md:h-24 rounded-3xl ...">
                    <img
                      src={resolvedClientAvatar}
                      className="w-full h-full object-cover transition-transform group-hover/avatar:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity">
                      <Camera size={24} className="text-white" />
                    </div>
                    <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                  </div>
                  <div>
                    <h1 className="text-4xl md:text-6xl font-black text-white brand-font uppercase tracking-tighter leading-none">
                      {currentClientData.name.split(' ')[0]}'s <span className="text-blue-600/50">Portal</span>
                    </h1>
                    <p className="font-bold uppercase tracking-[0.5em] text-[10px] mt-2 text-blue-500">1:1 ONLINE COACHING</p>
                  </div>
                </div>
                {authStatus.type === 'COACH' && (
                  <button
                    onClick={() => setViewMode('ADMIN')}
                    className="flex items-center gap-2 px-5 py-3 bg-slate-900/60 border border-slate-800 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:border-slate-600 transition-all group"
                  >
                    <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                    Command Center
                  </button>
                )}
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-8 space-y-12">
                  {currentClientData.weeklyCheckInEnabled && authStatus.type === 'CLIENT' && (() => {
                    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
                    const submitted = checkIns.some(c => c.clientId === currentClientData.id && new Date(c.submittedAt).getTime() > twoDaysAgo);
                    const day = new Date().getDay();
                    const weekend = day === 0 || day === 6;
                    return (
                      <button
                        onClick={() => setViewMode('WEEKLY_CHECKIN')}
                        className={`w-full flex items-center justify-between px-8 py-6 rounded-[2rem] border transition-all group ${
                          submitted
                            ? 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-500/30 active:scale-[0.99]'
                            : weekend
                            ? 'bg-blue-600/5 border-blue-500/20 hover:bg-blue-600/10 hover:border-blue-500/40 active:scale-[0.99]'
                            : 'bg-slate-950/40 border-slate-800/50 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-5">
                          <div className={`p-3 rounded-2xl ${submitted ? 'bg-emerald-500/10' : weekend ? 'bg-blue-600/10' : 'bg-slate-900'}`}>
                            <ClipboardList size={22} className={submitted ? 'text-emerald-400' : weekend ? 'text-blue-400' : 'text-slate-600'} />
                          </div>
                          <div className="text-left">
                            <p className={`text-sm font-black uppercase tracking-wide ${submitted ? 'text-emerald-300' : weekend ? 'text-white' : 'text-slate-500'}`}>
                              Weekly Check-In
                            </p>
                            <p className={`text-[10px] font-bold mt-0.5 ${submitted ? 'text-emerald-600' : weekend ? 'text-slate-500' : 'text-slate-700'}`}>
                              {submitted ? 'Submitted this weekend — view your history' : weekend ? "This week's review is ready to fill" : 'Available on weekends'}
                            </p>
                          </div>
                        </div>
                        <div className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border ${
                          submitted
                            ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                            : weekend
                            ? 'text-blue-400 bg-blue-500/10 border-blue-500/20 group-hover:bg-blue-500/20'
                            : 'text-slate-700 bg-slate-900 border-slate-800'
                        }`}>
                          {submitted ? '✓ Done' : weekend ? 'Fill Now →' : 'Locked'}
                        </div>
                      </button>
                    );
                  })()}
                  <CoachDirectives notes={currentClientData.generalNotes} />
                  <GoalTracker
                    goals={currentClientData.goals || []}
                    isCoach={authStatus.type === 'COACH'}
                    onToggleMiniGoal={(goalId, miniIdx) => handleToggleMiniGoal(currentClientData.id, goalId, miniIdx)}
                  />
                  <WorkoutLibrary
                    workouts={currentClientData.workouts || []}
                    clientData={currentClientData}
                    accentColor={landingConfig.accentColor}
                    isCoach={authStatus.type === 'COACH'}
                  />
                </div>
              </div>
            </div>
          )}

          {viewMode === 'WEEKLY_CHECKIN' && authStatus.type === 'COACH' && (
            <CoachCheckIns />
          )}

          {viewMode === 'WEEKLY_CHECKIN' && authStatus.type === 'CLIENT' && currentClientData && (
            <WeeklyCheckInComponent
              client={currentClientData}
              accentColor={landingConfig.accentColor}
            />
          )}

          {viewMode === 'LANDING_EDITOR' && (
            <LandingPageEditor config={landingConfig} onUpdate={(c) => { setLandingConfig(c); }} onBack={() => setViewMode('ADMIN')} />
          )}

        </div>
      </main>
    </div>
  );
};

const NavBtn = ({ active, icon, onClick, color, badge }: any) => (
  <div className="relative">
    <button
      onClick={onClick}
      className={`p-3 md:p-4 rounded-2xl transition-all duration-300 ${active ? 'text-white shadow-lg' : 'text-slate-700 hover:text-white'}`}
      style={active ? { backgroundColor: color, boxShadow: `0 10px 30px -10px ${color}` } : {}}
    >
      {icon}
    </button>
    {badge > 0 && (
      <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-black text-white shadow-lg pointer-events-none">
        {badge > 9 ? '9+' : badge}
      </div>
    )}
  </div>
);

const App = () => (
  <AppProvider>
    <MainApp />
  </AppProvider>
);

export default App;