
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
            ? 'bg-blue-600/10 border-blue-500/30' 
            : 'bg-slate-950/40 border-slate-800/50'
        } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
      >
        <span className={`text-[10px] font-black ${isToday ? 'text-blue-400' : 'text-slate-600'}`}>{d}</span>
        {workout && (
          <div 
            className="w-7 h-7 md:w-10 md:h-10 rounded-lg font-black text-white text-xs md:text-sm flex items-center justify-center shadow-lg animate-in zoom-in duration-300"
            style={{ backgroundColor: accentColor }}
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
        className="flex items-center gap-3 px-6 py-4 bg-slate-900 border border-slate-800 rounded-2xl hover:border-blue-500/50 transition-all group shadow-xl"
      >
        <CalendarIcon className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
        <span className="text-xs font-black brand-font uppercase text-white tracking-widest">My Training Split</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setIsOpen(false)}></div>
          <div className="relative w-full max-w-4xl glass-card rounded-[3rem] border border-white/10 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            {/* Header */}
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <h2 className="text-3xl font-black brand-font uppercase text-white tracking-tight">{monthName} {year}</h2>
                <div className="flex gap-2">
                  <button onClick={prevMonth} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white"><ChevronLeft size={20}/></button>
                  <button onClick={nextMonth} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white"><ChevronRight size={20}/></button>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-3 bg-white/5 text-white rounded-full hover:bg-red-500 transition-all">
                <X size={20} />
              </button>
            </div>

            {/* Grid */}
            <div className="p-6 md:p-10 overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-7 gap-2 md:gap-4">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                  <div key={d} className="text-center text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">{d}</div>
                ))}
                {calendarDays}
              </div>
            </div>

            {/* Legend */}
            <div className="p-6 bg-slate-950/50 border-t border-white/5 flex flex-wrap gap-6 items-center justify-center">
              {client.workouts.map(w => (
                <div key={w.id} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black text-white" style={{ backgroundColor: accentColor }}>{w.name}</div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{w.title}</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md border border-slate-800 bg-slate-950/40"></div>
                <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Rest Day</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ScheduleCalendar;
