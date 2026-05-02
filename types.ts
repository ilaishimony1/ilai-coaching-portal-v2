export interface Exercise {
  id: string;
  name: string;
  reps?: string;
  sets: string;
  duration?: string;
  notes: string;
  videoId?: string;
  restTime?: string;
  category?: 'strength' | 'mobility' | 'header';
}

export interface Workout {
  id: string;
  name: string;
  title: string;
  exercises: Exercise[];
}

export interface WorkoutTemplate extends Workout {
  savedAt: string;
  originalClientName?: string;
  tags?: string[];
}

export interface MiniGoal {
  text: string;
  completed: boolean;
}

export interface Goal {
  id: string;
  title: string;
  icon: string;
  miniGoals?: MiniGoal[];
}

export interface TrainingDay {
  date: string;
  workoutId: string;
}

export interface ClientData {
  id: string;
  name: string;
  avatar: string;
  username?: string;
  password?: string;
  email?: string;
  phone?: string;
  country?: string;
  gender?: string;
  height?: string;
  weight?: string;
  level?: string;
  programStartDate?: string;
  programEndDate?: string;
  programLength?: string;
  generalNotes?: string;
  goals: Goal[];
  schedule: TrainingDay[];
  weeklySchedule?: Record<number, string>;
  workouts: Workout[];
  assignedVideoUids?: string[];
  lastSync?: any;
}

export interface ClientSummary {
  id: string;
  name: string;
  avatar: string;
  lastActive?: string;
  programLength?: string;
  programEndDate?: string;
}

export type ViewMode = 'ADMIN' | 'TRAINER' | 'CLIENT' | 'LANDING_EDITOR' | 'ARCHIVE' | 'ACADEMY' | 'CHAT' | 'SAVED_PROGRAMS';

export type AuthStatus =
  | { type: 'NONE' }
  | { type: 'COACH' }
  | { type: 'CLIENT', clientId: string };

export interface LandingPageConfig {
  title: string;
  accentColor: string;
  logoUrl?: string;
  coachAvatar?: string;
  lastSyncDate?: string;
}