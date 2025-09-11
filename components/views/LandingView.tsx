import React, { useContext } from 'react';
import { AppContext } from '../../AppContext';
import { Card } from '../ui';

// --- Illustrations ---

const StaticTruckIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 120" className={className}>
        <g transform="translate(10, 10)">
            {/* Body */}
            <path d="M1,55 H50 V20 H80 L105,40 V75 H1 Z" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
            {/* Window */}
            <path d="M82,40 H103 V23 L82,23 Z" fill="#0f172a" stroke="#94a3b8" strokeWidth="1.5" />
            {/* Boxes */}
            <rect x="5" y="30" width="25" height="25" fill="#a16207" stroke="#854d0e" strokeWidth="1.5" />
            <rect x="20" y="5" width="25" height="25" fill="#ca8a04" stroke="#854d0e" strokeWidth="1.5" />
            <rect x="35" y="25" width="20" height="30" fill="#854d0e" stroke="#713f12" strokeWidth="1.5" />
            {/* Wheels */}
            <g transform="translate(25 75)">
                <circle cx="0" cy="0" r="12" fill="#1e293b" stroke="#334155" strokeWidth="2.5" />
                <circle cx="0" cy="0" r="8" fill="none" stroke="#475569" strokeWidth="1.5" />
                <path d="M0 0 L 0 -8 M0 0 L 7 4 M0 0 L -7 4" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="0" cy="0" r="2" fill="#334155" />
            </g>
            <g transform="translate(85 75)">
                <circle cx="0" cy="0" r="12" fill="#1e293b" stroke="#334155" strokeWidth="2.5" />
                <circle cx="0" cy="0" r="8" fill="none" stroke="#475569" strokeWidth="1.5" />
                <path d="M0 0 L 0 -8 M0 0 L 7 4 M0 0 L -7 4" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="0" cy="0" r="2" fill="#334155" />
            </g>
        </g>
    </svg>
);

const ClientWithPackagesIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 120" className={className}>
        <g transform="translate(10, 10)">
            {/* Boxes */}
            <g transform="translate(60, 0)">
              <rect x="10" y="70" width="40" height="25" rx="2" fill="#854d0e" stroke="#713f12" strokeWidth="1.5" />
              <rect x="15" y="45" width="30" height="25" rx="2" fill="#a16207" stroke="#854d0e" strokeWidth="1.5" />
              <rect x="5" y="20" width="50" height="25" rx="2" fill="#ca8a04" stroke="#854d0e" strokeWidth="1.5" />
            </g>
            {/* Person */}
            <g transform="translate(0, 5)">
              <circle cx="25" cy="30" r="8" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />
              <path d="M15,65 C15,50 35,50 35,65 V90 H15 Z" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
            </g>
        </g>
    </svg>
);


const LandingView: React.FC = () => {
  const context = useContext(AppContext);

  const SelectionCard: React.FC<{onClick: () => void, title: string, description: string, animationDelay: string}> = ({ onClick, title, description, animationDelay }) => (
      <Card
        onClick={onClick}
        className="w-full sm:w-80 cursor-pointer transition-all duration-300 text-center p-8 staggered-child"
        style={{animationDelay}}
      >
        <h3 className="text-3xl font-bold mb-2 text-slate-100">{title}</h3>
        <p className="text-slate-400">{description}</p>
      </Card>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 pt-12 md:pt-4 overflow-hidden">
      <div className="flex flex-col items-center text-center w-full max-w-4xl">
        
        {/* Illustrations Container - VISIBLE ON ALL SCREENS */}
        <div className="flex flex-row items-center justify-center gap-4 sm:gap-8 w-full mb-8">
            <div className="w-1/2 max-w-[150px] sm:max-w-xs animate-slideInFromLeft" style={{animationDelay: '0.3s'}}>
                <StaticTruckIcon className="w-full h-auto text-slate-400" />
            </div>
            <div className="w-1/2 max-w-[150px] sm:max-w-xs animate-slideInFromRight" style={{animationDelay: '0.3s'}}>
                <ClientWithPackagesIcon className="w-full h-auto text-slate-400" />
            </div>
        </div>

        {/* Text Content */}
        <div className="w-full">
            <h2 className="text-4xl font-bold mb-4 text-slate-100 text-center staggered-child" style={{animationDelay: '0.1s'}}>Bienvenido a Fletapp</h2>
            <p className="text-slate-300 mb-12 text-lg max-w-xl text-center mx-auto staggered-child" style={{animationDelay: '0.2s'}}>Tu plataforma de confianza para fletes y envíos. Conectando necesidades con soluciones.</p>
        </div>

        {/* Selection Buttons */}
        <div className="flex flex-col sm:flex-row gap-8 justify-center items-center w-full">
          <SelectionCard 
            onClick={() => context?.setView('onboarding')}
            title="Soy Nuevo Usuario"
            description="Crea una cuenta de cliente o fletero para empezar."
            animationDelay="0.4s"
          />
          <SelectionCard 
            onClick={() => context?.setView('login')}
            title="Ya Tengo Cuenta"
            description="Inicia sesión para acceder a tu panel de control."
            animationDelay="0.5s"
          />
        </div>
      </div>
    </div>
  );
};

export default LandingView;