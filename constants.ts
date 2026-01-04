import { ClientData } from './types';

export const TEST_CLIENT: ClientData = {
  id: 'client-test',
  name: 'Itay Kupershtock ',
  avatar: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop',
  username: 'itay1',
  password: 'password123',
  programLength: '3',
  programStartDate: '2025-12-04',
  generalNotes: 'שים לב שאתה מתחמם כמו שצריך ומקשיב לגוף באימונים- תן בראש',
  goals: [
    {
      id: 'g1',
      title: '5 HSPU',
      icon: '🤸',
      miniGoals: [
        { text: '1 HSPU', completed: true },
        { text: '5 SETS OF 8 WALL- HSPU', completed: false },
        { text: '3 HSPU ', completed: false }
      ]
    },
    {
      id: 'g-1766734562516-mu0y0ivdp',
      title: 'STADLER PRESS ',
      icon: '🎯',
      miniGoals: [
        { text: 'NEGATIVE STADLER ', completed: true },
        { text: '2 HS PRESSES ', completed: false },
        { text: '', completed: false }
      ]
    }
  ],
  schedule: [],
  weeklySchedule: { 1: 'w1', 3: 'w1', 5: 'w1' },
  workouts: [
    {
      id: 'w1',
      name: 'A',
      title: ' HS PRESS FOCUSED SESSION ',
      exercises: [
        {
          id: 'e1',
          name: 'HS PRESS ',
          sets: '3',
          reps: '1 ',
          restTime: '3 MIN ',
          notes: 'HS PRESS ATTEMPTS- DO YOUR BEST. NO NEED TO SUCCEED ',
          category: 'strength'
        },
        {
          id: 'ex-1766734755649-7yue9uisa',
          name: 'L-SIT PULLS ',
          sets: '3',
          reps: '3',
          notes: "TRY PROTACTING AND GETTING YOUR HIPS AS HIGH AS POSSIBLE- IT'S OKAY TO TOUCH THE GROUND ",
          restTime: '2.5 MIN ',
          videoUrl: '',
          category: 'strength'
        },
        {
          id: 'ex-1766734841857-tgk1i6i90',
          name: 'BALANCE WORK ',
          sets: '0',
          reps: '0',
          notes: 'IN THIS PART REST IS UP TO YOU- OVERALL YOU NEED X10 STRADDLE FULL \nX10  STRADDLE DIAMOND X5 TUCK FULL (CAN DO WITH WALL) ',
          restTime: '0',
          videoUrl: '',
          category: 'strength'
        },
        {
          id: 'ex-1766734960256-rlnfa6seq',
          name: 'HS HOLD- ENDURANCE ',
          sets: '1',
          reps: '90 SECONDS ',
          notes: 'OPEN A 90 SEC TIMER AND TRY STANDING AS LONG AS YOU CAN ON YOUR HANDS- IF YOU FALL TAKE A BREATH AND TRY AGAIN./ OVERALL FOR 90 SEC ',
          restTime: '0 ',
          videoUrl: '',
          category: 'strength'
        },
        {
          id: 'ex-mobility-1',
          name: 'WRIST MOBILITY ',
          sets: '2',
          reps: '15 ',
          notes: 'Gentle circles and leans. Do not force range of motion.',
          restTime: '30s',
          category: 'mobility'
        }
      ]
    }
  ],
  email: 'idk@gmail.com',
  country: 'Israel',
  phone: '+972524244294',
  height: '178 ',
  weight: '72',
  gender: 'Male',
  programEndDate: '2026-03-04',
  level: 'Advanced HS Skills',
  assignedVideoUids: []
};

export const INITIAL_CONFIG = {
  title: 'ILAI SHIMON 1:1 ONLINE COACHING',
  accentColor: '#2563eb',
  logoUrl: ' https://firebasestorage.googleapis.com/v0/b/ilai-portal.firebasestorage.app/o/branding%2FLOGO%20.jpg?alt=media&token=d17da491-8e18-47b9-aa23-270758c7621b',
  coachAvatar: 'https://firebasestorage.googleapis.com/v0/b/ilai-portal.firebasestorage.app/o/branding%2Favatar.jpeg?alt=media&token=acf8bc87-55ff-4de5-aaee-2fa25c374d37',
  lastSyncDate: new Date().toISOString()
};
