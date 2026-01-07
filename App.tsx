
"use client";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import TestFirebaseEngine from "./components/TestFirebaseEngine";
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Home, LogOut, Palette, User, ChevronLeft, Archive, BookOpen, Video, BarChart2, Camera, Shield, Users, Upload, ClipboardCheck, X, Send, Sparkles, MessageCircle, Activity, CheckCircle2, Info, Play, Clock, Hash, Zap, MessageSquareText, Smartphone, Globe, Cloud, Cpu, Database, Binary, Timer as TimerIcon, RotateCcw, BrainCircuit, Maximize2, Trophy, RefreshCw, Library } from 'lucide-react';
import { ViewMode, AuthStatus, ClientData, WorkoutLog, Message } from './types';
import { TEST_CLIENT } from './constants';
import LoginPage from './components/LoginPage'; 
import GoalTracker from './components/GoalTracker';
import CoachDirectives from './components/CoachDirectives';
import AdminDashboard from './components/AdminDashboard';
import TrainerTemplateEditor from './components/TrainerTemplateEditor';
import WorkoutLibrary from './components/WorkoutLibrary';
import LandingPageEditor from './components/LandingPageEditor';
import AcademyManager from './components/AcademyManager';
import AcademyLibrary from './components/AcademyLibrary';
import ChatInterface from './components/ChatInterface';
import BrandLogo from './components/BrandLogo';
import SummaryReport from './components/SummaryReport';
import ArchivedDashboard from './components/ArchivedDashboard';
import MasterLibrary from './components/MasterLibrary';
import { AppProvider, useApp } from './AppContext';

const APP_VERSION = "2.10.0";
// ✅ PERMANENT AVATAR AND LOGO
const PERMANENT_COACH_LOGO = "https://firebasestorage.googleapis.com/v0/b/ilai-portal.firebasestorage.app/o/branding%2FLOGO%20.jpg?alt=media&token=d17da491-8e18-47b9-aa23-270758c7621b";
const EMPTY_CLIENT: ClientData = {

  id: '',
  name: '',
  avatar: '', // empty by default
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
  logs: [],
  messages: [],
};
const mergeClient = (client: ClientData): ClientData => ({
  ...EMPTY_CLIENT,
  ...client,
  avatar: client.avatar ?? '', // 🔒 preserve avatar if it exists
});



const MainApp: React.FC = () => {
  const { clients, setClients, archivedClients, setArchivedClients, landingConfig, setLandingConfig, cloudSync, syncService } = useApp();
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ type: 'NONE' });
  const [viewMode, setViewMode] = useState<ViewMode>('ADMIN');
  const [currentClientData, setCurrentClientData] = useState<ClientData | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  // ⛔ Prevent app from rendering before Firebase is ready
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

  const pendingSummaries = useMemo(() => 
    
    (clients || []).reduce((acc, c) => acc + (c.logs?.filter(l => l.workoutId === 'weekly-summary' && !l.isRead).length || 0), 0)
  , [clients]);

  const pendingWorkouts = useMemo(() => 
    (clients || []).reduce((acc, c) => acc + (c.logs?.filter(l => l.workoutId !== 'weekly-summary' && !l.isRead).length || 0), 0)
  , [clients]);
const handleLogin = async (email: string, password: string): Promise<boolean> => {
  const auth = getAuth();

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);

    // ===============================
    // ✅ YOU = COACH
    // ===============================
    if (cred.user.email === "ilaishimony1@gmail.com") {
      setAuthStatus({ type: "COACH" });
      setViewMode("ADMIN");

      // 🔥 START FIREBASE LISTENERS (COACH)

      return true;
    }

    // ===============================
    // ✅ CLIENT LOGIN
    // ===============================
    const client = clients.find(c => c.email === cred.user.email);
    if (client) {
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
    
    // Update local state immediately
    setClients(prev => {
      const exists = prev.find(c => c.id === data.id);
      if (exists) return prev.map(c => c.id === data.id ? data : c);
      return [...prev, data];
    });

    try {
      console.log("Saving client to cloud...", data.id);
      await syncService.updateDocument('clients', data.id, data);
      setViewMode('ADMIN');
    } catch (e: any) {
      console.error("Cloud Save Error:", e);
      alert(`❌ CLOUD SYNC FAILED: ${e.message || "Unknown Error"}. \n\nPlease verify that your Firestore Rules are set to 'allow read, write: if true;' for testing.`);
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

  const handleLogHSLabSession = (summaryText: string) => {
    if (!currentClientData) return;
    const timestamp = new Date().toISOString();
    const newLog: WorkoutLog = {
      date: timestamp,
      workoutId: 'hs-lab-session',
      exercises: [],
      clientNotes: summaryText,
      isRead: false
    };
    const systemMsg: Message = {
      id: `hs-lab-${Date.now()}`,
      senderId: currentClientData.id,
      text: `HS LAB: Calibration Data Synchronized.`,
      timestamp: timestamp,
      type: 'system',
      meta: { type: 'workout', title: 'HS LAB SESSION' }
    };
    const updatedLogs = [...(currentClientData.logs || []), newLog];
    const updatedMsgs = [...(currentClientData.messages || []), systemMsg];
    
    setClients(prev => prev.map(c => c.id === currentClientData.id ? { ...c, logs: updatedLogs, messages: updatedMsgs, hasNewSubmission: true } : c));
    syncService.updateDocument('clients', currentClientData.id, { 
      logs: updatedLogs, 
      messages: updatedMsgs, 
      hasNewSubmission: true 
    });
  };

const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file || !currentClientData) return;

  const reader = new FileReader();

  reader.onloadend = async () => {
    const base64 = reader.result as string;
    const clientId = currentClientData.id;

    // 1️⃣ update local clients list
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, avatar: base64 } : c));

    // 2️⃣ update active client session
    setCurrentClientData(prev => prev ? { ...prev, avatar: base64 } : prev);

    // 3️⃣ persist to Firebase
    await syncService.updateDocument("clients", clientId, { avatar: base64 });

    // 4️⃣ allow re-upload of same image
    e.target.value = "";
  };

  reader.readAsDataURL(file);
};



  const handleToggleAssignment = (clientId: string, videoUid: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    const current = client.assignedVideoUids || [];
    const updated = current.includes(videoUid) 
      ? current.filter(id => id !== videoUid)
      : [...current, videoUid];
    
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, assignedVideoUids: updated } : c));
    syncService.updateDocument('clients', clientId, { assignedVideoUids: updated });
  };

  const handleUnsyncAll = (clientId: string) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, assignedVideoUids: [] } : c));
    syncService.updateDocument('clients', clientId, { assignedVideoUids: [] });
  };

  const isWeekend = useMemo(() => {
  const day = new Date().getDay();
  return [5, 6, 0].includes(day);
}, []);

// 👇 ADD THIS RIGHT HERE
const resolvedClientAvatar =
  currentClientData?.avatar?.length
    ? currentClientData.avatar
    : "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop";


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
          {authStatus.type === 'CLIENT' ? (
            <>
              <NavBtn active={viewMode === 'CLIENT'} onClick={() => setViewMode('CLIENT')} icon={<User />} color={landingConfig.accentColor} />
              <NavBtn active={viewMode === 'ACADEMY'} onClick={() => setViewMode('ACADEMY')} icon={<BookOpen />} color={landingConfig.accentColor} />
              <NavBtn active={viewMode === 'CHAT'} onClick={() => setViewMode('CHAT')} icon={<MessageCircle />} color={landingConfig.accentColor} />
            </>
          ) : (
            <>
              <NavBtn active={viewMode === 'ADMIN'} onClick={() => setViewMode('ADMIN')} icon={<Home />} color={landingConfig.accentColor} />
              <NavBtn active={viewMode === 'ACADEMY'} onClick={() => setViewMode('ACADEMY')} icon={<Video />} color={landingConfig.accentColor} />
              <NavBtn active={viewMode === 'SAVED_PROGRAMS'} onClick={() => setViewMode('SAVED_PROGRAMS')} icon={<Library />} color={landingConfig.accentColor} />
              <NavBtn active={viewMode === 'ARCHIVE'} onClick={() => setViewMode('ARCHIVE')} icon={<Archive />} color={landingConfig.accentColor} />
              <NavBtn active={viewMode === 'LANDING_EDITOR'} onClick={() => setViewMode('LANDING_EDITOR')} icon={<Palette />} color={landingConfig.accentColor} />
            </>
          )}
        </div>
        <button onClick={() => setAuthStatus({ type: 'NONE' })} className="mt-auto p-4 text-slate-700 hover:text-red-500 transition-colors">
          <LogOut size={24} />
        </button>
      </nav>

      <main className="flex-1 overflow-y-auto p-4 md:p-12 pb-24 md:pb-12 no-scrollbar">
        <div className="max-w-6xl mx-auto">
    

          {viewMode === 'ADMIN' && (
            <AdminDashboard 
              clients={clients} fullClients={clients} 
              pendingSummaries={pendingSummaries} pendingWorkouts={pendingWorkouts} 
              onOpenPortal={(id) => { setCurrentClientData(mergeClient(clients.find(c => c.id === id)!)); setViewMode('CLIENT'); }} 
              onEditPortal={(id) => { setCurrentClientData(mergeClient(clients.find(c => c.id === id)!)); setViewMode('TRAINER'); }} 
              onOpenChat={(id) => { setCurrentClientData(mergeClient(clients.find(c => c.id === id)!)); setViewMode('CHAT'); }} 
              onArchiveClient={handleArchiveClient}
              onAddClient={() => { 
                const newId = `client-${Date.now()}`;
                setCurrentClientData({ ...EMPTY_CLIENT, id: newId }); 
                setViewMode('TRAINER'); 
              }} 
              onOpenBranding={() => setViewMode('LANDING_EDITOR')} 
              version={APP_VERSION} isMasterNode={true} 
            />
       )}


          {viewMode === 'SAVED_PROGRAMS' && (
            <MasterLibrary />
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
              onToggleAssignment={handleToggleAssignment} 
              onUnsyncAll={handleUnsyncAll} 
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
    </header>  {/* ✅ close header properly */}

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
      <div className="lg:col-span-8 space-y-12">
        {isWeekend && <SummaryReport client={currentClientData} />}
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
        />
      </div>
    </div>
  </div>
)}

          
          {viewMode === 'LANDING_EDITOR' && (
            <LandingPageEditor config={landingConfig} onUpdate={(c) => { setLandingConfig(c); }} onBack={() => setViewMode('ADMIN')} />
          )}

          {viewMode === 'CHAT' && currentClientData && (
            <ChatInterface 
              client={currentClientData} 
              isCoach={authStatus.type === 'COACH'} 
              coachAvatar={landingConfig.coachAvatar}
              onSendMessage={(text) => {
                const newMessage: Message = { id: `msg-${Date.now()}`, senderId: authStatus.type === 'COACH' ? 'coach' : currentClientData.id, text, timestamp: new Date().toISOString(), type: 'text' };
                const updated = [...(currentClientData.messages || []), newMessage];
                
                setClients(prev => prev.map(c => c.id === currentClientData.id ? { ...c, messages: updated } : c));
                syncService.updateDocument('clients', currentClientData.id, { messages: updated });
              }}
              onViewProtocol={() => {}}
              onBack={() => setViewMode(authStatus.type === 'COACH' ? 'ADMIN' : 'CLIENT')}
            />
          )}
        </div>
      </main>
    </div>
  );
};

const NavBtn = ({ active, icon, onClick, color }: any) => (
  <button 
    onClick={onClick} 
    className={`p-4 rounded-2xl transition-all duration-300 ${active ? 'text-white shadow-lg' : 'text-slate-700 hover:text-white'}`} 
    style={active ? {backgroundColor: color, boxShadow: `0 10px 30px -10px ${color}`} : {}}
  >
    {icon}
  </button>
);

const App = () => (
  <AppProvider>
    <MainApp />
  </AppProvider>
);

export default App;