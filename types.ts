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
  supersetGroup?: string;
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
  category?: string;
  subCategory?: string;
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
  draftWorkouts?: Workout[];
  assignedVideoUids?: string[];
  unseenVideoUids?: string[];
  coachNotes?: string;
  weeklyCheckInEnabled?: boolean;
  lastSync?: any;
}

export interface ClientSummary {
  id: string;
  name: string;
  avatar: string;
  lastActive?: string;
  programLength?: string;
  programStartDate?: string;
  programEndDate?: string;
}

export type ViewMode = 'ADMIN' | 'TRAINER' | 'CLIENT' | 'LANDING_EDITOR' | 'ARCHIVE' | 'ACADEMY' | 'CHAT' | 'SAVED_PROGRAMS' | 'WEEKLY_CHECKIN';

export interface WorkoutLog {
  id: string;
  clientId: string;
  clientName: string;
  workoutId: string;
  workoutName: string;
  workoutTitle: string;
  loggedAt: string;
  note: string;
  readByCoach: boolean;
}

export interface WeeklyCheckIn {
  id: string;
  clientId: string;
  clientName: string;
  submittedAt: string;
  readByCoach: boolean;
  programWeek: string;
  sessionsCompleted: string;
  followedProgram: string;
  smallWin: string;
  mostImprovement: string;
  biggestChallenge: string;
  mostLimiting: string;
  dontUnderstand: string;
  clearOnWork: string;
  focusNextWeek: string;
  anythingElse: string;
}

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