
import React from 'react';

interface Props {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  src?: string;
  // Added onClick prop for interactivity
  onClick?: () => void;
}

const BrandLogo: React.FC<Props> = ({ className = "", size = 'lg', src, onClick }) => {
  const isSmall = size === 'sm';

  // If a custom logo image is provided
  if (src) {
    if (isSmall) {
      return (
        <img 
          src={src} 
          alt="Logo" 
          // Added onClick handler and cursor pointer for the logo image
          onClick={onClick}
          className={`w-full h-auto object-contain block filter brightness-105 ${className} ${onClick ? 'cursor-pointer' : ''}`} 
        />
      );
    }

    return (
      <div 
        // Added onClick handler and cursor pointer for the brand container
        onClick={onClick}
        className={`flex flex-col items-center w-full justify-center ${className} ${onClick ? 'cursor-pointer' : ''}`}
      >
        <div className="flex items-center justify-center w-full overflow-hidden">
          <img 
            src={src} 
            alt="Brand Logo" 
            className="w-full h-auto object-contain block filter brightness-105" 
          />
        </div>
      </div>
    );
  }

  // Default handstand silhouette for small icon
  const HandstandSilhouette = () => (
    <svg 
      viewBox="0 0 100 100" 
      className={isSmall ? "w-6 h-6" : "w-20 h-20 md:w-32 md:h-32"} 
      fill="currentColor"
    >
      <path d="M47.2,74.5c0.5,2.1,1.1,4.2,1.6,6.3c0.4,1.8,0.8,3.5,1.2,5.3c0.1,0.5,0.2,1,0.3,1.5c0.1,0.5,0.7,0.8,1.2,0.6 c0.4-0.1,0.6-0.6,0.6-1c-0.1-1.3-0.2-2.6-0.3-3.9c-0.3-3.6-0.5-7.3-0.8-10.9c-0.1-1-0.2-1.9-0.3-2.9c3.3,0.5,6.6,1,9.9,1.5 c6.4,1,12.8,2,19.2,3c2,0.3,4.1,0.6,6.1,0.9c0.9,0.1,1.7-0.5,1.9-1.4c0.2-1.2-0.7-2.3-1.9-2.5c-4.9-0.8-9.8-1.5-14.7-2.3 c-5.2-0.8-10.3-1.6-15.5-2.4c-4.7-0.7-9.4-1.5-14.1-2.2c-0.6-0.1-1.1-0.2-1.6-0.3c-1.3-3.7-2.5-7.3-3.8-11c-0.6-1.7-1.2-3.4-1.8-5.1 c0,0-0.1-0.1-0.1-0.1c1.3-2,2.7-3.9,4-5.9c3.5-5.2,7-10.5,10.6-15.7c2.6-3.8,5.1-7.6,7.7-11.5c0.6-0.9,0.3-2-0.6-2.6 c-0.8-0.5-2-0.3-2.6,0.6c-4.4,6.4-8.8,12.8-13.2,19.2c-2.4,3.5-4.8,7.1-7.2,10.6c-0.1,0.2-0.3,0.4-0.4,0.6c-0.5,0.3-1.1,0.4-1.6,0.2 c-0.6-0.2-1-0.7-1.2-1.3c-0.5-1.9-0.9-3.7-1.4-5.6c-0.1-0.4-0.3-0.8-0.4-1.3c-0.1-0.5-0.7-0.8-1.2-0.6c-0.4,0.1-0.6,0.6-0.6,1 c0.1,1.5,0.3,3,0.4,4.5c0.1,1.1,0.2,2.3,0.3,3.4c0.1,1.8,0.3,3.5,0.4,5.3c0.1,1.1,0.2,2.3,0.3,3.4c0.1,1.1,0.2,2.3,0.3,3.4 c-0.4,1.1-0.8,2.2-1.1,3.4c-0.8,2.4-1.5,4.8-2.3,7.1c-0.3,1.1-0.6,2.1-0.9,3.2c-0.2,0.9,0.4,1.8,1.3,2.1c0.1,0,0.2,0,0.3,0 c0.8,0,1.5-0.5,1.7-1.3c0.2-0.7,0.4-1.4,0.6-2.1c0.7-2.6,1.4-5.2,2.1-7.8C46.6,76,46.9,75.3,47.2,74.5L47.2,74.5z" />
    </svg>
  );

  if (isSmall) {
    return (
      <div 
        // Added onClick handler and cursor pointer for the small icon container
        onClick={onClick}
        className={`flex flex-col items-center text-white ${className} ${onClick ? 'cursor-pointer' : ''}`}
      >
        <HandstandSilhouette />
      </div>
    );
  }

  return (
    <div 
      // Added onClick handler and cursor pointer for the main brand logo container
      onClick={onClick}
      className={`flex flex-col items-center ${className} ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex flex-col text-white text-left leading-none select-none">
        <span className="text-4xl md:text-6xl font-black brand-font tracking-tighter uppercase">ILAI</span>
        <span className="text-5xl md:text-8xl font-black brand-font tracking-tighter uppercase -mt-1 md:-mt-2">SHIMON</span>
      </div>
      <div className="w-full max-w-xs md:max-w-md mt-4 md:mt-2 px-4">
        <div className="h-[1px] bg-white/40 w-full mb-2 md:mb-4"></div>
        <div className="text-white text-center text-[10px] md:text-sm font-medium tracking-[0.4em] md:tracking-[0.6em] uppercase opacity-90">
          1:1 ONLINE COACHING
        </div>
      </div>
    </div>
  );
};

export default BrandLogo;
