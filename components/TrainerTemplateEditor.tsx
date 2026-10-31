import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Eye, EyeOff, Zap, Check, Library, Type, RefreshCw, Archive, Play, PlayCircle, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { ClientData, Workout, Exercise, Goal, MiniGoal, WorkoutTemplate } from '../types';
import { db, VideoFile } from '../db';
import { useApp } from '../AppContext';
import { getSkillVideos } from '../firebase/skillVideos';
import { getBillingCycle, formatBillingDate, getMonthsActive } from '../billing';
import { niceCase, textDir, exerciseMeta } from './ui';


interface Props {
  client: ClientData;
  onUpdate: (data: ClientData) => void;
  onAddClient: (data: ClientData) => void;
  onArchive?: (client: ClientData) => void;
  isEditing: boolean;
  initialPlanMode?: 'live' | 'draft';
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

const TrainerTemplateEditor: React.FC<Props> = ({ client, onUpdate, onAddClient, onArchive, isEditing, initialPlanMode }) => {
  const { savedWorkouts, setSavedWorkouts, cloudSync, syncService } = useApp();
  const [localClient, setLocalClient] = useState<ClientData>(client);
  const [showPassword, setShowPassword] = useState(false);
  const [isCapsLock, setIsCapsLock] = useState(false);
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(client.workouts[0]?.id || null);
  const [planMode, setPlanMode] = useState<'live' | 'draft'>(initialPlanMode || 'live');
  const [activeDraftWorkoutId, setActiveDraftWorkoutId] = useState<string | null>(null);
  const [countrySearch, setCountrySearch] = useState(localClient.country || '');
  const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);
  const [exerciseSuggestions, setExerciseSuggestions] = useState<Record<string, VideoFile[]>>({});
  const [saveIndicatorId, setSaveIndicatorId] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [pendingSaveWorkout, setPendingSaveWorkout] = useState<Workout | null>(null);
  const [saveCategory, setSaveCategory] = useState('');
  const [saveSubCategory, setSaveSubCategory] = useState('');
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [newSubCategoryInput, setNewSubCategoryInput] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  // UI Confirmation States
  const [deletingWorkoutId, setDeletingWorkoutId] = useState<string | null>(null);
  const [deletingExerciseId, setDeletingExerciseId] = useState<string | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
  const [deletingMiniGoalKey, setDeletingMiniGoalKey] = useState<string | null>(null);

  const countryRef = useRef<HTMLDivElement>(null);

  // Which folded sections and exercises are open. A new client starts with the
  // two sections that have to be filled in before saving.
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(isEditing ? [] : ['login', 'personal'])
  );
  const [openExercises, setOpenExercises] = useState<Set<string>>(new Set());
  const toggleSection = (key: string) =>
    setOpenSections(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const toggleExercise = (id: string) =>
    setOpenExercises(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const openExercise = (...ids: string[]) =>
    setOpenExercises(prev => { const n = new Set(prev); ids.forEach(id => n.add(id)); return n; });

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
      // Monthly members have no end date — seed the payment date from the start instead.
      if (prev.billingType === 'monthly') {
        return {
          ...prev,
          programStartDate: val,
          billingAnchorDate: prev.billingAnchorDate || val
        };
      }
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
      if (val === 'monthly') {
        return {
          ...prev,
          billingType: 'monthly',
          programEndDate: '',
          billingAnchorDate: prev.billingAnchorDate || prev.programStartDate || ''
        };
      }
      const calculatedEnd = calculateEndDate(prev.programStartDate || '', val);
      return { 
        ...prev, 
        billingType: 'fixed',
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
    if (!localClient.username) return alert("Please set a username for account access");
    // A password is only needed the first time, to create the login account.
    if (!localClient.authUid && !localClient.password) return alert("Please set a password so the athlete can log in");
    
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

  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  const reLetterWorkouts = (workouts: Workout[]): Workout[] =>
    workouts.map((w, i) => ({ ...w, name: ALPHABET[i] ?? String(i + 1) }));

  const addWorkout = () => {
    const newId = generateUniqueId('w');
    setLocalClient((prev: ClientData) => {
      const sourceWorkouts = planMode === 'draft' ? (prev.draftWorkouts || []) : prev.workouts;
      const activeId = planMode === 'draft' ? activeDraftWorkoutId : activeWorkoutId;
      const activeIdx = sourceWorkouts.findIndex(w => w.id === activeId);
      const insertAt = activeIdx >= 0 ? activeIdx + 1 : sourceWorkouts.length;
      const inserted = [
        ...sourceWorkouts.slice(0, insertAt),
        { id: newId, name: '_', title: '', exercises: [] },
        ...sourceWorkouts.slice(insertAt),
      ];
      const reLettered = reLetterWorkouts(inserted);
      if (planMode === 'draft') return { ...prev, draftWorkouts: reLettered };
      return { ...prev, workouts: reLettered };
    });
    if (planMode === 'draft') setActiveDraftWorkoutId(newId);
    else setActiveWorkoutId(newId);
  };

  const moveWorkout = (direction: 'left' | 'right') => {
    setLocalClient((prev: ClientData) => {
      const sourceWorkouts = planMode === 'draft' ? (prev.draftWorkouts || []) : prev.workouts;
      const activeId = planMode === 'draft' ? activeDraftWorkoutId : activeWorkoutId;
      const idx = sourceWorkouts.findIndex(w => w.id === activeId);
      if (idx < 0) return prev;
      const newIdx = direction === 'left' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= sourceWorkouts.length) return prev;
      const reordered = [...sourceWorkouts];
      [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
      const reLettered = reLetterWorkouts(reordered);
      if (planMode === 'draft') return { ...prev, draftWorkouts: reLettered };
      return { ...prev, workouts: reLettered };
    });
  };

  const executeDeleteWorkout = (id: string) => {
    setLocalClient((prev: ClientData) => {
      if (planMode === 'draft') {
        const updatedDraft = (prev.draftWorkouts || []).filter(w => w.id !== id);
        if (activeDraftWorkoutId === id) {
          setActiveDraftWorkoutId(updatedDraft[0]?.id || null);
        }
        return { ...prev, draftWorkouts: updatedDraft };
      }
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
    setPendingSaveWorkout(workout);
    setSaveCategory('');
    setSaveSubCategory('');
    setNewCategoryInput('');
    setNewSubCategoryInput('');
    setShowSaveModal(true);
  };

  const confirmSaveToLibrary = () => {
    if (!pendingSaveWorkout) return;
    const cat = (newCategoryInput.trim() || saveCategory).trim();
    const sub = (newSubCategoryInput.trim() || saveSubCategory).trim();
    const template: WorkoutTemplate = {
      ...pendingSaveWorkout,
      id: generateUniqueId('tmpl'),
      savedAt: new Date().toISOString(),
      originalClientName: localClient.name,
      ...(cat ? { category: cat } : {}),
      ...(sub ? { subCategory: sub } : {}),
    };
    setSavedWorkouts(prev => [...prev, template]);
    setSaveIndicatorId(pendingSaveWorkout.id);
    syncService.updateDocument('master_library', template.id, template);
    setShowSaveModal(false);
    setPendingSaveWorkout(null);
    setTimeout(() => setSaveIndicatorId(null), 3000);
  };

  const addExercise = (workoutId: string, afterExerciseId?: string) => {
  const newExercise: Exercise = {
    id: generateUniqueId('ex'),
    name: '',
    sets: '',
    reps: '',
    notes: '',
    restTime: '',
    category: 'strength'
  };

  const mapWorkout = (w: Workout) => {
    if (w.id !== workoutId) return w;
    if (!afterExerciseId) return { ...w, exercises: [...w.exercises, newExercise] };
    const index = w.exercises.findIndex(ex => ex.id === afterExerciseId);
    const newExercises = [...w.exercises];
    newExercises.splice(index + 1, 0, newExercise);
    return { ...w, exercises: newExercises };
  };

  setLocalClient((prev: ClientData) => {
    if (planMode === 'draft') {
      return { ...prev, draftWorkouts: (prev.draftWorkouts || []).map(mapWorkout) };
    }
    return { ...prev, workouts: prev.workouts.map(mapWorkout) };
  });
  openExercise(newExercise.id);
};

const addHeader = (workoutId: string, afterExerciseId?: string) => {
  const newHeader: Exercise = {
    id: generateUniqueId('hd'),
    name: '',
    sets: '',
    reps: '',
    notes: '',
    restTime: '',
    category: 'header'
  };

  const mapWorkout = (w: Workout) => {
    if (w.id !== workoutId) return w;
    if (!afterExerciseId) return { ...w, exercises: [...w.exercises, newHeader] };
    const index = w.exercises.findIndex(ex => ex.id === afterExerciseId);
    const newExercises = [...w.exercises];
    newExercises.splice(index + 1, 0, newHeader);
    return { ...w, exercises: newExercises };
  };

  setLocalClient((prev: ClientData) => {
    if (planMode === 'draft') {
      return { ...prev, draftWorkouts: (prev.draftWorkouts || []).map(mapWorkout) };
    }
    return { ...prev, workouts: prev.workouts.map(mapWorkout) };
  });
  openExercise(newHeader.id);
};

const addSuperset = (workoutId: string, afterExerciseId?: string) => {
  const groupId = generateUniqueId('ss');
  const ex1: Exercise = { id: generateUniqueId('ex'), name: '', sets: '', reps: '', notes: '', restTime: '', category: 'strength', supersetGroup: groupId };
  const ex2: Exercise = { id: generateUniqueId('ex'), name: '', sets: '', reps: '', notes: '', restTime: '', category: 'strength', supersetGroup: groupId };
  const mapWorkout = (w: Workout) => {
    if (w.id !== workoutId) return w;
    if (!afterExerciseId) return { ...w, exercises: [...w.exercises, ex1, ex2] };
    const index = w.exercises.findIndex(ex => ex.id === afterExerciseId);
    const newExercises = [...w.exercises];
    newExercises.splice(index + 1, 0, ex1, ex2);
    return { ...w, exercises: newExercises };
  };
  setLocalClient((prev: ClientData) => {
    if (planMode === 'draft') {
      return { ...prev, draftWorkouts: (prev.draftWorkouts || []).map(mapWorkout) };
    }
    return { ...prev, workouts: prev.workouts.map(mapWorkout) };
  });
  openExercise(ex1.id, ex2.id);
};

const addToSuperset = (workoutId: string, afterExerciseId: string, groupId: string) => {
  const newEx: Exercise = { id: generateUniqueId('ex'), name: '', sets: '', reps: '', notes: '', restTime: '', category: 'strength', supersetGroup: groupId };
  const mapWorkout = (w: Workout) => {
    if (w.id !== workoutId) return w;
    const index = w.exercises.findIndex(ex => ex.id === afterExerciseId);
    const newExercises = [...w.exercises];
    newExercises.splice(index + 1, 0, newEx);
    return { ...w, exercises: newExercises };
  };
  setLocalClient((prev: ClientData) => {
    if (planMode === 'draft') {
      return { ...prev, draftWorkouts: (prev.draftWorkouts || []).map(mapWorkout) };
    }
    return { ...prev, workouts: prev.workouts.map(mapWorkout) };
  });
  openExercise(newEx.id);
};

  const executeDeleteExercise = (workoutId: string, exerciseId: string) => {
    setLocalClient((prev: ClientData) => {
      if (planMode === 'draft') {
        return {
          ...prev,
          draftWorkouts: (prev.draftWorkouts || []).map((w: Workout) => w.id === workoutId ? { ...w, exercises: w.exercises.filter(ex => ex.id !== exerciseId) } : w)
        };
      }
      return {
        ...prev,
        workouts: prev.workouts.map((w: Workout) => w.id === workoutId ? { ...w, exercises: w.exercises.filter(ex => ex.id !== exerciseId) } : w)
      };
    });
    setDeletingExerciseId(null);
  };
const updateExercise = async (
  workoutId: string,
  exerciseId: string,
  field: keyof Exercise,
  value: any
) => {
  const normalize = (s: string) =>
    s.trim().replace(/\s+/g, ' ').toUpperCase();

  // ✅ Update state FIRST (so input never locks)
  const mapWorkoutEx = (w: Workout) => {
    if (w.id !== workoutId) return w;
    return {
      ...w,
      exercises: w.exercises.map(ex => {
        if (ex.id !== exerciseId) return ex;
        return {
          ...ex,
          [field]: value,
          // 🔥 IMPORTANT: always remove video when editing name
          ...(field === 'name' ? { videoId: undefined, videoUrl: undefined, videoThumbnail: undefined } : {})
        };
      })
    };
  };

  setLocalClient((prev: ClientData) => {
    if (planMode === 'draft') {
      return { ...prev, draftWorkouts: (prev.draftWorkouts || []).map(mapWorkoutEx) };
    }
    return { ...prev, workouts: prev.workouts.map(mapWorkoutEx) };
  });

  // ✅ THEN handle suggestions AFTER state update
  if (field === 'name') {
    if (value.trim().length === 0) {
      setExerciseSuggestions(prev => {
        const next = { ...prev };
        delete next[exerciseId];
        return next;
      });
      return;
    }

    const allSkills = await getSkillVideos();

const query = normalize(value);

// Priority 1: starts with
const startsWithMatches = allSkills.filter(v =>
  normalize(v.name).startsWith(query)
);

// Priority 2: includes (keyword anywhere)
const includesMatches = allSkills.filter(v =>
  normalize(v.name).includes(query) &&
  !normalize(v.name).startsWith(query)
);

// Merge results (best first)
const matches = [...startsWithMatches, ...includesMatches];
    setExerciseSuggestions(prev => ({
      ...prev,
      [exerciseId]: matches
    }));
  }
};


  const selectExerciseSuggestion = (workoutId: string, exerciseId: string, video: VideoFile) => {
    const mapWorkout = (w: Workout) => {
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
    };
    setLocalClient((prev: ClientData) => {
      if (planMode === 'draft') {
        return { ...prev, draftWorkouts: (prev.draftWorkouts || []).map(mapWorkout) };
      }
      return { ...prev, workouts: prev.workouts.map(mapWorkout) };
    });
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

  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const publishDraft = () => {
    const firstId = (localClient.draftWorkouts || [])[0]?.id || null;
    setLocalClient(prev => ({ ...prev, workouts: prev.draftWorkouts || [], draftWorkouts: [] }));
    setPlanMode('live');
    setActiveWorkoutId(firstId);
    setConfirmPublish(false);
  };

  const discardDraft = () => {
    setLocalClient(prev => ({ ...prev, draftWorkouts: [] }));
    setActiveDraftWorkoutId(null);
    setPlanMode('live');
    setConfirmDiscard(false);
  };

  const switchToDraft = () => {
    setPlanMode('draft');
    if (!localClient.draftWorkouts || localClient.draftWorkouts.length === 0) {
      // No draft yet — seed it from the live plan so coach has a starting point
      const seededDraft = localClient.workouts.map(w => ({
        ...w,
        id: generateUniqueId('dw'),
        exercises: w.exercises.map(ex => ({ ...ex, id: generateUniqueId('ex') })),
      }));
      setLocalClient(prev => ({ ...prev, draftWorkouts: seededDraft }));
      setActiveDraftWorkoutId(seededDraft[0]?.id || null);
    } else {
      const first = localClient.draftWorkouts[0]?.id || null;
      if (!activeDraftWorkoutId) setActiveDraftWorkoutId(first);
    }
  };

  const activeWorkout = planMode === 'draft'
    ? (localClient.draftWorkouts || []).find(w => w.id === activeDraftWorkoutId)
    : localClient.workouts.find(w => w.id === activeWorkoutId);

  const firstName = (localClient.firstName ?? localClient.name?.split(' ')[0]) || 'the client';
  const loginReady = !!(localClient.username && (localClient.authUid || localClient.password));
  const personalSummary = [
    localClient.gender,
    localClient.level,
    localClient.billingType === 'monthly'
      ? 'Monthly'
      : localClient.programLength ? `${localClient.programLength} month${localClient.programLength === '1' ? '' : 's'}` : '',
  ].filter(Boolean).join(' · ') || 'Not filled in yet';
  const noteFirstLine = (localClient.generalNotes || '').split('\n').find(l => l.trim()) || '';
  const goalCount = localClient.goals.length;
  const tabWorkouts = planMode === 'draft' ? (localClient.draftWorkouts || []) : localClient.workouts;
  const activeTabId = planMode === 'draft' ? activeDraftWorkoutId : activeWorkoutId;
  const activeIdx = tabWorkouts.findIndex(w => w.id === activeTabId);

  const updateActiveWorkout = (field: 'name' | 'title', val: string) => {
    if (!activeWorkout) return;
    setLocalClient((prev: ClientData) => {
      if (planMode === 'draft') return { ...prev, draftWorkouts: (prev.draftWorkouts || []).map((w: Workout) => w.id === activeWorkout.id ? { ...w, [field]: val } : w) };
      return { ...prev, workouts: prev.workouts.map((w: Workout) => w.id === activeWorkout.id ? { ...w, [field]: val } : w) };
    });
  };

  const DeleteConfirm = ({ question, onNo, onYes }: { question: string; onNo: () => void; onYes: () => void }) => (
    <div className="absolute inset-0 z-50 bg-page/95 rounded-[inherit] flex flex-col items-center justify-center gap-3 p-4">
      <p className="text-[15px] font-bold text-ink text-center">{question}</p>
      <div className="flex gap-2 w-full max-w-[240px]">
        <button type="button" onClick={onNo} className="flex-1 h-11 rounded-xl border border-edge bg-card text-ink font-bold text-[14px]">No</button>
        <button type="button" onClick={onYes} className="flex-1 h-11 rounded-xl bg-alert text-onaccent font-extrabold text-[14px]">Yes, delete</button>
      </div>
    </div>
  );

  const renderExercise = (ex: Exercise, inSuperset: boolean, wId: string) => {
    const isOpen = openExercises.has(ex.id);

    if (ex.category === 'header') {
      if (!isOpen) {
        return (
          <button key={ex.id} type="button" onClick={() => toggleExercise(ex.id)} className="w-full flex gap-3 items-center border-[1.5px] border-edge rounded-[14px] px-3 py-[11px] min-h-[44px] text-left">
            <span className="flex-1 min-w-0 flex flex-col gap-px">
              <span className="text-[16px] font-extrabold text-mob" {...textDir(ex.name)}>Header: {niceCase(ex.name) || 'New section'}</span>
              {ex.notes && <span className="text-[13px] text-muted truncate" {...textDir(ex.notes)}>{ex.notes}</span>}
            </span>
            <ChevronDown size={18} className="text-muted shrink-0" />
          </button>
        );
      }
      return (
        <div key={ex.id} className="relative flex flex-col gap-3 bg-raised border border-edge rounded-2xl p-3">
          {deletingExerciseId === ex.id && (
            <DeleteConfirm question="Delete this header?" onNo={() => setDeletingExerciseId(null)} onYes={() => executeDeleteExercise(wId, ex.id)} />
          )}
          <div className="flex gap-2.5 items-center">
            <span className="flex-1 text-[16px] font-extrabold text-mob">Header</span>
            <IconBtn label="Delete header" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingExerciseId(ex.id); }}><X size={18} /></IconBtn>
            <button type="button" aria-label="Close" onClick={() => toggleExercise(ex.id)} className="w-9 h-11 flex items-center justify-center text-muted"><ChevronUp size={18} /></button>
          </div>
          <Field label="Header title">
            <input value={ex.name || ''} onChange={e => updateExercise(wId, ex.id, 'name', e.target.value)} className={INPUT} placeholder="e.g. Mobility" {...textDir(ex.name)} />
          </Field>
          <Field label="Description">
            <textarea value={ex.notes || ''} onChange={e => updateExercise(wId, ex.id, 'notes', e.target.value)} className={`${TEXTAREA} h-20`} placeholder="A line about this part of the workout…" {...textDir(ex.notes)} />
          </Field>
        </div>
      );
    }

    if (!isOpen) {
      const meta = exerciseMeta(ex);
      return (
        <button key={ex.id} type="button" onClick={() => toggleExercise(ex.id)} className="w-full flex gap-3 items-center bg-card rounded-[14px] px-3 py-[11px] min-h-[44px] text-left">
          <span className="flex-1 min-w-0 flex flex-col gap-px">
            <span className="text-[16px] font-bold text-ink" {...textDir(ex.name)}>{niceCase(ex.name) || 'New exercise'}</span>
            {(meta || ex.category === 'mobility') && (
              <span className="text-[13px] text-muted">
                {ex.category === 'mobility' && <span className="text-mob font-bold">Mobility{meta ? ' · ' : ''}</span>}
                {meta}
              </span>
            )}
          </span>
          {ex.videoUrl && <Play size={16} className="text-accent fill-accent shrink-0" />}
          <ChevronDown size={18} className="text-muted shrink-0" />
        </button>
      );
    }

    const isMobility = ex.category === 'mobility';
    return (
      <div key={ex.id} className="relative flex flex-col gap-3 bg-raised border border-edge rounded-2xl p-3">
        {deletingExerciseId === ex.id && (
          <DeleteConfirm question="Delete this exercise?" onNo={() => setDeletingExerciseId(null)} onYes={() => executeDeleteExercise(wId, ex.id)} />
        )}
        <div className="flex gap-2.5 items-center">
          <div className="flex-1 min-w-0 relative">
            <input
              value={ex.name || ''}
              onChange={e => updateExercise(wId, ex.id, 'name', e.target.value)}
              aria-label="Exercise name"
              className={`${INPUT} font-bold text-[16px]`}
              placeholder="Exercise name"
            />
            {exerciseSuggestions[ex.id]?.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-card border border-edge rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                {exerciseSuggestions[ex.id].map(suggestion => (
                  <button
                    key={suggestion.uid}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectExerciseSuggestion(wId, ex.id, suggestion);
                    }}
                    className="w-full text-left px-3 py-2.5 text-[14px] font-semibold text-ink hover:bg-raised border-b border-line last:border-0 flex justify-between items-center gap-3"
                  >
                    <span>{niceCase(suggestion.name)}</span>
                    <span className="text-[12px] text-muted shrink-0">Has a video</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" aria-label="Close" onClick={() => toggleExercise(ex.id)} className="w-9 h-11 flex items-center justify-center text-muted shrink-0"><ChevronUp size={18} /></button>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex-1 grid grid-cols-2 p-[3px] rounded-xl bg-field border border-edge">
            <button type="button" onClick={() => updateExercise(wId, ex.id, 'category', 'strength')}
              className={`h-[38px] rounded-[9px] text-[14px] ${!isMobility ? 'bg-accent text-onaccent font-extrabold' : 'text-muted font-bold'}`}>Strength</button>
            <button type="button" onClick={() => updateExercise(wId, ex.id, 'category', 'mobility')}
              className={`h-[38px] rounded-[9px] text-[14px] ${isMobility ? 'bg-mob text-onaccent font-extrabold' : 'text-muted font-bold'}`}>Mobility</button>
          </div>
          {ex.videoUrl && (
            <IconBtn label="Watch the linked video" onClick={() => setPreviewVideoUrl(ex.videoUrl!)} accent><PlayCircle size={18} /></IconBtn>
          )}
          <IconBtn label="Delete exercise" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingExerciseId(ex.id); }}><X size={18} /></IconBtn>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Sets"><input value={ex.sets || ''} onChange={e => updateExercise(wId, ex.id, 'sets', e.target.value)} className={`${INPUT} px-2.5`} placeholder="4" /></Field>
          <Field label="Target"><input value={ex.reps || ''} onChange={e => updateExercise(wId, ex.id, 'reps', e.target.value)} className={`${INPUT} px-2.5`} placeholder="10-12" /></Field>
          <Field label="Rest"><input value={ex.restTime || ''} onChange={e => updateExercise(wId, ex.id, 'restTime', e.target.value)} className={`${INPUT} px-2.5`} placeholder="90s" /></Field>
        </div>
        <Field label={`Cue for ${firstName}`}>
          <textarea value={ex.notes || ''} onChange={e => updateExercise(wId, ex.id, 'notes', e.target.value)} className={`${TEXTAREA} h-16`} placeholder="What to focus on…" {...textDir(ex.notes)} />
        </Field>
        {!inSuperset && (
          <div className="flex justify-between gap-1.5 flex-wrap">
            <button type="button" onClick={() => addExercise(wId, ex.id)} className="text-[13px] font-bold text-accent py-2">+ Exercise below</button>
            <button type="button" onClick={() => addSuperset(wId, ex.id)} className="text-[13px] font-bold text-accent py-2">+ Superset below</button>
            <button type="button" onClick={() => addHeader(wId, ex.id)} className="text-[13px] font-bold text-accent py-2">+ Header below</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-3 pb-20">
      {/* Header */}
      <div className="flex justify-between items-center gap-3">
        <span className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[24px] font-extrabold text-ink truncate">{isEditing ? (localClient.name || 'Client') : 'Add client'}</span>
          {loginReady && <span className="text-[13px] font-semibold text-done">Login set up</span>}
          {localClient.authUid && <span className="text-[12px] text-muted" title={`Auth UID: ${localClient.authUid}`}>Account connected ✓</span>}
        </span>
        {isEditing && onArchive && (
          <button
            type="button"
            onClick={() => onArchive(localClient)}
            className="h-11 px-3.5 rounded-xl border border-edge bg-card text-muted font-bold text-[14px] flex items-center gap-1.5 shrink-0"
          >
            <Archive size={16} /> Archive
          </button>
        )}
      </div>

      {/* Folded sections */}
      <div className="flex flex-col gap-1.5">
        <Fold title="Login details" summary="Username and password" open={openSections.has('login')} onToggle={() => toggleSection('login')}>
          <Field label="Username">
            <input value={localClient.username || ''} onChange={e => setLocalClient({...localClient, username: e.target.value})} className={INPUT} placeholder="itay1" />
          </Field>
          <Field label="Password">
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={localClient.password || ''} onChange={e => setLocalClient({...localClient, password: e.target.value})} onKeyDown={checkCapsLock} onKeyUp={checkCapsLock} className={`${INPUT} pr-24`} placeholder={localClient.authUid ? "Type a new one to change it" : "••••••••"} />
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {isCapsLock && <span className="text-[12px] font-bold text-warn">Caps lock on</span>}
                <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)} className="w-10 h-10 flex items-center justify-center text-muted">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </div>
          </Field>
          {!isEditing && (
            <p className="text-[13px] text-muted">{firstName === 'the client' ? 'They' : firstName} will use these to log in to their page.</p>
          )}
        </Fold>

        <Fold
          title="Weekly check-in"
          summary={localClient.weeklyCheckInEnabled ? `On: ${firstName} can send weekend reviews` : 'Off'}
          open={openSections.has('checkin')}
          onToggle={() => toggleSection('checkin')}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="flex flex-col gap-0.5">
              <span className="text-[15px] font-bold text-ink">Weekly check-in</span>
              <span className="text-[13px] text-muted">{firstName === 'the client' ? 'They' : firstName} can send a review on weekends</span>
            </span>
            <Toggle on={!!localClient.weeklyCheckInEnabled} onClick={() => setLocalClient(prev => ({ ...prev, weeklyCheckInEnabled: !prev.weeklyCheckInEnabled }))} />
          </div>
        </Fold>

        <Fold title="Personal details" summary={personalSummary} open={openSections.has('personal')} onToggle={() => toggleSection('personal')}>
          <div className="grid grid-cols-2 gap-2">
            <Field label="First name">
              <input value={localClient.firstName ?? (localClient.name?.split(' ')[0] ?? '')} onChange={e => {
                const v = e.target.value;
                const last = localClient.lastName ?? (localClient.name?.split(' ').slice(1).join(' ') ?? '');
                setLocalClient({...localClient, firstName: v, name: [v, last].filter(Boolean).join(' ')});
              }} className={INPUT} placeholder="John" />
            </Field>
            <Field label="Last name">
              <input value={localClient.lastName ?? (localClient.name?.split(' ').slice(1).join(' ') ?? '')} onChange={e => {
                const v = e.target.value;
                const first = localClient.firstName ?? (localClient.name?.split(' ')[0] ?? '');
                setLocalClient({...localClient, lastName: v, name: [first, v].filter(Boolean).join(' ')});
              }} className={INPUT} placeholder="Doe" />
            </Field>
          </div>
          <Field label="Email">
            <input value={localClient.email || ''} onChange={e => setLocalClient({...localClient, email: e.target.value})} className={INPUT} placeholder="athlete@mail.com" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative min-w-0" ref={countryRef}>
              <Field label="Country">
                <input
                  value={countrySearch}
                  onChange={e => {
                    setCountrySearch(e.target.value);
                    setShowCountrySuggestions(true);
                    if (e.target.value === '') setLocalClient({...localClient, country: ''});
                  }}
                  onFocus={() => setShowCountrySuggestions(true)}
                  className={INPUT}
                  placeholder="Search…"
                />
              </Field>
              {showCountrySuggestions && filteredCountries.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-card border border-edge rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                  {filteredCountries.map(c => (
                    <button
                      key={c.name}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleCountrySelect(c);
                      }}
                      className="w-full text-left px-3 py-2.5 text-[14px] font-semibold text-ink hover:bg-raised border-b border-line last:border-0 flex justify-between items-center"
                    >
                      <span>{c.name}</span>
                      <span className="text-muted">{c.dial}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Field label="Phone (with +code)">
              <input value={localClient.phone || ''} onChange={e => handlePhoneChange(e.target.value)} className={INPUT} placeholder="+972..." />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Height (cm)">
              <input value={localClient.height || ''} onChange={e => { const v = e.target.value; setLocalClient(prev => ({ ...prev, height: v })); }} className={INPUT} placeholder="180" />
            </Field>
            <Field label="Weight (kg)">
              <input value={localClient.weight || ''} onChange={e => { const v = e.target.value; setLocalClient(prev => ({ ...prev, weight: v })); }} className={INPUT} placeholder="75" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Gender">
              <select value={localClient.gender || ''} onChange={e => setLocalClient({...localClient, gender: e.target.value})} className={`${INPUT} cursor-pointer`}>
                <option value="" disabled>Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </Field>
            <Field label="Membership">
              <select value={localClient.billingType === 'monthly' ? 'monthly' : (localClient.programLength || '')} onChange={e => handleProgramLengthChange(e.target.value)} className={`${INPUT} cursor-pointer`}>
                <option value="" disabled>Select</option>
                <option value="monthly">Monthly (recurring)</option>
                {[1, 3, 6, 12].map(m => <option key={m} value={m}>{m} month{m > 1 ? 's' : ''} (fixed)</option>)}
              </select>
            </Field>
          </div>
          <Field label="Skill level">
            <select value={localClient.level || ''} onChange={e => handleLevelChange(e.target.value)} className={`${INPUT} cursor-pointer`}>
              <option value="" disabled>Select level</option>
              {["HS Foundations", "HS Balance & Control", "Advanced HS Skills"].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Start date">
              <input type="date" value={localClient.programStartDate || ''} onChange={e => handleStartDateChange(e.target.value)} className={INPUT} />
            </Field>
            {localClient.billingType === 'monthly' ? (
              <Field label="Payment date">
                <input type="date" value={localClient.billingAnchorDate || ''} onChange={e => setLocalClient({...localClient, billingAnchorDate: e.target.value})} className={INPUT} />
              </Field>
            ) : (
              <Field label="End date">
                <input type="date" value={localClient.programEndDate || ''} onChange={e => setLocalClient({...localClient, programEndDate: e.target.value})} className={INPUT} />
              </Field>
            )}
          </div>
          {localClient.billingType === 'monthly' && (() => {
            const cycle = getBillingCycle(localClient.billingAnchorDate);
            if (!cycle) return <p className="text-[13px] text-muted">Pick the day they pay</p>;
            const months = getMonthsActive(localClient.programStartDate);
            return (
              <p className="text-[13px] font-semibold text-done">
                Renews {formatBillingDate(cycle.next)} · every month
                {months !== null && months > 0 && <span className="text-muted font-normal"> · {months} mo in</span>}
              </p>
            );
          })()}
        </Fold>

        <Fold
          title="Coach note"
          summary={noteFirstLine || 'No note yet'}
          summaryDirText={noteFirstLine}
          open={openSections.has('note')}
          onToggle={() => toggleSection('note')}
        >
          <textarea
            value={localClient.generalNotes || ''}
            onChange={e => setLocalClient({...localClient, generalNotes: e.target.value})}
            className={`${TEXTAREA} h-40`}
            placeholder={`A note ${firstName === 'the client' ? 'they' : firstName} will see above the workout…`}
            {...textDir(localClient.generalNotes)}
          />
        </Fold>

        <Fold title="Goals" summary={`${goalCount} goal${goalCount === 1 ? '' : 's'}`} open={openSections.has('goals')} onToggle={() => toggleSection('goals')}>
          {localClient.goals.map(goal => (
            <div key={goal.id} className="relative flex flex-col gap-2.5 bg-raised border border-edge rounded-2xl p-3">
              {deletingGoalId === goal.id && (
                <DeleteConfirm question="Delete this goal and its steps?" onNo={() => setDeletingGoalId(null)} onYes={() => executeDeleteGoal(goal.id)} />
              )}
              <div className="flex gap-2 items-center">
                <input value={goal.icon} onChange={e => updateGoal(goal.id, 'icon', e.target.value)} aria-label="Goal icon" className={`${INPUT} w-12 px-0 text-center shrink-0`} />
                <input value={goal.title || ''} onChange={e => updateGoal(goal.id, 'title', e.target.value)} placeholder="New goal" className={`${INPUT} font-bold`} {...textDir(goal.title)} />
                <IconBtn label="Delete goal" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingGoalId(goal.id); }}><X size={18} /></IconBtn>
              </div>
              <div className="flex flex-col gap-1.5">
                {(goal.miniGoals || []).map((mini, idx) => {
                  const miniKey = `${goal.id}:${idx}`;
                  if (deletingMiniGoalKey === miniKey) {
                    return (
                      <div key={idx} className="flex items-center gap-2 min-h-[44px]">
                        <span className="flex-1 text-[14px] font-bold text-ink">Delete this step?</span>
                        <button type="button" onClick={() => setDeletingMiniGoalKey(null)} className="h-10 px-4 rounded-xl border border-edge bg-card text-ink font-bold text-[14px]">No</button>
                        <button type="button" onClick={() => executeDeleteMiniGoal(goal.id, idx)} className="h-10 px-4 rounded-xl bg-alert text-onaccent font-extrabold text-[14px]">Yes</button>
                      </div>
                    );
                  }
                  return (
                    <div key={idx} className="flex gap-2 items-center">
                      <button
                        type="button"
                        aria-label={mini.completed ? 'Mark as not done' : 'Mark as done'}
                        onClick={() => toggleMiniGoalStatus(goal.id, idx)}
                        className="w-11 h-11 flex items-center justify-center shrink-0"
                      >
                        <span className={`w-6 h-6 rounded-[7px] flex items-center justify-center ${mini.completed ? 'bg-done' : 'border-[1.5px] border-tick'}`}>
                          {mini.completed && <Check size={13} className="text-white" strokeWidth={3.5} />}
                        </span>
                      </button>
                      <input
                        value={mini.text}
                        onChange={e => updateMiniGoalText(goal.id, idx, e.target.value)}
                        placeholder="A step towards it…"
                        className={`${INPUT} h-11 ${mini.completed ? 'line-through text-muted' : ''}`}
                        {...textDir(mini.text)}
                      />
                      <button type="button" aria-label="Delete step" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingMiniGoalKey(miniKey); }} className="w-9 h-11 flex items-center justify-center text-muted shrink-0">
                        <X size={16} className="pointer-events-none" />
                      </button>
                    </div>
                  );
                })}
                <button type="button" onClick={() => addMiniGoal(goal.id)} className="self-start text-[13px] font-bold text-accent py-2">+ Add a step</button>
              </div>
            </div>
          ))}
          <button type="button" onClick={addGoal} className="h-12 rounded-[14px] border-[1.5px] border-dashed border-tick text-ink font-bold text-[14px] flex items-center justify-center gap-2">
            <Plus size={18} className="text-accent" /> New goal
          </button>
        </Fold>

        <Fold
          title="Weekly schedule"
          summary={localClient.weeklyScheduleEnabled ? `Visible to ${firstName}` : `Hidden from ${firstName}`}
          open={openSections.has('schedule')}
          onToggle={() => toggleSection('schedule')}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-[15px] font-bold text-ink">{localClient.weeklyScheduleEnabled ? `${firstName === 'the client' ? 'They' : firstName} can see it` : 'Hidden'}</span>
            <Toggle on={!!localClient.weeklyScheduleEnabled} onClick={() => setLocalClient((prev: ClientData) => ({ ...prev, weeklyScheduleEnabled: !prev.weeklyScheduleEnabled }))} />
          </div>
          {localClient.weeklyScheduleEnabled ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {DAYS_OF_WEEK.map((day, idx) => (
                <Field key={day} label={day}>
                  <select value={localClient.weeklySchedule?.[idx] || ''} onChange={e => setLocalClient((prev: ClientData) => ({ ...prev, weeklySchedule: { ...(prev.weeklySchedule || {}), [idx]: e.target.value } }))} className={`${INPUT} cursor-pointer`}>
                    <option value="">Rest day</option>
                    {localClient.workouts.map((w: Workout) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </Field>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-muted">The schedule is hidden. Switch it on to show it.</p>
          )}
        </Fold>
      </div>

      {/* Training plan */}
      <div className="flex justify-between items-center gap-2.5 pt-2 flex-wrap">
        <span className="text-[20px] font-extrabold text-ink">Training plan</span>
        <div className="flex items-center gap-2">
          {planMode === 'live' && (localClient.draftWorkouts || []).length > 0 && (
            <button type="button" onClick={switchToDraft} className="text-[13px] font-bold text-warn">Draft in progress →</button>
          )}
          <div className="grid grid-cols-2 p-[3px] rounded-xl bg-field border border-edge">
            <button type="button" onClick={() => setPlanMode('live')}
              className={`h-9 px-3 rounded-[9px] text-[13px] ${planMode === 'live' ? 'bg-accent text-onaccent font-extrabold' : 'text-muted font-bold'}`}>Live plan</button>
            <button type="button" onClick={switchToDraft}
              className={`relative h-9 px-3 rounded-[9px] text-[13px] ${planMode === 'draft' ? 'bg-warn text-onaccent font-extrabold' : 'text-muted font-bold'}`}>
              Draft plan
              {(localClient.draftWorkouts || []).length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-warn rounded-full border-2 border-page" />
              )}
            </button>
          </div>
        </div>
      </div>
      {planMode === 'draft' && (
        <p className="text-[13px] font-semibold text-warn">{firstName === 'the client' ? 'They see' : `${firstName} sees`} the live plan until you publish this draft.</p>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        {tabWorkouts.map((w: Workout) => {
          const on = activeTabId === w.id;
          return (
            <button key={w.id} type="button"
              onClick={() => planMode === 'draft' ? setActiveDraftWorkoutId(w.id) : setActiveWorkoutId(w.id)}
              className={`w-11 h-11 rounded-xl text-[17px] font-extrabold shrink-0 ${on ? (planMode === 'draft' ? 'bg-warn text-onaccent' : 'bg-accent text-onaccent') : 'bg-card text-ink'}`}
            >{w.name}</button>
          );
        })}
        {tabWorkouts.length > 0 && <span className="w-px h-6 bg-line mx-0.5 shrink-0" />}
        <button type="button" aria-label="Move workout left" title="Move workout left" onClick={() => moveWorkout('left')} disabled={activeIdx <= 0}
          className="w-9 h-11 flex items-center justify-center text-muted disabled:opacity-30 shrink-0"><ChevronLeft size={18} /></button>
        <button type="button" aria-label="Move workout right" title="Move workout right" onClick={() => moveWorkout('right')} disabled={activeIdx < 0 || activeIdx >= tabWorkouts.length - 1}
          className="w-9 h-11 flex items-center justify-center text-muted disabled:opacity-30 shrink-0"><ChevronRight size={18} /></button>
        <button type="button" aria-label="Add a workout" onClick={addWorkout}
          title={activeIdx >= 0 ? `Add a workout after ${tabWorkouts[activeIdx]?.name}` : 'Add a workout'}
          className="w-11 h-11 rounded-xl border-[1.5px] border-dashed border-tick text-accent flex items-center justify-center shrink-0"><Plus size={18} /></button>
      </div>

      {activeWorkout && (
        <div key={activeWorkout.id} className="relative flex flex-col gap-3">
          {planMode === 'draft' && (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-raised border border-warn/40 rounded-[14px]">
              <Zap size={16} className="text-warn shrink-0" />
              <span className="text-[14px] font-bold text-warn">Draft: {firstName === 'the client' ? 'the client' : firstName} can't see this yet</span>
            </div>
          )}
          {deletingWorkoutId === activeWorkout.id && (
            <div className="absolute inset-0 z-[100] bg-page/95 rounded-2xl flex flex-col items-center justify-start gap-4 p-6 pt-10">
              <p className="text-[18px] font-extrabold text-ink text-center">Delete the whole workout {activeWorkout.name}?</p>
              <div className="flex gap-2 w-full max-w-sm">
                <button type="button" onClick={() => setDeletingWorkoutId(null)} className="flex-1 h-12 rounded-xl border border-edge bg-card text-ink font-bold text-[15px]">No, keep it</button>
                <button type="button" onClick={() => executeDeleteWorkout(activeWorkout.id)} className="flex-1 h-12 rounded-xl bg-alert text-onaccent font-extrabold text-[15px]">Yes, delete</button>
              </div>
            </div>
          )}

          <div className="flex items-end gap-2.5">
            <Field label="Letter" className="shrink-0">
              <input value={activeWorkout.name} onChange={e => updateActiveWorkout('name', e.target.value.toUpperCase())} maxLength={1}
                className="w-[52px] h-[46px] box-border rounded-xl border-[1.5px] border-edge bg-field text-ink text-center text-[20px] font-extrabold outline-none focus:border-accent" />
            </Field>
            <Field label="Name" className="flex-1 min-w-0">
              <input value={activeWorkout.title || ''} onChange={e => updateActiveWorkout('title', e.target.value)} className={`${INPUT} font-bold text-[16px]`} placeholder="e.g. Strength & balance" />
            </Field>
            <button
              type="button"
              onClick={() => saveToLibrary(activeWorkout)}
              aria-label="Save to library"
              title="Save to library"
              className={`h-11 rounded-xl flex items-center justify-center gap-1.5 shrink-0 ${saveIndicatorId === activeWorkout.id ? 'bg-done text-white px-3 font-bold text-[14px]' : 'w-11 border border-edge bg-card text-accent'}`}
            >
              {saveIndicatorId === activeWorkout.id ? <><Check size={18} strokeWidth={3} /> Saved</> : <Library size={18} />}
            </button>
            <IconBtn label={`Delete workout ${activeWorkout.name}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingWorkoutId(activeWorkout.id); }}><X size={18} /></IconBtn>
          </div>

          <div className="flex flex-col gap-1.5">
            {(() => {
              const nodes: React.ReactNode[] = [];
              const seen = new Set<string>();
              activeWorkout.exercises.forEach((ex: Exercise) => {
                if (seen.has(ex.id)) return;
                if (ex.supersetGroup) {
                  const group = activeWorkout.exercises.filter(e => e.supersetGroup === ex.supersetGroup);
                  group.forEach(e => seen.add(e.id));
                  const groupId = ex.supersetGroup;
                  nodes.push(
                    <div key={groupId} className="flex flex-col gap-1.5 border-[1.5px] border-accent/50 rounded-2xl p-2">
                      <span className="flex items-center gap-1.5 px-1 pt-0.5 text-[13px] font-bold text-accent">
                        <Zap size={14} /> Superset · back to back, no rest between
                      </span>
                      {group.map(ssEx => renderExercise(ssEx, true, activeWorkout.id))}
                      {group.length < 3 && (
                        <button
                          type="button"
                          onClick={() => addToSuperset(activeWorkout.id, group[group.length - 1].id, groupId)}
                          className="h-11 rounded-xl border border-dashed border-accent/50 text-[13px] font-bold text-accent"
                        >
                          + Add a 3rd exercise
                        </button>
                      )}
                    </div>
                  );
                } else {
                  seen.add(ex.id);
                  nodes.push(renderExercise(ex, false, activeWorkout.id));
                }
              });
              return nodes;
            })()}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <DashedBtn onClick={() => addExercise(activeWorkout.id)} icon={<Plus size={18} />} label="Exercise" />
            <DashedBtn onClick={() => addSuperset(activeWorkout.id)} icon={<Zap size={18} />} label="Superset" />
            <DashedBtn onClick={() => addHeader(activeWorkout.id)} icon={<Type size={18} />} label="Header" />
          </div>

          {planMode === 'draft' && (
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              {confirmPublish ? (
                <div className="flex-1 flex flex-col gap-2.5 p-3.5 bg-card border border-done rounded-[14px]">
                  <p className="text-[14px] font-bold text-ink text-center">
                    Replace {localClient.name}'s live plan with this draft?
                    <span className="block text-[13px] font-normal text-muted">This can't be undone.</span>
                  </p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setConfirmPublish(false)} className="flex-1 h-11 rounded-xl border border-edge bg-card text-ink font-bold text-[14px]">Cancel</button>
                    <button type="button" onClick={publishDraft} className="flex-1 h-11 rounded-xl bg-done text-white font-extrabold text-[14px] flex items-center justify-center gap-1.5"><Check size={16} /> Yes, publish</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmPublish(true)}
                  className="flex-1 h-[52px] rounded-[14px] bg-done text-white font-extrabold text-[15px] flex items-center justify-center gap-2">
                  <Check size={18} /> Publish the draft
                </button>
              )}
              {confirmDiscard ? (
                <div className="flex-1 flex flex-col gap-2.5 p-3.5 bg-card border border-alert rounded-[14px]">
                  <p className="text-[14px] font-bold text-ink text-center">
                    Throw away the whole draft?
                    <span className="block text-[13px] font-normal text-muted">All draft changes will be lost.</span>
                  </p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setConfirmDiscard(false)} className="flex-1 h-11 rounded-xl border border-edge bg-card text-ink font-bold text-[14px]">Cancel</button>
                    <button type="button" onClick={discardDraft} className="flex-1 h-11 rounded-xl bg-alert text-onaccent font-extrabold text-[14px] flex items-center justify-center gap-1.5"><X size={16} /> Yes, throw away</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmDiscard(true)}
                  className="flex-1 h-[52px] rounded-[14px] border border-alert/60 bg-card text-alert font-extrabold text-[15px] flex items-center justify-center gap-2">
                  <X size={18} /> Discard the draft
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={isDeploying}
        className={`h-14 rounded-[14px] font-extrabold text-[17px] mt-1 flex items-center justify-center gap-2 ${isDeploying ? 'bg-raised text-muted cursor-wait' : 'bg-accent text-onaccent'}`}
      >
        {isDeploying ? (
          <><RefreshCw size={18} className="animate-spin" /> Saving…</>
        ) : (
          isEditing ? 'Save changes' : 'Add client'
        )}
      </button>

      {/* Video preview */}
      {previewVideoUrl && (
        <div className="fixed inset-0 z-[900] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/85" onClick={() => setPreviewVideoUrl(null)} />
          <div className="relative w-full max-w-2xl">
            <button
              type="button"
              onClick={() => setPreviewVideoUrl(null)}
              className="absolute -top-12 right-0 h-11 px-3 text-muted flex items-center gap-1.5 text-[14px] font-bold"
            >
              <X size={18} /> Close
            </button>
            <video
              src={previewVideoUrl}
              controls
              autoPlay
              className="w-full rounded-2xl bg-black"
              style={{ maxHeight: '75vh' }}
            />
          </div>
        </div>
      )}

      {/* Save to library */}
      {showSaveModal && pendingSaveWorkout && (() => {
        // Read explicit folders/subfolders from localStorage (same source as MasterLibrary)
        let storedFolders: string[] = [];
        let storedSubFolders: Record<string, string[]> = {};
        try { storedFolders = JSON.parse(localStorage.getItem('ilai_library_folders') || '[]'); } catch {}
        try { storedSubFolders = JSON.parse(localStorage.getItem('ilai_library_subfolders') || '{}'); } catch {}

        const fromWorkoutsCats = savedWorkouts.map(w => w.category?.trim()).filter(Boolean) as string[];
        const existingCategories = [...new Set([...storedFolders, ...fromWorkoutsCats])].sort();

        const activeCategory = newCategoryInput.trim() || saveCategory;
        const fromWorkoutsSubs = activeCategory
          ? savedWorkouts.filter(w => w.category?.trim() === activeCategory).map(w => w.subCategory?.trim()).filter(Boolean) as string[]
          : [];
        const explicitSubs = activeCategory ? (storedSubFolders[activeCategory] || []) : [];
        const existingSubCategories = [...new Set([...explicitSubs, ...fromWorkoutsSubs])].sort();

        const activeSubCategory = newSubCategoryInput.trim() || saveSubCategory;
        const chip = (on: boolean) =>
          `h-10 px-3 rounded-xl text-[14px] ${on ? 'bg-accent text-onaccent font-extrabold' : 'border border-edge bg-card text-ink font-bold'}`;
        return (
          <div className="fixed inset-0 z-[800] flex items-end sm:items-center justify-center sm:p-4">
            <div className="absolute inset-0 bg-black/70" onClick={() => setShowSaveModal(false)} />
            <div className="relative w-full max-w-md bg-card border border-edge rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-line flex items-center justify-between gap-3">
                <span className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[13px] font-semibold text-muted">Save to library</span>
                  <span className="text-[18px] font-extrabold text-ink truncate">{niceCase(pendingSaveWorkout.title) || 'Untitled'}</span>
                </span>
                <button type="button" aria-label="Close" onClick={() => setShowSaveModal(false)} className="w-11 h-11 flex items-center justify-center text-muted"><X size={18} /></button>
              </div>

              <div className="p-5 flex flex-col gap-5">
                <div className="flex flex-col gap-2.5">
                  <span className="text-[13px] font-semibold text-muted">Folder</span>
                  {existingCategories.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {existingCategories.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => { setSaveCategory(saveCategory === cat ? '' : cat); setNewCategoryInput(''); setSaveSubCategory(''); setNewSubCategoryInput(''); }}
                          className={chip(saveCategory === cat && !newCategoryInput)}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                  <input
                    value={newCategoryInput}
                    onChange={e => { setNewCategoryInput(e.target.value); setSaveCategory(''); setSaveSubCategory(''); setNewSubCategoryInput(''); }}
                    placeholder={existingCategories.length > 0 ? 'Or type a new folder name…' : 'Type a folder name…'}
                    className={INPUT}
                  />
                </div>

                {activeCategory && (
                  <div className="flex flex-col gap-2.5">
                    <span className="text-[13px] font-semibold text-muted">Subfolder (optional)</span>
                    {existingSubCategories.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {existingSubCategories.map(sub => (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => { setSaveSubCategory(saveSubCategory === sub ? '' : sub); setNewSubCategoryInput(''); }}
                            className={chip(saveSubCategory === sub && !newSubCategoryInput)}
                          >
                            {sub}
                          </button>
                        ))}
                      </div>
                    )}
                    <input
                      value={newSubCategoryInput}
                      onChange={e => { setNewSubCategoryInput(e.target.value); setSaveSubCategory(''); }}
                      placeholder={existingSubCategories.length > 0 ? 'Or type a new subfolder…' : 'Type a subfolder name…'}
                      className={INPUT}
                    />
                  </div>
                )}

                {activeCategory && (
                  <div className="px-3.5 py-2.5 bg-field rounded-xl text-[14px] font-semibold text-muted">
                    📁 {activeCategory}{activeSubCategory ? ` › ${activeSubCategory}` : ''}
                  </div>
                )}
              </div>

              <div className="px-5 pt-1 flex gap-2" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))' }}>
                <button type="button" onClick={() => { setShowSaveModal(false); }} className="flex-1 h-12 rounded-xl border border-edge bg-card text-ink font-bold text-[15px]">
                  Cancel
                </button>
                <button type="button" onClick={confirmSaveToLibrary} className="flex-1 h-12 rounded-xl bg-accent text-onaccent font-extrabold text-[15px] truncate px-2">
                  {activeCategory ? `Save to ${activeCategory}` : 'Save (no folder)'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

const INPUT = 'h-[46px] w-full box-border rounded-xl border-[1.5px] border-edge bg-field text-ink px-3 text-[15px] font-semibold outline-none focus:border-accent';
const TEXTAREA = 'w-full box-border rounded-xl border-[1.5px] border-edge bg-field text-ink px-3 py-2.5 text-[15px] font-medium leading-relaxed outline-none resize-none focus:border-accent';

const Field = ({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) => (
  <label className={`flex flex-col gap-1.5 min-w-0 ${className}`}>
    <span className="text-[13px] font-semibold text-muted">{label}</span>
    {children}
  </label>
);

/** One line that folds open: a title, a one-line summary and a chevron. */
const Fold = ({ title, summary, summaryDirText, open, onToggle, children }: {
  title: string; summary: string; summaryDirText?: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) => (
  <div className={`rounded-[14px] ${open ? 'bg-raised border border-edge' : 'bg-card'}`}>
    <button type="button" onClick={onToggle} aria-expanded={open} className="w-full flex gap-3 items-center px-3 py-[11px] min-h-[44px] text-left">
      <span className="flex-1 min-w-0 flex flex-col gap-px">
        <span className="text-[16px] font-bold text-ink">{title}</span>
        {summaryDirText
          ? <span className="text-[13px] text-muted truncate" {...textDir(summaryDirText)}>{summary}</span>
          : <span className="text-[13px] text-muted truncate">{summary}</span>}
      </span>
      {open ? <ChevronUp size={18} className="text-muted shrink-0" /> : <ChevronDown size={18} className="text-muted shrink-0" />}
    </button>
    {open && <div className="flex flex-col gap-3 px-3 pb-3">{children}</div>}
  </div>
);

const IconBtn = ({ label, onClick, children, accent = false }: {
  label: string; onClick: (e: React.MouseEvent) => void; children: React.ReactNode; accent?: boolean;
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    className={`w-11 h-11 rounded-xl border border-edge bg-card flex items-center justify-center shrink-0 ${accent ? 'text-accent' : 'text-muted'}`}
  >
    {children}
  </button>
);

const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    onClick={onClick}
    className={`relative w-12 h-7 rounded-full shrink-0 transition-colors ${on ? 'bg-accent' : 'bg-tick'}`}
  >
    <span className={`absolute top-1 w-5 h-5 rounded-full shadow transition-all ${on ? 'left-6 bg-onaccent' : 'left-1 bg-ink'}`} />
  </button>
);

const DashedBtn = ({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) => (
  <button
    type="button"
    onClick={onClick}
    className="h-14 rounded-[14px] border-[1.5px] border-dashed border-tick text-ink font-bold text-[14px] flex flex-col items-center justify-center gap-0.5"
  >
    <span className="text-accent">{icon}</span>
    {label}
  </button>
);

export default TrainerTemplateEditor;
