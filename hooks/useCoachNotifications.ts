import { useEffect, useRef } from 'react';
import { useApp } from '../AppContext';

export function useCoachNotifications(enabled: boolean) {
  const { checkIns, workoutLogs } = useApp();
  const knownCheckInIds = useRef<Set<string> | null>(null);
  const knownWorkoutLogIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || checkIns.length === 0) return;

    if (knownCheckInIds.current === null) {
      knownCheckInIds.current = new Set(checkIns.map(c => c.id));
      return;
    }

    checkIns.forEach(checkIn => {
      if (!knownCheckInIds.current!.has(checkIn.id)) {
        knownCheckInIds.current!.add(checkIn.id);
        if (!checkIn.readByCoach) {
          notify(`${checkIn.clientName} submitted their weekly check-in ✅`);
        }
      }
    });
  }, [checkIns, enabled]);

  useEffect(() => {
    if (!enabled || workoutLogs.length === 0) return;

    if (knownWorkoutLogIds.current === null) {
      knownWorkoutLogIds.current = new Set(workoutLogs.map(l => l.id));
      return;
    }

    workoutLogs.forEach(log => {
      if (!knownWorkoutLogIds.current!.has(log.id)) {
        knownWorkoutLogIds.current!.add(log.id);
        if (!log.readByCoach) {
          notify(`${log.clientName} logged a workout — Workout ${log.workoutName} 💪`);
        }
      }
    });
  }, [workoutLogs, enabled]);
}

function notify(body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  new Notification('Ilai Shimony Coaching', { body });
}
