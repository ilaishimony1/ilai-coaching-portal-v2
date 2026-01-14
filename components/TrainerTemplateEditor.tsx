
import React, { useState, useRef, useEffect } from 'react';
// Added RefreshCw to imports from lucide-react
import { Save, Plus, X, Dumbbell, Info, Eye, EyeOff, Target, User, Phone, Mail, Globe, Calendar, Zap, Check, Clock, Ruler as RulerIcon, Weight, Activity, Search, BarChart, Move, Shapes, Library, Download, Type, ShieldCheck, CheckCircle2, RefreshCw, Archive } from 'lucide-react';
import { ClientData, Workout, Exercise, Goal, MiniGoal, WorkoutTemplate } from '../types';
import { db, VideoFile } from '../db';
import { useApp } from '../AppContext';

interface Props {
  client: ClientData;
  onUpdate: (data: ClientData) => void;
  onAddClient: (data: ClientData) => void;
  onArchive?: (client: ClientData) => void;
  isEditing: boolean;
}

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const COUNTRY_DATA = [
  { name: "Afghanistan", dial: "+93" }, { name: "Albania", dial: "+355" }, { name: "Algeria", dial: "+213" },
  { name: "Andorra", dial: "+376" }, { name: "Angola", dial: "+244" }, { name: "Argentina", dial: "+54" },
  { name: "Armenia", dial: "+374" }, { name: "Australia", dial: "+61" }, { name: "Austria", dial: "+43" },
  { name: "Azerbaijan", dial: "+994" }, { name: "Bahamas", dial: "+1" }, { name: "Bahrain", dial: "+973" },
  { name: "Bangladesh", dial: "+880" }, { name: "Barbados", dial: "+1" }, { name: "Belarus", dial: "+375" },
  { name: "Belgium", dial: "+32" }, { name: "Belize", dial: "+501" }, { name: "Bolivia", dial: "+591" },
  { name: "Brazil", dial: "+55" }, { name: "Bulgaria", dial: "+359" }, { name: "Cambodia", dial: "+855" },
  { name: "Canada", dial: "+1" }, { name: "Chile", dial: "+56" }, { name: "China", dial: "+86" },
  { name: "Colombia", dial: "+57" }, { name: "Costa Rica", dial: "+506" }, { name: "Croatia", dial: "+385" },
  { name: "Cuba", dial: "+53" }, { name: "Cyprus", dial: "+357" }, { name: "Czech Republic", dial: "+420" },
  { name: "Denmark", dial: "+45" }, { name: "Dominican Republic", dial: "+1" }, { name: "Ecuador", dial: "+593" },
  { name: "Egypt", dial: "+20" }, { name: "El Salvador", dial: "+503" }, { name: "Estonia", dial: "+372" },
  { name: "Ethiopia", dial: "+251" }, { name: "Fiji", dial: "+679" }, { name: "Finland", dial: "+358" },
  { name: "France", dial: "+33" }, { name: "Georgia", dial: "+995" }, { name: "Germany", dial: "+49" },
  { name: "Ghana", dial: "+233" }, { name: "Greece", dial: "+30" }, { name: "Guatemala", dial: "+502" },
  { name: "Honduras", dial: "+504" }, { name: "Hungary", dial: "+36" }, { name: "Iceland", dial: "+354" },
  { name: "India", dial: "+91" }, { name: "Indonesia", dial: "+62" }, { name: "Iran", dial: "+98" },
  { name: "Iraq", dial: "+964" }, { name: "Ireland", dial: "+353" }, { name: "Israel", dial: "+972" },
  { name: "Italy", dial: "+39" }, { name: "Jamaica", dial: "+1" }, { name: "Japan", dial: "+81" },
  { name: "Jordan", dial: "+962" }, { name: "Kazakhstan", dial: "+7" }, { name: "Kenya", dial: "+254" },
  { name: "Kuwait", dial: "+965" }, { name: "Latvia", dial: "+371" }, { name: "Lebanon", dial: "+961" },
  { name: "Lithuania", dial: "+370" }, { name: "Luxembourg", dial: "+352" }, { name: "Malaysia", dial: "+60" },
  { name: "Malta", dial: "+356" }, { name: "Mexico", dial: "+52" }, { name: "Moldova", dial: "+373" },
  { name: "Monaco", dial: "+377" }, { name: "Montenegro", dial: "+382" }, { name: "Morocco", dial: "+212" },
  { name: "Netherlands", dial: "+31" }, { name: "New Zealand", dial: "+64" }, { name: "Nigeria", dial: "+234" },
  { name: "Norway", dial: "+47" }, { name: "Pakistan", dial: "+92" }, { name: "Panama", dial: "+507" },
  { name: "Paraguay", dial: "+595" }, { name: "Peru", dial: "+51" }, { name: "Philippines", dial: "+63" },
  { name: "Poland", dial: "+48" }, { name: "Portugal", dial: "+351" }, { name: "Qatar", dial: "+974" },
  { name: "Romania", dial: "+40" }, { name: "Russia", dial: "+7" }, { name: "Saudi Arabia", dial: "+966" },
  { name: "Serbia", dial: "+381" }, { name: "Singapore", dial: "+65" }, { name: "Slovakia", dial: "+421" },
  { name: "Slovenia", dial: "+386" }, { name: "South Africa", dial: "+27" }, { name: "South Korea", dial: "+82" },
  { name: "Spain", dial: "+34" }, { name: "Sri Lanka", dial: "+94" }, { name: "Sweden", dial: "+46" },
  { name: "Switzerland", dial: "+41" }, { name: "Taiwan", dial: "+886" }, { name: "Thailand", dial: "+66" },
  { name: "Turkey", dial: "+90" }, { name: "Ukraine", dial: "+380" }, { name: "United Arab Emirates", dial: "+971" },
  { name: "United Kingdom", dial: "+44" }, { name: "United States", dial: "+1" }, { name: "Uruguay", dial: "+598" },
  { name: "Uzbekistan", dial: "+998" }, { name: "Venezuela", dial: "+58" }, { name: "Vietnam", dial: "+84" }
];

const generateUniqueId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const TrainerTemplateEditor: React.FC<Props> = ({ client, onUpdate, onAddClient, onArchive, isEditing }) => {
  const { savedWorkouts, setSavedWorkouts, cloudSync } = useApp();
  const [localClient, setLocalClient] = useState<ClientData>(client);
  const [showPassword, setShowPassword] = useState(false);
  const [isCapsLock, setIsCapsLock] = useState(false);
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(client.workouts[0]?.id || null);
  const [countrySearch, setCountrySearch] = useState(localClient.country || '');
  const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);
  const [exerciseSuggestions, setExerciseSuggestions] = useState<Record<string, VideoFile[]>>({});
  const [saveIndicatorId, setSaveIndicatorId] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);

  // UI Confirmation States
  const [deletingWorkoutId, setDeletingWorkoutId] = useState<string | null>(null);
  const [deletingExerciseId, setDeletingExerciseId] = useState<string | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
  const [deletingMiniGoalKey, setDeletingMiniGoalKey] = useState<string | null>(null);

  const countryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalClient(client);
    setCountrySearch(client.country || '');
    setActiveWorkoutId(client.workouts[0]?.id || null);
    
    if (!client.programStartDate && !isEditing) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      setLocalClient(prev => ({ ...prev, programStartDate: tomorrowStr }));
    }
  }, [client, isEditing]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(event.target as Node)) {
        setShowCountrySuggestions(false);
      }
      if (Object.keys(exerciseSuggestions).length > 0) {
        setExerciseSuggestions({});
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [exerciseSuggestions]);

  const filteredCountries = countrySearch.trim() === '' 
    ? [] 
    : COUNTRY_DATA.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase())).slice(0, 5);

  const handleCountrySelect = (country: { name: string, dial: string }) => {
    setLocalClient({ 
      ...localClient, 
      country: country.name,
      phone: (!localClient.phone || localClient.phone === '+' || localClient.phone.length < 4) ? country.dial : localClient.phone
    });
    setCountrySearch(country.name);
    setShowCountrySuggestions(false);
  };

  const handlePhoneChange = (val: string) => {
    let cleanVal = val;
    if (!cleanVal.startsWith('+')) {
      cleanVal = '+' + cleanVal.replace(/[^0-9]/g, '');
    } else {
      cleanVal = '+' + cleanVal.substring(1).replace(/[^0-9]/g, '');
    }
    setLocalClient({ ...localClient, phone: cleanVal });
  };

  const handleLevelChange = async (newLevel: string) => {
    const matchingVideos = await db.videos
      .where('subCategory').equals(newLevel)
      .filter(v => v.category === 'explanation')
      .toArray();
    
    const newUids = matchingVideos.map(v => v.uid);
    
    setLocalClient((prev: ClientData) => {
      const currentAssigned = prev.assignedVideoUids || [];
      const updatedAssigned = Array.from(new Set([...currentAssigned, ...newUids]));
      
      return { 
        ...prev, 
        level: newLevel,
        assignedVideoUids: updatedAssigned
      };
    });
  };

  const calculateEndDate = (startStr: string, monthsStr: string) => {
    const start = new Date(startStr);
    const months = parseInt(monthsStr || '0');
    if (!isNaN(start.getTime()) && months > 0) {
      const end = new Date(start);
      end.setMonth(start.getMonth() + months);
      return end.toISOString().split('T')[0];
    }
    return '';
  };

  const handleStartDateChange = (val: string) => {
    setLocalClient((prev: ClientData) => {
      const calculatedEnd = calculateEndDate(val, prev.programLength || '0');
      return { 
        ...prev, 
        programStartDate: val, 
        programEndDate: calculatedEnd || prev.programEndDate 
      };
    });
  };

  const handleProgramLengthChange = (val: string) => {
    setLocalClient((prev: ClientData) => {
      const calculatedEnd = calculateEndDate(prev.programStartDate || '', val);
      return { 
        ...prev, 
        programLength: val, 
        programEndDate: calculatedEnd || prev.programEndDate 
      };
    });
  };

  const checkCapsLock = (e: React.KeyboardEvent | React.FocusEvent) => {
    setIsCapsLock((e as any).getModifierState && (e as any).getModifierState('CapsLock'));
  };

  const handleSave = () => {
    if (!localClient.name) return alert("Please enter athlete name");
    if (!localClient.username || !localClient.password) return alert("Please set username and password for account access");
    
    setIsDeploying(true);
    const finalData = { ...localClient };
    if (!isEditing && !finalData.id) {
      finalData.id = generateUniqueId('client');
    }
    
    // Simulate deployment process
    setTimeout(() => {
      onAddClient(finalData);
      setIsDeploying(false);
    }, 1500);
  };

  const addWorkout = () => {
    const newId = generateUniqueId('w');
    setLocalClient((prev: ClientData) => {
      const existingLetters = prev.workouts.map(w => w.name.toUpperCase());
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      let nextLetter = 'A';
      for (const char of alphabet) {
        if (!existingLetters.includes(char)) {
          nextLetter = char;
          break;
        }
      }
      return { ...prev, workouts: [...prev.workouts, { id: newId, name: nextLetter, title: '', exercises: [] }] };
    });
    setActiveWorkoutId(newId);
  };

  const executeDeleteWorkout = (id: string) => {
    setLocalClient((prev: ClientData) => {
      const updatedWorkouts = prev.workouts.filter(w => w.id !== id);
      if (activeWorkoutId === id) {
        setActiveWorkoutId(updatedWorkouts[0]?.id || null);
      }
      return { ...prev, workouts: updatedWorkouts };
    });
    setDeletingWorkoutId(null);
  };

  const saveToLibrary = (workout: Workout) => {
    const isDuplicate = savedWorkouts.some(t => 
      t.title.trim().toUpperCase() === workout.title.trim().toUpperCase() && 
      t.originalClientName === localClient.name
    );

    if (isDuplicate) {
      alert("This specific workout is already stored in your Library.");
      return;
    }

    const template: WorkoutTemplate = {
      ...workout,
      id: generateUniqueId('tmpl'),
      savedAt: new Date().toISOString(),
      originalClientName: localClient.name
    };
    setSavedWorkouts(prev => [...prev, template]);
    setSaveIndicatorId(workout.id);
    cloudSync.forceSync();
    setTimeout(() => setSaveIndicatorId(null), 3000);
  };

  const addExercise = (workoutId: string) => {
    setLocalClient((prev: ClientData) => ({
      ...prev,
      workouts: prev.workouts.map((w: Workout) => w.id === workoutId ? { ...w, exercises: [...w.exercises, { id: generateUniqueId('ex'), name: '', sets: '', reps: '', notes: '', restTime: '', category: 'strength' }] } : w)
    }));
  };

  const addHeader = (workoutId: string) => {
    setLocalClient((prev: ClientData) => ({
      ...prev,
      workouts: prev.workouts.map((w: Workout) => w.id === workoutId ? { ...w, exercises: [...w.exercises, { id: generateUniqueId('hd'), name: '', sets: '', reps: '', notes: '', restTime: '', category: 'header' }] } : w)
    }));
  };

  const executeDeleteExercise = (workoutId: string, exerciseId: string) => {
    setLocalClient((prev: ClientData) => ({
      ...prev,
      workouts: prev.workouts.map((w: Workout) => w.id === workoutId ? { ...w, exercises: w.exercises.filter(ex => ex.id !== exerciseId) } : w)
    }));
    setDeletingExerciseId(null);
  };

  const updateExercise = async (workoutId: string, exerciseId: string, field: keyof Exercise, value: any) => {
    let updatedValue = value;
   

    if (field === 'name') {
      const searchVal = (value as string).trim().toUpperCase();
      if (searchVal.length > 0) {
        const matches = await db.videos
          .where('category').equals('skill')
          .filter(v => v.name.toUpperCase().startsWith(searchVal))
          .toArray();
        
        setExerciseSuggestions(prev => ({ ...prev, [exerciseId]: matches.slice(0, 5) }));
        
        const skillVideo = matches.find(v => v.name.toUpperCase() === searchVal);
        
      } else {
        setExerciseSuggestions(prev => {
          const newState = { ...prev };
          delete newState[exerciseId];
          return newState;
        });
      }
    }

    setLocalClient((prev: ClientData) => ({
      ...prev,
      workouts: prev.workouts.map((w: Workout) => {
        if (w.id !== workoutId) return w;
        return {
          ...w,
          exercises: w.exercises.map((ex: Exercise) => {
            if (ex.id !== exerciseId) return ex;
            const updates: Partial<Exercise> = { [field]: updatedValue };
            return { ...ex, ...updates };
          })
        };
      })
    }));
  };

  const selectExerciseSuggestion = (workoutId: string, exerciseId: string, video: VideoFile) => {
    setLocalClient((prev: ClientData) => ({
      ...prev,
      workouts: prev.workouts.map((w: Workout) => {
        if (w.id !== workoutId) return w;
        return {
          ...w,
          exercises: w.exercises.map((ex: Exercise) => {
            if (ex.id !== exerciseId) return ex;
         return {
  ...ex,
  name: video.name,
  videoId: video.uid,
  videoUrl: video.videoUrl || video.url,
  videoThumbnail: video.thumbnail || null,
};


          })
        };
      })
    }));
    setExerciseSuggestions(prev => {
      const newState = { ...prev };
      delete newState[exerciseId];
      return newState;
    });
  };

  const addGoal = () => {
    setLocalClient((prev: ClientData) => ({ ...prev, goals: [...prev.goals, { id: generateUniqueId('g'), title: '', icon: '🎯', miniGoals: [] }] }));
  };

  const updateGoal = (id: string, field: keyof Goal, value: any) => {
    setLocalClient((prev: ClientData) => ({ ...prev, goals: prev.goals.map(g => g.id === id ? { ...g, [field]: value } : g) }));
  };

  const executeDeleteGoal = (id: string) => {
    setLocalClient(prev => ({...prev, goals: prev.goals.filter(g => g.id !== id)}));
    setDeletingGoalId(null);
  };

  const addMiniGoal = (goalId: string) => {
    setLocalClient((prev: ClientData) => ({ ...prev, goals: prev.goals.map(g => g.id === goalId ? { ...g, miniGoals: [...(g.miniGoals || []), { text: '', completed: false }] } : g) }));
  };

  const updateMiniGoalText = (goalId: string, miniIdx: number, text: string) => {
    setLocalClient((prev: ClientData) => ({ ...prev, goals: prev.goals.map(g => g.id === goalId ? { ...g, miniGoals: (g.miniGoals || []).map((m: MiniGoal, i: number) => i === miniIdx ? { ...m, text } : m) } : g) }));
  };

  const toggleMiniGoalStatus = (goalId: string, miniIdx: number) => {
    setLocalClient((prev: ClientData) => ({ ...prev, goals: prev.goals.map(g => g.id === goalId ? { ...g, miniGoals: (g.miniGoals || []).map((m: MiniGoal, i: number) => i === miniIdx ? { ...m, completed: !m.completed } : m) } : g) }));
  };

  const executeDeleteMiniGoal = (goalId: string, miniIdx: number) => {
    setLocalClient(prev => ({ ...prev, goals: prev.goals.map(g => g.id === goalId ? { ...g, miniGoals: (g.miniGoals || []).filter((_: MiniGoal, i: number) => i !== miniIdx) } : g) }));
    setDeletingMiniGoalKey(null);
  };

  const activeWorkout = localClient.workouts.find(w => w.id === activeWorkoutId);

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col sm:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-4xl font-black brand-font uppercase text-white tracking-tight">{isEditing ? 'Athlete Protocol' : 'Add Client'}</h2>
          <p className="text-blue-500 font-black uppercase tracking-widest text-[10px]">Strategic Programming Interface</p>
        </div>
        <div className="flex items-center gap-3">
          {isEditing && onArchive && (
            <button 
              type="button" 
              onClick={() => onArchive(localClient)}
              className="px-6 py-2.5 bg-slate-900 border border-amber-500/20 text-amber-500 hover:bg-amber-600 hover:text-white rounded-2xl font-black text-[10px] tracking-widest uppercase flex items-center gap-2 transition-all shadow-xl"
            >
              <Archive size={16} /> Archive Protocol
            </button>
          )}
          {localClient.username && localClient.password && (
            <div className="flex items-center gap-3 bg-emerald-600/10 border border-emerald-500/20 px-6 py-2.5 rounded-2xl animate-in zoom-in-95">
               <ShieldCheck size={18} className="text-emerald-500" />
               <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none">Security Tokens Verified</p>
            </div>
          )}
        </div>
      </header>

      {/* Main Form Fields */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card p-8 rounded-[2.5rem] border-slate-800 space-y-6 shadow-2xl h-full">
            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2 border-b border-white/5 pb-4"><Info size={12}/> Client Username & Password</h3>
            <div className="space-y-4">
              <InfoFieldSimple label="Login Access Name" value={localClient.username} onChange={(v: string) => setLocalClient({...localClient, username: v})} placeholder="itay1" />
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase">Encryption (Password)</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={localClient.password || ''} onChange={e => setLocalClient({...localClient, password: e.target.value})} onKeyDown={checkCapsLock} onKeyUp={checkCapsLock} className="w-full bg-slate-950 border border-slate-800 p-4 pr-20 rounded-xl text-white font-bold outline-none focus:ring-1 ring-blue-600" placeholder="••••••••" />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {isCapsLock && <span className="text-[9px] font-black text-amber-500 animate-pulse">CAPS</span>}
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-600 hover:text-blue-400">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                  </div>
                </div>
              </div>
            </div>
            {!isEditing && (
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-relaxed italic">The athlete will use these credentials to access their personalized coaching terminal.</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="glass-card p-8 rounded-[3rem] border-slate-800 space-y-8 shadow-2xl h-full">
            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2 border-b border-white/5 pb-4"><User size={12}/> Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <InfoFieldIcon label="Full Name" icon={<User size={14}/>} value={localClient.name} onChange={(v: string) => setLocalClient({...localClient, name: v})} placeholder="John Doe" />
              <InfoFieldIcon label="Email Address" icon={<Mail size={14}/>} value={localClient.email} onChange={(v: string) => setLocalClient({...localClient, email: v})} placeholder="athlete@mail.com" />
              
              <div className="space-y-2 relative" ref={countryRef}>
                <label className="text-[9px] font-black text-slate-600 uppercase flex items-center gap-1"><Globe size={14}/> Country</label>
                <div className="relative">
                  <input 
                    value={countrySearch} 
                    onChange={e => {
                      setCountrySearch(e.target.value);
                      setShowCountrySuggestions(true);
                      if (e.target.value === '') setLocalClient({...localClient, country: ''});
                    }}
                    onFocus={() => setShowCountrySuggestions(true)}
                    className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white font-bold text-xs outline-none focus:ring-1 ring-blue-600" 
                    placeholder="Search Country..." 
                  />
                  {showCountrySuggestions && filteredCountries.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                      {filteredCountries.map(c => (
                        <button 
                          key={c.name} 
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleCountrySelect(c);
                          }}
                          className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-blue-600 hover:text-white transition-colors border-b border-white/5 last:border-0 flex justify-between items-center"
                        >
                          <span>{c.name}</span>
                          <span className="opacity-50">{c.dial}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase flex items-center gap-1"><Phone size={14}/> Phone (Include +Prefix)</label>
                <input 
                  value={localClient.phone || ''} 
                  onChange={e => handlePhoneChange(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white font-bold text-xs outline-none focus:ring-1 ring-blue-600" 
                  placeholder="+972..." 
                />
              </div>

              <InfoFieldIcon label="Height (CM)" icon={<RulerIcon size={14}/>} value={localClient.height} onChange={(v: string) => updateExercise(activeWorkoutId || '', '', 'height' as any, v)} placeholder="180" />
              <InfoFieldIcon label="Weight (KG)" icon={<Weight size={14}/>} value={localClient.weight} onChange={(v: string) => updateExercise(activeWorkoutId || '', '', 'weight' as any, v)} placeholder="75" />
              
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase flex items-center gap-1"><Activity size={14}/> Gender</label>
                <select value={localClient.gender || ''} onChange={e => setLocalClient({...localClient, gender: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white font-bold text-xs outline-none focus:ring-1 ring-blue-600 cursor-pointer">
                  <option value="" disabled>Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase flex items-center gap-1"><Zap size={14}/> Program Duration</label>
                <select value={localClient.programLength || ''} onChange={e => handleProgramLengthChange(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white font-bold text-xs outline-none focus:ring-1 ring-blue-600 cursor-pointer">
                  <option value="" disabled>Select Duration</option>
                  {[1, 3, 6, 12].map(m => <option key={m} value={m}>{m} Month{m > 1 ? 's' : ''}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase flex items-center gap-1"><BarChart size={14}/> Skill Level</label>
                <select value={localClient.level || ''} onChange={e => handleLevelChange(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white font-bold text-xs outline-none focus:ring-1 ring-blue-600 cursor-pointer">
                  <option value="" disabled>Select Level</option>
                  {["HS Foundations", "HS Balance & Control", "Advanced HS Skills"].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase flex items-center gap-1"><Calendar size={14}/> Start Date</label>
                <input type="date" value={localClient.programStartDate || ''} onChange={e => handleStartDateChange(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white font-bold text-xs outline-none focus:ring-1 ring-blue-600" />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase flex items-center gap-1"><Calendar size={14}/> End Date</label>
                <input type="date" value={localClient.programEndDate || ''} onChange={e => setLocalClient({...localClient, programEndDate: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white font-bold text-xs outline-none focus:ring-1 ring-blue-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Goal Tracker Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4">
          <div className="glass-card p-8 rounded-[2.5rem] border-slate-800 space-y-4 shadow-2xl h-full">
             <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] text-blue-500 border-b border-white/5 pb-4">Coaches Note</h3>
             <textarea value={localClient.generalNotes || ''} onChange={e => setLocalClient({...localClient, generalNotes: e.target.value})} className="w-full h-[300px] bg-slate-950 border border-slate-800 p-6 rounded-[1.5rem] text-white text-sm font-medium outline-none focus:ring-1 ring-blue-600 resize-none leading-relaxed" placeholder="Enter coaching cues and strategy..." />
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="glass-card p-8 rounded-[2.5rem] border-slate-800 space-y-6 shadow-2xl h-full">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2"><Target size={12}/> Sub-goals</h3>
              <button type="button" onClick={addGoal} className="text-blue-400 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:text-white transition-colors cursor-pointer"><Plus size={14}/> New Goal</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-2 no-scrollbar">
              {localClient.goals.map(goal => (
                <div key={goal.id} className="bg-slate-950/50 p-6 rounded-3xl border border-slate-900 space-y-4 relative group overflow-hidden">
                  {deletingGoalId === goal.id && (
                    <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md rounded-3xl flex flex-col items-center justify-start p-6 pt-10 animate-in fade-in duration-300">
                      <p className="text-white font-black brand-font uppercase text-[10px] mb-6 tracking-widest text-center">Delete Goal & Sub-targets?</p>
                      <div className="flex gap-2 w-full max-w-[160px]">
                        <button onClick={() => setDeletingGoalId(null)} className="flex-1 py-2 bg-slate-800 text-white rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-slate-700 transition-all">No</button>
                        <button onClick={() => executeDeleteGoal(goal.id)} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-red-500 transition-all">Yes</button>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pr-8">
                    <input value={goal.icon} onChange={e => updateGoal(goal.id, 'icon', e.target.value)} className="w-10 bg-slate-900 border border-slate-800 p-2 rounded-xl text-center" />
                    <input value={goal.title || ''} onChange={e => updateGoal(goal.id, 'title', e.target.value)} placeholder="NEW TARGET" className="flex-1 bg-slate-900 border border-slate-800 p-2 px-4 rounded-xl text-xs font-black uppercase text-white outline-none" />
                    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingGoalId(goal.id); }} className="absolute top-4 right-4 text-slate-700 hover:text-red-500 p-2 transition-all cursor-pointer flex items-center justify-center bg-slate-950/50 rounded-lg">
                      <X size={18} className="pointer-events-none" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(goal.miniGoals || []).map((mini, idx) => {
                      const miniKey = `${goal.id}:${idx}`;
                      const isDeletingMini = deletingMiniGoalKey === miniKey;

                      return (
                        <div key={idx} className="flex gap-2 items-center group/mini relative">
                          {isDeletingMini && (
                            <div className="absolute inset-0 z-50 bg-black/95 rounded-lg flex items-center justify-center gap-3 px-2 animate-in fade-in duration-200">
                              <span className="text-[7px] text-white font-black uppercase tracking-tighter shrink-0">DELETE?</span>
                              <div className="flex gap-1 flex-1">
                                <button onClick={() => setDeletingMiniGoalKey(null)} className="flex-1 py-1 bg-slate-800 text-white rounded-md font-black text-[7px] uppercase tracking-tighter">No</button>
                                <button onClick={() => executeDeleteMiniGoal(goal.id, idx)} className="flex-1 py-1 bg-red-600 text-white rounded-md font-black text-[7px] uppercase tracking-tighter">Yes</button>
                              </div>
                            </div>
                          )}

                          <button type="button" onClick={() => toggleMiniGoalStatus(goal.id, idx)} className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${mini.completed ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-950 border-slate-800'}`}>{mini.completed && <Check size={12} className="text-white" strokeWidth={4} />}</button>
                          <input value={mini.text} onChange={e => updateMiniGoalText(goal.id, idx, e.target.value)} placeholder="Milestone..." className={`flex-1 bg-transparent border-b border-slate-800 text-[10px] p-1 outline-none ${mini.completed ? 'text-slate-600 line-through' : 'text-slate-400'}`} />
                          <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingMiniGoalKey(miniKey); }} className="text-slate-800 hover:text-red-500 p-1.5 transition-all cursor-pointer flex items-center justify-center opacity-0 group-hover/mini:opacity-100">
                            <X size={12} className="pointer-events-none" />
                          </button>
                        </div>
                      );
                    })}
                    <button type="button" onClick={() => addMiniGoal(goal.id)} className="text-[9px] font-black text-slate-600 hover:text-blue-400 uppercase tracking-widest">+ Add Sub-Target</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Frequency Editor */}
      <div className="glass-card p-8 rounded-[3rem] border-slate-800 shadow-2xl space-y-8">
        <div className="flex items-center gap-4 border-b border-white/5 pb-4">
          <Clock className="text-blue-500" size={20} />
          <h3 className="text-xl font-black brand-font text-white uppercase tracking-tight">Weekly Frequency</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {DAYS_OF_WEEK.map((day, idx) => (
            <div key={day} className="">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center block w-full">{day}</label>
              <select value={localClient.weeklySchedule?.[idx] || ''} onChange={e => setLocalClient((prev: ClientData) => ({ ...prev, weeklySchedule: { ...(prev.weeklySchedule || {}), [idx]: e.target.value } }))} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-[10px] font-black uppercase text-white outline-none cursor-pointer">
                <option value="">Rest Day</option>
                {localClient.workouts.map((w: Workout) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Protocol Modules Editor */}
      <div className="space-y-8 pt-8">
        <div className="flex flex-col md:flex-row justify-between items-center px-4 gap-4">
          <div className="flex items-center gap-4">
             <Dumbbell className="text-blue-500" />
             <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">Training Plan</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2 p-2 bg-slate-950 border border-slate-800 rounded-2xl">
              {localClient.workouts.map((w: Workout) => <button key={w.id} type="button" onClick={() => setActiveWorkoutId(w.id)} className={`w-10 h-10 rounded-xl font-black text-xs transition-all ${activeWorkoutId === w.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:text-white'}`}>{w.name}</button>)}
              <button type="button" onClick={addWorkout} className="w-10 h-10 rounded-xl border border-dashed border-slate-700 text-slate-700 hover:text-blue-500 flex items-center justify-center"><Plus size={18} /></button>
            </div>
          </div>
        </div>

        {activeWorkout && (
          <div key={activeWorkout.id} className="glass-card p-10 rounded-[3rem] border-slate-800 space-y-8 relative shadow-2xl">
            {deletingWorkoutId === activeWorkout.id && (
              <div className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-xl rounded-[3rem] flex flex-col items-center justify-start p-10 pt-16 animate-in fade-in duration-300">
                <p className="text-white font-black brand-font uppercase text-2xl mb-10 tracking-tighter text-center">Delete entire Module {activeWorkout.name}?</p>
                <div className="flex gap-6 w-full max-sm:flex-col max-w-sm">
                  <button onClick={() => setDeletingWorkoutId(null)} className="flex-1 py-5 bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all">No, Keep It</button>
                  <button onClick={() => executeDeleteWorkout(activeWorkout.id)} className="flex-1 py-5 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-500 transition-all">Yes, Delete</button>
                </div>
              </div>
            )}

            <div className="flex justify-between items-start gap-6">
              <div className="flex-1 flex gap-4 items-end">
                <div className="space-y-2 shrink-0">
                  <label className="text-[9px] font-black text-slate-600 uppercase">Module ID</label>
                  <input value={activeWorkout.name} onChange={e => setLocalClient((prev: ClientData) => ({ ...prev, workouts: prev.workouts.map((w: Workout) => w.id === activeWorkout.id ? { ...w, name: e.target.value.toUpperCase() } : w) }))} className="bg-slate-900 text-2xl font-black text-white uppercase outline-none border border-slate-800 rounded-xl w-16 h-16 text-center" maxLength={1} />
                </div>
                <div className="space-y-2 flex-1">
                  <label className="text-[9px] font-black text-slate-600 uppercase">Label</label>
                  <input value={activeWorkout.title || ''} onChange={e => setLocalClient((prev: ClientData) => ({ ...prev, workouts: prev.workouts.map((w: Workout) => w.id === activeWorkout.id ? { ...w, title: e.target.value } : w) }))} className="bg-transparent text-3xl font-black text-white uppercase outline-none border-b border-slate-800/50 w-full pb-2 brand-font" placeholder="e.g. Strength & Balance" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  type="button" 
                  onClick={() => saveToLibrary(activeWorkout)}
                  title="Save to Master Library"
                  className={`p-4 rounded-2xl transition-all flex items-center justify-center border border-white/5 relative group ${saveIndicatorId === activeWorkout.id ? 'bg-emerald-600 text-white' : 'bg-slate-950/80 text-blue-500 hover:bg-blue-600 hover:text-white'}`}
                >
                  {saveIndicatorId === activeWorkout.id ? (
                    <div className="flex items-center gap-2 animate-in zoom-in duration-300">
                      <Check size={24} strokeWidth={4} className="pointer-events-none" />
                      <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">Saved!</span>
                    </div>
                  ) : (
                    <Library size={24} className="pointer-events-none" />
                  )}
                  {saveIndicatorId !== activeWorkout.id && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[7px] font-black uppercase px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">Save to Library</span>
                  )}
                </button>
                <button 
                  type="button" 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingWorkoutId(activeWorkout.id); }} 
                  className="p-4 bg-slate-950/80 rounded-2xl text-slate-700 hover:text-red-500 transition-all flex items-center justify-center border border-white/5"
                >
                  <X size={28} className="pointer-events-none" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {activeWorkout.exercises.map((ex: Exercise) => (
                <div key={ex.id} className="bg-slate-950/50 p-8 rounded-[2rem] border border-slate-900 space-y-6 relative group/ex overflow-hidden">
                  {deletingExerciseId === ex.id && (
                    <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-start p-6 pt-10 animate-in fade-in duration-300">
                      <p className="text-white font-black brand-font uppercase text-xs mb-6 tracking-widest text-center">Delete this {ex.category === 'header' ? 'Header' : 'Movement'}?</p>
                      <div className="flex gap-4 w-full max-w-[240px]">
                        <button onClick={() => setDeletingExerciseId(null)} className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all">No</button>
                        <button onClick={() => executeDeleteExercise(activeWorkout.id, ex.id)} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 transition-all">Yes</button>
                      </div>
                    </div>
                  )}

                  {ex.category === 'header' ? (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center gap-4 border-b border-blue-500/20 pb-4">
                         <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600/10 text-blue-500 rounded-lg">
                               <Type size={18} />
                            </div>
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Section Header</span>
                         </div>
                         <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingExerciseId(ex.id); }} className="p-3 bg-slate-900/80 text-slate-700 hover:text-red-500 rounded-xl transition-all">
                          <X size={20} className="pointer-events-none" />
                        </button>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Header Title</label>
                          <input 
                            value={ex.name || ''} 
                            onChange={e => updateExercise(activeWorkout.id, ex.id, 'name', e.target.value)} 
                            className="bg-slate-900 font-black text-white uppercase text-2xl brand-font outline-none w-full border border-slate-800 p-4 rounded-2xl focus:ring-1 ring-blue-500" 
                            placeholder="e.g. ENDURANCE PHASE" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Sub-header Description</label>
                          <textarea 
                            value={ex.notes || ''} 
                            onChange={e => updateExercise(activeWorkout.id, ex.id, 'notes', e.target.value)} 
                            className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 outline-none resize-none h-20 focus:ring-1 ring-blue-500" 
                            placeholder="Provide context for this section..." 
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center gap-4 border-b border-white/5 pb-4">
                         <div className="flex-1 relative">
                            <input 
                              value={ex.name || ''} 
                              onChange={e => updateExercise(activeWorkout.id, ex.id, 'name', e.target.value)} 
                              className="bg-transparent font-black text-white uppercase text-2xl brand-font outline-none w-full" 
                              placeholder="Enter Movement Name" 
                            />
                            {exerciseSuggestions[ex.id]?.length > 0 && (
                              <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                                 {exerciseSuggestions[ex.id].map(suggestion => (
                                   <button 
                                     key={suggestion.uid}
                                     onMouseDown={(e) => {
                                       e.preventDefault();
                                       selectExerciseSuggestion(activeWorkout.id, ex.id, suggestion);
                                     }}
                                     className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-blue-600 hover:text-white transition-colors border-b border-white/5 last:border-0 flex justify-between items-center"
                                   >
                                      <span>{suggestion.name}</span>
                                      <span className="text-[8px] opacity-40">AUTO-LINK SKILL</span>
                                   </button>
                                 ))}
                              </div>
                            )}
                         </div>
                         <div className="flex items-center gap-3">
                            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                               <button 
                                type="button" 
                                onClick={() => updateExercise(activeWorkout.id, ex.id, 'category', 'strength')}
                                className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${ex.category === 'strength' || !ex.category ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-white'}`}
                               >
                                Strength
                               </button>
                               <button 
                                type="button" 
                                onClick={() => updateExercise(activeWorkout.id, ex.id, 'category', 'mobility')}
                                className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${ex.category === 'mobility' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-white'}`}
                               >
                                Mobility
                               </button>
                            </div>
                            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingExerciseId(ex.id); }} className="p-3 bg-slate-900/80 text-slate-700 hover:text-red-500 rounded-xl transition-all">
                              <X size={20} className="pointer-events-none" />
                            </button>
                         </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <InfoFieldInline label="Sets" value={ex.sets} onChange={(v: string) => updateExercise(activeWorkout.id, ex.id, 'sets', v)} placeholder="4" />
                         <InfoFieldInline label="Target" value={ex.reps || ''} onChange={(v: string) => updateExercise(activeWorkout.id, ex.id, 'reps', v)} placeholder="10-12" />
                         <InfoFieldInline label="Rest" value={ex.restTime || ''} onChange={(v: string) => updateExercise(activeWorkout.id, ex.id, 'restTime', v)} placeholder="90s" />
                      </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-600 uppercase">Technical Cues</label>
                          <textarea value={ex.notes || ''} onChange={e => updateExercise(activeWorkout.id, ex.id, 'notes', e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 outline-none resize-none h-14" placeholder="Cues..." />
                        </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <button 
                type="button" 
                onClick={() => addExercise(activeWorkout.id)} 
                className="py-10 border-2 border-dashed border-slate-800 rounded-[2.5rem] text-slate-600 hover:text-blue-500 font-black uppercase text-[11px] tracking-[0.2em] transition-all flex items-center justify-center gap-3 bg-slate-950/20"
              >
                <Plus size={24} /> ADD NEW MOVEMENT
              </button>
              <button 
                type="button" 
                onClick={() => addHeader(activeWorkout.id)} 
                className="py-10 border-2 border-dashed border-slate-800 rounded-[2.5rem] text-slate-600 hover:text-amber-500 font-black uppercase text-[11px] tracking-[0.2em] transition-all flex items-center justify-center gap-3 bg-slate-950/20"
              >
                <Type size={24} /> ADD HEADER
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center pt-10 pb-20 border-t border-white/5">
        <button 
          type="button" 
          onClick={handleSave} 
          disabled={isDeploying}
          className={`w-full max-w-2xl py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl transition-all flex items-center justify-center gap-4 text-white ${isDeploying ? 'bg-slate-700 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-500'}`}
        >
          {isDeploying ? (
            <>
              <RefreshCw size={20} className="animate-spin" /> SYNCHRONIZING NODE...
            </>
          ) : (
            <>
              {isEditing ? <Save size={20} /> : <CheckCircle2 size={20} />} 
              {isEditing ? 'COMMIT CHANGES' : 'ADD CLIENT'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

const InfoFieldSimple = ({ label, value, onChange, placeholder }: any) => (
  <div className="space-y-2">
    <label className="text-[9px] font-black text-slate-600 uppercase">{label}</label>
    <input value={value || ''} onChange={e => onChange(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white font-bold outline-none focus:ring-1 ring-blue-600" placeholder={placeholder} />
  </div>
);

const InfoFieldIcon = ({ label, icon, value, onChange, placeholder }: any) => (
  <div className="space-y-2">
    <label className="text-[9px] font-black text-slate-600 uppercase flex items-center gap-1">{icon} {label}</label>
    <input value={value || ''} onChange={e => onChange(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white font-bold text-xs outline-none focus:ring-1 ring-blue-600" placeholder={placeholder} />
  </div>
);

const InfoFieldInline = ({ label, value, onChange, placeholder }: any) => (
  <div className="space-y-1">
    <label className="text-[8px] font-black text-slate-600 uppercase">{label}</label>
    <input value={value || ''} onChange={e => onChange(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm font-black text-white outline-none" placeholder={placeholder} />
  </div>
);

export default TrainerTemplateEditor;