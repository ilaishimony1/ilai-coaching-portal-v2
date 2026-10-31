
import React from 'react';
import { Target, Check } from 'lucide-react';
import { Goal } from '../types';
import { textDir } from './ui';

interface Props {
  goals: Goal[];
  onToggleMiniGoal?: (goalId: string, miniIdx: number) => void;
  isCoach?: boolean;
}

const GoalTracker: React.FC<Props> = ({ goals, onToggleMiniGoal, isCoach = false }) => {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-2xl font-extrabold">{isCoach ? 'Goals' : 'My goals'}</h2>
      {goals.length === 0 && (
        <p className="text-[15px] text-muted bg-card rounded-[18px] p-4">No goals set yet.</p>
      )}
      <div className="grid grid-cols-1 gap-3">
        {goals.map(goal => (
          <div key={goal.id} className="flex flex-col gap-3.5 bg-card rounded-[18px] p-4">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-[10px] bg-raised text-accent flex items-center justify-center shrink-0 text-lg">
                {goal.icon && goal.icon !== '🎯' ? goal.icon : <Target size={20} />}
              </span>
              <h4 {...textDir(goal.title)} className="text-xl font-extrabold">{goal.title}</h4>
            </div>
            <div className="flex flex-col gap-2.5 pl-1">
              {goal.miniGoals?.map((mini, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 select-none ${isCoach ? 'cursor-pointer min-h-[44px]' : ''}`}
                  onClick={() => isCoach && onToggleMiniGoal?.(goal.id, idx)}
                >
                  {isCoach ? (
                    // Coach: a tick box per sub-goal.
                    <span className={`w-6 h-6 rounded-[7px] flex items-center justify-center shrink-0 transition-colors ${
                      mini.completed ? 'bg-done' : 'border-[1.5px] border-tick'
                    }`}>
                      {mini.completed && <Check size={13} className="text-white" strokeWidth={3.5} />}
                    </span>
                  ) : mini.completed ? (
                    // Athlete: a green tick once the coach marks it done.
                    <span className="w-5 h-5 rounded-md bg-done flex items-center justify-center shrink-0">
                      <Check size={12} className="text-white" strokeWidth={3.5} />
                    </span>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-tick shrink-0 mx-[7px]" />
                  )}
                  <span {...textDir(mini.text)} className={`text-base leading-snug ${mini.completed ? 'text-muted line-through' : 'text-ink'}`}>
                    {mini.text}
                  </span>
                </div>
              ))}
              {(!goal.miniGoals || goal.miniGoals.length === 0) && (
                <p className="text-sm text-muted">No steps added yet</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default GoalTracker;
