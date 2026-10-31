import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  inMemoryPersistence,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { initializeApp, getApps } from "firebase/app";
import { firebaseConfig } from "./firebaseService";
import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Palette, ChevronLeft, Archive, BookOpen, Video, Camera, Library, ClipboardList, BellOff, Smartphone, Monitor, Dumbbell, Target, Users } from 'lucide-react';
import { ViewMode, AuthStatus, ClientData } from './types';
import { COACH_EMAIL } from './constants';
import LoginPage from './components/LoginPage'; 
import GoalTracker from './components/GoalTracker';
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

/**
 * Scales a picked image down to fit inside maxSize and returns it as a small
 * JPEG data URL. Phone photos are several MB; a record in Firestore cannot
 * exceed 1 MB, so saving one raw always failed.
 */
const shrinkImage = (file: File, maxSize: number): Promise<string> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Could not process the image'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image'));
    };
    img.src = url;
  });

const mergeClient = (client: ClientData): ClientData => ({
  ...EMPTY_CLIENT,
  ...client,
  avatar: client.avatar ?? '',
});

// ── Secondary Firebase app for creating client auth accounts ──
// Uses a separate app instance so it never signs out the coach session
const getSecondaryAuth = () => {
  const SECONDARY = 'client-creator';
  const existing = getApps().find(a => a.name === SECONDARY);
  const app = existing || initializeApp(firebaseConfig, SECONDARY);
  return getAuth(app);
};

const createClientAuthAccount = async (email: string, password: string): Promise<string> => {
  const auth = getSecondaryAuth();
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await auth.signOut(); // immediately sign out of secondary instance
  return user.uid;
};

const MainApp: React.FC = () => {
  const { clients, setClients, archivedClients, setArchivedClients, landingConfig, setLandingConfig, cloudSync, cloudError, syncService, unreadCheckInsCount, unreadWorkoutLogsCount, checkIns } = useApp();
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ type: 'NONE' });
  const [viewMode, setViewMode] = useState<ViewMode>('ADMIN');
  const [currentClientData, setCurrentClientData] = useState<ClientData | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { permission: notifPermission, requestPermission: requestNotifPermission } = useCoachNotifications(authStatus.type === 'COACH');
  const [mobilePreview, setMobilePreview] = useState(false);
  const [pendingEditorPlanMode, setPendingEditorPlanMode] = useState<'live' | 'draft'>('live');

  // The menu, with words. Tal: Workout · Goals · Academy. Coach: six sections.
  const navItems: NavItem[] = authStatus.type === 'CLIENT'
    ? [
        { mode: 'CLIENT', label: 'Workout', icon: <Dumbbell size={22} /> },
        { mode: 'GOALS', label: 'Goals', icon: <Target size={22} /> },
        { mode: 'ACADEMY', label: 'Academy', icon: <BookOpen size={22} />, badge: currentClientData?.unseenVideoUids?.length || 0 },
      ]
    : [
        { mode: 'ADMIN', label: 'Clients', icon: <Users size={22} /> },
        { mode: 'ACADEMY', label: 'Academy', icon: <Video size={22} /> },
        { mode: 'WEEKLY_CHECKIN', label: 'Check-ins', icon: <ClipboardList size={22} />, badge: unreadCheckInsCount + unreadWorkoutLogsCount },
        { mode: 'SAVED_PROGRAMS', label: 'Programs', icon: <Library size={22} /> },
        { mode: 'ARCHIVE', label: 'Archive', icon: <Archive size={22} /> },
        { mode: 'LANDING_EDITOR', label: 'Branding', icon: <Palette size={22} /> },
      ];

  // Signing out has to clear the Firebase session too. It used to only hide
  // the screen, so a reload put the person straight back in.
  const handleLogout = async () => {
    localStorage.removeItem("loginTime");
    setAuthStatus({ type: 'NONE' });
    setCurrentClientData(null);
    try {
      await signOut(getAuth());
    } catch (err) {
      console.error("Sign-out failed:", err);
    }
  };

  const handleLogin = async (email: string, password: string): Promise<boolean> => {
    const auth = getAuth();
    try {
      if (email === COACH_EMAIL) {
        await setPersistence(auth, inMemoryPersistence);
      } else {
        await setPersistence(auth, browserLocalPersistence);
      }

      const cred = await signInWithEmailAndPassword(auth, email, password);

      if (cred.user.email === COACH_EMAIL) {
        setAuthStatus({ type: "COACH" });
        setViewMode("ADMIN");
        return true;
      }

      // Looked up straight from Firestore: the live client list only starts
      // loading once this sign-in completes, so it is not populated yet.
      const client = await syncService.findClientForUser(cred.user.uid, cred.user.email || "");
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

    let clientData = { ...data };

    // Auto-create Firebase Auth account for new clients that have email + password but no authUid yet
    if (!clientData.authUid && clientData.email && clientData.password) {
      try {
        const uid = await createClientAuthAccount(clientData.email, clientData.password);
        clientData = { ...clientData, authUid: uid };
        console.log('✅ Auth account created for', clientData.email, '— UID:', uid);
      } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
          // Account exists — fine, just save without UID (coach created it manually before)
          console.warn('Auth account already exists for', clientData.email);
        } else {
          alert("Couldn't create their login. Check the email address and try again.");
          return;
        }
      }
    }

    // Changing an existing athlete's password. The browser can only change the
    // password of whoever is signed in, so this goes through the server.
    if (clientData.authUid && clientData.password) {
      const ok = window.confirm(
        `Change ${clientData.name || 'this athlete'}'s password? They will need the new one to log in.`
      );
      if (!ok) return;

      try {
        const token = await getAuth().currentUser?.getIdToken();
        const res = await fetch('/api/set-client-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            authUid: clientData.authUid,
            email: clientData.email,
            password: clientData.password,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          alert(body.error || "Couldn't change their password. Try again.");
          return;
        }
      } catch (err) {
        console.error('Password change failed:', err);
        alert("Couldn't reach the server to change their password. Check your internet.");
        return;
      }
    }

    // The password is only needed to create or change the login account. It is
    // never saved to the database — a stored password is readable client data.
    const hadPassword = !!clientData.password;
    const { password, ...clientWithoutPassword } = clientData;
    clientData = clientWithoutPassword as ClientData;

    setClients(prev => {
      const list = prev ?? [];
      const exists = list.find(c => c.id === clientData.id);
      if (exists) return list.map(c => c.id === clientData.id ? clientData : c);
      return [...list, clientData];
    });
    try {
      await syncService.updateDocument('clients', clientData.id, clientData);
      if (hadPassword) await syncService.clearStoredPassword(clientData.id);
      setViewMode('ADMIN');
    } catch (e: any) {
      console.error("Cloud Save Error:", e);
      alert("Couldn't save that. Check your internet and try again — nothing was lost.");
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
        alert("Couldn't move them to the vault. Check your internet and try again.");
      }
    }
  };

  const handleRestoreClient = async (id: string) => {
    const client = archivedClients.find(c => c.id === id);
    if (client) {
      try {
        await syncService.restoreClient(client);
      } catch (e) {
        alert("Couldn't bring them back from the vault. Check your internet and try again.");
      }
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (window.confirm("Permanently erase this protocol?")) {
      try {
        await syncService.deletePermanent(id, true);
      } catch (e) {
        alert("Couldn't delete that. Check your internet and try again.");
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
    setClients(prev => (prev ?? []).map(c => c.id === clientId ? { ...c, goals: updatedGoals } : c));
    syncService.updateDocument('clients', clientId, { goals: updatedGoals });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentClientData) return;

    if (!file.type.startsWith('image/')) {
      alert('That file is not a picture. Pick a photo and try again.');
      e.target.value = "";
      return;
    }

    try {
      // Photos are stored inside the athlete's record, which Firestore caps at
      // 1 MB. A straight phone photo blows past that, so shrink it first.
      const avatar = await shrinkImage(file, 400);
      const clientId = currentClientData.id;
      setClients(prev => (prev ?? []).map(c => c.id === clientId ? { ...c, avatar } : c));
      setCurrentClientData(prev => prev ? { ...prev, avatar } : prev);
      await syncService.updateDocument("clients", clientId, { avatar });
    } catch (err: any) {
      console.error('Avatar upload failed:', err);
      alert("That photo couldn't be saved. Try a different one.");
    } finally {
      e.target.value = "";
    }
  };

  const resolvedClientAvatar = currentClientData?.avatar?.length ? currentClientData.avatar : null;

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAuthStatus({ type: "NONE" });
        return;
      }
      if (user.email === COACH_EMAIL) {
        setAuthStatus({ type: "COACH" });
        setViewMode("ADMIN");
        return;
      }
      const client = await syncService.findClientForUser(user.uid, user.email || "");
      if (client) {
        setAuthStatus({ type: "CLIENT", clientId: client.id });
        setCurrentClientData(mergeClient(client));
        setViewMode("CLIENT");
      }
    });
    return () => unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // A new screen starts at its top, not wherever the last one was scrolled to.
  useEffect(() => { window.scrollTo(0, 0); }, [viewMode]);

  // Keep currentClientData in sync with live Firestore updates
  useEffect(() => {
    if (authStatus.type === 'CLIENT' && clients) {
      const updated = clients.find(c => c.id === authStatus.clientId);
      if (updated) setCurrentClientData(mergeClient(updated));
    }
  }, [clients]);

  useEffect(() => {
    const auth = getAuth();
    if (authStatus.type !== "CLIENT") return;

    // Athletes used to be signed out after an hour, which meant logging in
    // again mid-session. They stay signed in for a month now, and the clock
    // restarts every time they come back.
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    const loginTime = localStorage.getItem("loginTime");

    if (loginTime && Date.now() - parseInt(loginTime) > THIRTY_DAYS) {
      localStorage.removeItem("loginTime");
      signOut(auth);
      setAuthStatus({ type: "NONE" });
      return;
    }

    localStorage.setItem("loginTime", Date.now().toString());
  }, [authStatus]);

  // Athlete data is only fetched once someone is signed in, so every screen
  // past the login page has to wait for it rather than assume it is there.
  if (authStatus.type !== 'NONE' && !clients) {
    if (cloudError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-page text-alert text-center px-6">
          <p className="text-base font-bold">Couldn't reach the cloud.</p>
          <p className="text-sm text-muted">{cloudError}</p>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-page text-muted text-base">
        Loading…
      </div>
    );
  }

  if (authStatus.type === 'NONE') {
    return <LoginPage onLogin={handleLogin} config={landingConfig} version={APP_VERSION} />;
  }

  const isClient = authStatus.type === 'CLIENT';
  const firstName = (currentClientData?.name || '').split(' ')[0];
  const coachAvatar = landingConfig.coachAvatar;

  // How wide each screen may get on a computer. Tal's screens and the coach's
  // single-column screens stay phone-shaped; the libraries keep their grids.
  const widthClass = mobilePreview && authStatus.type === 'COACH'
    ? 'max-w-[390px]'
    : ['CLIENT', 'GOALS'].includes(viewMode) || (isClient && ['ACADEMY', 'WEEKLY_CHECKIN'].includes(viewMode))
    ? 'max-w-xl'
    : ['ADMIN', 'TRAINER', 'WEEKLY_CHECKIN'].includes(viewMode)
    ? 'max-w-3xl'
    : 'max-w-6xl';

  const checkInBanner = () => {
    if (!currentClientData?.weeklyCheckInEnabled || !isClient) return null;
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
    const submitted = checkIns.some(c => c.clientId === currentClientData.id && new Date(c.submittedAt).getTime() > twoDaysAgo);
    const day = new Date().getDay();
    const weekend = day === 0 || day === 6;

    if (submitted || !weekend) return (
      <button
        onClick={() => setViewMode('WEEKLY_CHECKIN')}
        className="self-start flex items-center gap-2 h-10 px-3 rounded-xl bg-card text-muted text-[13px] font-semibold"
      >
        <ClipboardList size={16} />
        {submitted ? 'Weekly check-in sent ✓' : 'Weekly check-in opens on weekends'}
      </button>
    );

    return (
      <button
        onClick={() => setViewMode('WEEKLY_CHECKIN')}
        className="w-full flex items-center justify-between gap-3 bg-raised border border-edge rounded-[14px] py-2.5 pl-3 pr-2.5 text-left active:scale-[0.99] transition-transform"
      >
        <span className="flex items-center gap-2.5 text-accent">
          <ClipboardList size={20} />
          <span className="flex flex-col">
            <span className="text-[15px] font-bold text-ink">Weekly check-in</span>
            <span className="text-[13px] text-muted">This week's review is ready to fill</span>
          </span>
        </span>
        <span className="shrink-0 text-sm font-extrabold bg-accent text-onaccent px-3 py-2 rounded-[10px]">Fill now</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-page text-ink md:flex">

      {/* Computer: the menu runs down the left side, with words. */}
      <nav className="hidden md:flex w-28 shrink-0 sticky top-0 h-screen flex-col items-center gap-2 py-6 bg-navbar border-r border-line z-40">
        {navItems.map(item => (
          <NavBtn key={item.mode} item={item} active={viewMode === item.mode} onClick={() => setViewMode(item.mode)} vertical />
        ))}
      </nav>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar: who is signed in, and log out. */}
        <header className="sticky top-0 z-40 bg-page/95 backdrop-blur border-b border-line">
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            {isClient && currentClientData ? (
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  aria-label="Change your photo"
                  className={`relative w-11 h-11 rounded-[14px] overflow-hidden shrink-0 flex items-center justify-center text-muted ${resolvedClientAvatar ? '' : 'border-[1.5px] border-dashed border-tick'}`}
                >
                  {resolvedClientAvatar
                    ? <img src={resolvedClientAvatar} className="w-full h-full object-cover" alt="" />
                    : <Camera size={18} />}
                </button>
                <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                <span className="flex flex-col min-w-0">
                  <span className="text-lg font-extrabold truncate">{firstName}'s portal</span>
                  <span className="text-xs font-semibold text-accent">1:1 online coaching</span>
                </span>
              </div>
            ) : (
              <button onClick={() => setViewMode('ADMIN')} className="flex items-center gap-3 min-w-0 text-left">
                {coachAvatar ? (
                  <img src={coachAvatar} className="w-10 h-10 rounded-xl object-cover object-[center_20%] shrink-0" alt="" />
                ) : (
                  <span className="w-10 h-10 rounded-xl bg-raised text-accent font-extrabold text-sm flex items-center justify-center shrink-0">IS</span>
                )}
                <span className="flex flex-col">
                  <span className="text-lg font-extrabold">Coach</span>
                  <span className="text-xs font-semibold text-accent">Ilai Shimony</span>
                </span>
              </button>
            )}
            <div className="flex items-center">
              {authStatus.type === 'COACH' && notifPermission !== 'granted' && (
                <button onClick={requestNotifPermission} aria-label="Turn on notifications" title="Turn on notifications" className="w-11 h-11 flex items-center justify-center text-muted hover:text-warn transition-colors">
                  <BellOff size={20} />
                </button>
              )}
              {authStatus.type === 'COACH' && (
                <button onClick={() => setMobilePreview(p => !p)} aria-label={mobilePreview ? 'Show computer width' : 'Show phone width'} title={mobilePreview ? 'Show computer width' : 'Show phone width'} className={`hidden md:flex w-11 h-11 items-center justify-center transition-colors ${mobilePreview ? 'text-accent' : 'text-muted hover:text-ink'}`}>
                  {mobilePreview ? <Monitor size={20} /> : <Smartphone size={20} />}
                </button>
              )}
              <button onClick={handleLogout} aria-label="Log out" title="Log out" className="w-11 h-11 flex items-center justify-center text-muted hover:text-alert transition-colors">
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-5 pt-4 pb-32 md:px-10 md:pt-8 md:pb-12">
          <div className={`mx-auto transition-all duration-300 ${widthClass}`}>

          {viewMode === 'ADMIN' && (
            <AdminDashboard
              clients={clients}
              fullClients={clients}
              onOpenPortal={(id) => { setCurrentClientData(mergeClient(clients.find(c => c.id === id)!)); setViewMode('CLIENT'); }}
              onEditPortal={(id) => { setCurrentClientData(mergeClient(clients.find(c => c.id === id)!)); setPendingEditorPlanMode('live'); setViewMode('TRAINER'); }}
              onArchiveClient={handleArchiveClient}
              onAddClient={() => {
                const newId = `client-${Date.now()}`;
                setCurrentClientData({ ...EMPTY_CLIENT, id: newId });
                setPendingEditorPlanMode('live');
                setViewMode('TRAINER');
              }}
              onOpenBranding={() => setViewMode('LANDING_EDITOR')}
              version={APP_VERSION}
              isMasterNode={true}
            />
          )}

          {viewMode === 'SAVED_PROGRAMS' && (
            <MasterLibrary
              onLoadIntoEditor={(clientId, templateWorkout, targetModuleId, planTarget) => {
                const client = clients.find(c => c.id === clientId);
                if (!client) return;

                if (planTarget === 'draft') {
                  // Initialize draftWorkouts from live if none exist yet
                  let draftWorkouts = [...(client.draftWorkouts && client.draftWorkouts.length > 0 ? client.draftWorkouts : client.workouts)];
                  if (targetModuleId === 'NEW') {
                    const usedLetters = draftWorkouts.map(w => w.name.toUpperCase());
                    const nextLetter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').find(l => !usedLetters.includes(l)) || 'X';
                    draftWorkouts.push({ ...templateWorkout, name: nextLetter });
                  } else {
                    draftWorkouts = draftWorkouts.map(w =>
                      w.id === targetModuleId ? { ...templateWorkout, name: w.name } : w
                    );
                  }
                  const updatedClient = mergeClient({ ...client, draftWorkouts });
                  setClients(prev => (prev ?? []).map(c => c.id === clientId ? updatedClient : c));
                  syncService.updateDocument('clients', clientId, { draftWorkouts });
                } else {
                  // Live plan — save directly
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
                  setClients(prev => (prev ?? []).map(c => c.id === clientId ? updatedClient : c));
                  syncService.updateDocument('clients', clientId, { workouts: updatedWorkouts });
                }
                // Stay on library page — no navigation
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
              initialPlanMode={pendingEditorPlanMode}
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
            <div className="flex flex-col gap-4">
              {authStatus.type === 'COACH' && (
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => setViewMode('ADMIN')}
                    className="flex items-center gap-1.5 h-11 pr-3 text-muted hover:text-ink text-[15px] font-bold transition-colors"
                  >
                    <ChevronLeft size={18} /> Your clients
                  </button>
                  <span className="text-[13px] font-semibold text-muted truncate">{firstName}'s page</span>
                </div>
              )}
              {checkInBanner()}
              <div id="workout-section">
                <WorkoutLibrary
                  workouts={currentClientData.workouts || []}
                  clientData={currentClientData}
                  accentColor={landingConfig.accentColor}
                  isCoach={authStatus.type === 'COACH'}
                />
              </div>
              {/* Tal has a Goals tab; the coach ticks goals off from here. */}
              {authStatus.type === 'COACH' && (
                <div className="pt-6">
                  <GoalTracker
                    goals={currentClientData.goals || []}
                    isCoach
                    onToggleMiniGoal={(goalId, miniIdx) => handleToggleMiniGoal(currentClientData.id, goalId, miniIdx)}
                  />
                </div>
              )}
            </div>
          )}

          {viewMode === 'GOALS' && currentClientData && (
            <GoalTracker
              goals={currentClientData.goals || []}
              isCoach={authStatus.type === 'COACH'}
              onToggleMiniGoal={(goalId, miniIdx) => handleToggleMiniGoal(currentClientData.id, goalId, miniIdx)}
            />
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

      {/* Phone: the menu sits at the bottom, with words. */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-navbar border-t border-line grid pt-2.5"
        style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))`, paddingBottom: 'max(14px, env(safe-area-inset-bottom, 0px))' }}
      >
        {navItems.map(item => (
          <NavBtn key={item.mode} item={item} active={viewMode === item.mode} onClick={() => setViewMode(item.mode)} />
        ))}
      </nav>
    </div>
  );
};

type NavItem = { mode: ViewMode; label: string; icon: React.ReactNode; badge?: number };

const NavBtn = ({ item, active, onClick, vertical }: { item: NavItem; active: boolean; onClick: () => void; vertical?: boolean }) => (
  <button
    onClick={onClick}
    aria-current={active ? 'page' : undefined}
    className={`relative flex flex-col items-center gap-1 min-h-[44px] text-xs transition-colors ${vertical ? 'w-full py-3' : ''} ${active ? 'text-accent font-extrabold' : 'text-muted font-semibold hover:text-ink'}`}
  >
    {item.icon}
    {!!item.badge && item.badge > 0 && (
      <span className="absolute -top-1 left-1/2 ml-1.5 min-w-[18px] h-[18px] px-[5px] rounded-full bg-alert text-onaccent text-[11px] font-extrabold flex items-center justify-center leading-none pointer-events-none">
        {item.badge > 9 ? '9+' : item.badge}
      </span>
    )}
    {item.label}
  </button>
);

const App = () => (
  <AppProvider>
    <MainApp />
  </AppProvider>
);

export default App;