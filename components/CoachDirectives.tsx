
import React from 'react';
import BrandLogo from './BrandLogo';
import { useApp } from '../AppContext';
import { textDir } from './ui';

interface Props {
  notes?: string;
}

// The coach's note to the athlete: one short strip with the coach's face,
// sitting under the workout title.
const CoachDirectives: React.FC<Props> = ({ notes }) => {
  const { landingConfig } = useApp();
  const text = notes || 'Push hard through the floor. Lock your elbows. Stay tight.';

  return (
    <section className="flex gap-2.5 items-start bg-card rounded-[14px] px-3 py-2.5">
      {landingConfig.coachAvatar ? (
        <img src={landingConfig.coachAvatar} className="w-[30px] h-[30px] rounded-full object-cover shrink-0" alt="Ilai" />
      ) : (
        <span className="w-[30px] h-[30px] rounded-full bg-raised text-ink flex items-center justify-center shrink-0 p-1">
          <BrandLogo size="sm" />
        </span>
      )}
      <p {...textDir(text)} className="flex-1 text-[15px] leading-normal text-ink whitespace-pre-line">
        {text}
      </p>
    </section>
  );
};

export default CoachDirectives;
