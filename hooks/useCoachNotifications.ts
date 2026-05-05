import { useEffect, useRef, useState } from 'react';
import { useApp } from '../AppContext';

export function useCoachNotifications(enabled: boolean) {
  const { checkIns, workoutLogs } = useApp();
  const knownCheckInIds = useRef<Set<string> | null>(null);
  const knownWorkoutLogIds = useRef<Set<string> | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  const requestPermission = async () => {
    const hasNotification = typeof Notification !== 'undefined';
    const hasSW = 'serviceWorker' in navigator;
    alert(`Notification: ${hasNotification}, SW: ${hasSW}, permission: ${hasNotification ? Notification.permission : 'n/a'}`);
    if (!hasNotification) return;
    if (hasSW) {
      try {
        await navigator.serviceWorker.ready;
      } catch {}
    }
    const result = await Notification.requestPermission();
    alert(`Result: ${result}`);
    setPermission(result);
  };

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

  return { permission, requestPermission };
}

function notify(body: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  new Notification('Ilai Shimony Coaching', { body });
}
