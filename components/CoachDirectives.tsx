
import React from 'react';
import { Quote, User } from 'lucide-react';
import BrandLogo from './BrandLogo';
import { useApp } from '../AppContext';

interface Props {
  notes?: string;
}

const CoachDirectives: React.FC<Props> = ({ notes }) => {
  const { landingConfig } = useApp();

  return (
    <section className="glass-card rounded-[2.5rem] border-slate-800 overflow-hidden shadow-2xl">
      <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center overflow-hidden relative border border-white/10 shadow-lg">
            {landingConfig.coachAvatar ? (
              <img src={landingConfig.coachAvatar} className="w-full h-full object-cover" alt="Coach Avatar" />
            ) : (
              <div className="p-2">
                <BrandLogo size="sm" />
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-blue-600 rounded-full"></div>
          </div>
          <div>
            <h2 className="text-xl font-black brand-font uppercase leading-none">Coach's Notes</h2>
            <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mt-1">Verified Protocol</p>
          </div>
        </div>
        <Quote className="text-slate-800 w-8 h-8" />
      </div>
      <div className="p-8">
        <div className="bg-slate-950/40 rounded-3xl p-6 border-l-4 border-blue-600 italic">
          <p className="text-slate-200 font-medium leading-relaxed">
            "{notes || 'Push hard through the floor. Lock your elbows. Stay tight.'}"
          </p>
        </div>
      </div>
    </section>
  );
};

export default CoachDirectives;
