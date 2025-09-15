





import React, { useContext, useState } from 'react';
import { AppContext } from '../../AppContext';
// FIX: Changed a value import of a type to a type-only import to resolve a module resolution issue.
// Corrected path to point to the consolidated types file in src/.
// FIX: Added .ts extension to ensure proper module resolution, which is critical for Supabase client typing.
// FIX: Updated import for the `View` type, which was moved to AppContext.ts to break a circular dependency.
import type { View } from '../../AppContext';

const TruckIcon = ({ className, isExiting }: { className?: string; isExiting?: boolean }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 240 120"
        className={className}
        aria-hidden="true"
    >
      {/* Motion blur lines that appear on exit */}
        {isExiting && (
            <g className="animate-fadeOut" style={{ animationDuration: '0.5s' }}>
                <path d="M5 65 H 55" stroke="currentColor" className="text-slate-500/80" strokeWidth="2" />
                <path d="M10 75 H 45" stroke="currentColor" className="text-slate-500/60" strokeWidth="3" />
                <path d="M20 85 H 60" stroke="currentColor" className="text-slate-500/70" strokeWidth="2.5" />
            </g>
        )}
        <g className={isExiting ? 'animate-truck-exit' : ''}>
            <g transform="translate(60, 20)">
                {/* Body */}
                <path d="M1,55 H50 V20 H80 L105,40 V75 H1 Z" fill="#1e293b" stroke="currentColor" className="text-slate-500" strokeWidth="2" />
                {/* Window */}
                <path d="M82,40 H103 V23 L82,23 Z" fill="#0f172a" stroke="currentColor" className="text-slate-400" strokeWidth="1.5" />
                {/* Boxes */}
                <rect x="5" y="30" width="25" height="25" fill="#a16207" stroke="currentColor" className="text-amber-300/80" strokeWidth="1.5" />
                <rect x="20" y="5" width="25" height="25" fill="#ca8a04" stroke="currentColor" className="text-amber-300/80" strokeWidth="1.5" />
                <rect x="35" y="25" width="20" height="30" fill="#854d0e" stroke="currentColor" className="text-amber-300/80" strokeWidth="1.5" />

                {/* Rear Wheel: Group for positioning */}
                <g transform="translate(25 75)">
                    {/* Inner group for rotation */}
                    <g>
                        <circle cx="0" cy="0" r="12" fill="#1e293b" stroke="#334155" strokeWidth="2.5" />
                        <circle cx="0" cy="0" r="8" fill="none" stroke="#475569" strokeWidth="1.5" />
                        <path d="M0 0 L 0 -8 M0 0 L 7 4 M0 0 L -7 4" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
                        <circle cx="0" cy="0" r="2" fill="#334155" />
                    </g>
                </g>
                {/* Front Wheel: Group for positioning */}
                <g transform="translate(85 75)">
                    {/* Inner group for rotation */}
                    <g>
                        <circle cx="0" cy="0" r="12" fill="#1e293b" stroke="#334155" strokeWidth="2.5" />
                        <circle cx="0" cy="0" r="8" fill="none" stroke="#475569" strokeWidth="1.5" />
                        <path d="M0 0 L 0 -8 M0 0 L 7 4 M0 0 L -7 4" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
                        <circle cx="0" cy="0" r="2" fill="#334155" />
                    </g>
                </g>
            </g>
        </g>
    </svg>
);


const HomeView: React.FC = () => {
  const context = useContext(AppContext);
  const [isExiting, setIsExiting] = useState(false);

  const handleStart = () => {
    if (!context || isExiting) return;
    
    // Play sound on user interaction
    // FIX: Replaced original audio URL with a known-good public URL to prevent loading errors.
    const audio = new Audio('https://bigsoundbank.com/UPLOAD/mp3/1590.mp3');
    audio.play().catch(e => console.error("Error playing sound:", e));

    setIsExiting(true);

    setTimeout(() => {
      // After animation, check if user is logged in and redirect accordingly
      if (context.user) {
        context.setView('dashboard' as View);
      } else {
        context.setView('landing' as View);
      }
    }, 1200); // Duration matches truck exit animation
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-4 bg-transparent overflow-hidden">
        {/* Main container for animation layout */}
        <div className="flex flex-col items-center justify-center gap-8 w-full max-w-4xl">

            {/* Animated Truck */}
            <div className={`w-full max-w-xs sm:max-w-sm md:max-w-md ${isExiting ? '' : 'animate-slideInFromLeft'}`}>
                <TruckIcon className="w-full h-auto text-slate-400" isExiting={isExiting} />
            </div>

            {/* Text content */}
            <div className={`flex flex-col items-center text-center transition-opacity duration-500 ${isExiting ? 'animate-fadeOut' : 'opacity-100'}`}>
                <h1 
                className="text-7xl md:text-9xl font-extrabold tracking-tighter mb-4 staggered-child" 
                style={{textShadow: '0 8px 40px rgba(0,0,0,0.5)', animationDelay: '0.4s'}}
                >
                <span className="fletapp-text-gradient bg-clip-text text-transparent bg-gradient-to-br from-amber-300 to-orange-600">Fletapp</span>
                </h1>
                <p 
                className="text-lg md:text-xl text-slate-300/80 max-w-2xl mb-12 staggered-child"
                style={{animationDelay: '0.6s'}}
                >
                La solución moderna para tus fletes. Conectamos clientes con fleteros de confianza de forma rápida y segura.
                </p>
                <div className="staggered-child" style={{animationDelay: '0.8s'}}>
                    <button
                    onClick={handleStart}
                    disabled={isExiting}
                    className="group relative text-2xl font-bold px-10 py-5 rounded-2xl bg-slate-900 text-white shadow-2xl hover:shadow-amber-500/20 transform hover:-translate-y-1 transition-all duration-300 ease-in-out focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 overflow-hidden disabled:opacity-70 disabled:cursor-wait"
                    >
                    <span className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl opacity-80 group-hover:opacity-100 transition-opacity duration-300"></span>
                    <span className="absolute inset-0.5 bg-slate-900 rounded-[14px]"></span>
                    <span className="relative fletapp-text-gradient bg-clip-text text-transparent bg-gradient-to-br from-amber-300 to-orange-500 group-hover:from-amber-200 group-hover:to-orange-400 transition-colors duration-300">
                        Comenzar
                    </span>
                    <span className="absolute inset-0 w-full h-full animate-shimmer"></span>
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default HomeView;