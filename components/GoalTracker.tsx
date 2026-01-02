
import React from 'react';
import { Target, Check } from 'lucide-react';
import { Goal } from '../types';

interface Props {
  goals: Goal[];
  onToggleMiniGoal?: (goalId: string, miniIdx: number) => void;
  isCoach?: boolean;
}

const GoalTracker: React.FC<Props> = ({ goals, onToggleMiniGoal, isCoach = false }) => {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <Target className="text-blue-500 w-6 h-6" />
        <h2 className="text-2xl font-bold uppercase brand-font">My Goals</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map(goal => (
          <div key={goal.id} className="glass-card p-8 rounded-[2.5rem] border-slate-800 hover:border-blue-500/30 transition-all shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-3xl">{goal.icon || '🎯'}</span>
              <h4 className="font-black text-xl uppercase text-slate-100">{goal.title}</h4>
            </div>
            <div className="space-y-4">
              {goal.miniGoals?.map((mini, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-center gap-3 select-none ${isCoach ? 'cursor-pointer group/item' : 'cursor-default'}`}
                  onClick={() => isCoach && onToggleMiniGoal?.(goal.id, idx)}
                >
                  {isCoach ? (
                    /* Coach View: The master control checkbox */
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                      mini.completed 
                        ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                        : 'border-slate-700 bg-slate-950 group-hover/item:border-blue-500/50'
                    }`}>
                      {mini.completed && (
                        <Check size={14} className="text-white animate-in zoom-in duration-200" strokeWidth={4} />
                      )}
                    </div>
                  ) : (
                    /* Client View: Show indicator only when completed. If not completed, show nothing left of text. */
                    mini.completed && (
                      <div className="w-5 h-5 flex items-center justify-center shrink-0 bg-emerald-500 rounded-lg shadow-[0_0_10px_rgba(16,185,129,0.4)] animate-in zoom-in duration-300">
                        <Check size={12} className="text-white" strokeWidth={4} />
                      </div>
                    )
                  )}

                  <span className={`text-sm font-bold transition-all duration-300 leading-tight ${
                    mini.completed 
                      ? 'text-slate-400 line-through decoration-white decoration-2' 
                      : 'text-slate-200'
                  } ${isCoach ? 'group-hover/item:text-white' : ''}`}>
                    {mini.text}
                  </span>
                </div>
              ))}
              {(!goal.miniGoals || goal.miniGoals.length === 0) && (
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest italic">No sub-targets defined</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default GoalTracker;
