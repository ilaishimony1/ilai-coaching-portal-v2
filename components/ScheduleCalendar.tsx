
import React, { useState } from 'react';
import { Calendar as CalendarIcon, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ClientData } from '../types';

interface Props {
  client: ClientData;
  accentColor?: string;
}

const ScheduleCalendar: React.FC<Props> = ({ client, accentColor = '#2563eb' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  // Helper to get workout for a specific date based on weekly schedule
  const getWorkoutForDate = (date: Date) => {
    const dayOfWeek = date.getDay();
    const workoutId = client.weeklySchedule?.[dayOfWeek];
    if (!workoutId) return null;
    return client.workouts.find(w => w.id === workoutId);
  };

  const calendarDays = [];
  for (let i = 0; i < startDay; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="h-16 md:h-24 bg-transparent"></div>);
  }

  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(year, month, d);
    const workout = getWorkoutForDate(date);
    const isToday = new Date().toDateString() === date.toDateString();

    calendarDays.push(
      <div 
        key={d} 
        className={`h-16 md:h-24 rounded-xl border flex flex-col items-center justify-start p-2 gap-1 transition-all ${
          workout 
            ? 'bg-raised border-edge' 
            : 'bg-field border-line'
        } ${isToday ? 'ring-2 ring-accent' : ''}`}
      >
        <span className={`text-xs font-bold ${isToday ? 'text-accent' : 'text-muted'}`}>{d}</span>
        {workout && (
          <div 
            className="w-7 h-7 md:w-10 md:h-10 rounded-lg font-extrabold bg-accent text-onaccent text-xs md:text-sm flex items-center justify-center"
          >
            {workout.name}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 h-11 px-3.5 bg-card border border-edge rounded-xl text-ink text-sm font-bold"
      >
        <CalendarIcon size={18} className="text-accent" />
        My weekly schedule
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setIsOpen(false)}></div>
          <div className="relative w-full max-w-4xl bg-card border border-edge rounded-3xl flex flex-col overflow-hidden max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-6">
                <h2 className="text-2xl font-extrabold text-ink">{monthName} {year}</h2>
                <div className="flex gap-2">
                  <button onClick={prevMonth} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white"><ChevronLeft size={20}/></button>
                  <button onClick={nextMonth} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white"><ChevronRight size={20}/></button>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} aria-label="Close" className="w-11 h-11 flex items-center justify-center bg-raised text-ink rounded-full">
                <X size={20} />
              </button>
            </div>

            {/* Grid */}
            <div className="p-6 md:p-10 overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-7 gap-2 md:gap-4">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                  <div key={d} className="text-center text-xs font-bold text-muted mb-1">{d}</div>
                ))}
                {calendarDays}
              </div>
            </div>

            {/* Legend */}
            <div className="p-5 bg-field border-t border-line flex flex-wrap gap-6 items-center justify-center">
              {client.workouts.map(w => (
                <div key={w.id} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-extrabold bg-accent text-onaccent">{w.name}</div>
                  <span className="text-[13px] font-semibold text-muted">{w.title}</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md border border-line bg-field"></div>
                <span className="text-[13px] font-semibold text-muted">Rest day</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ScheduleCalendar;
