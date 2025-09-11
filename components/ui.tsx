

import React, { useRef, useState } from 'react';

// --- SPINNER ---
export const Spinner: React.FC = () => (
  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
);

// --- ICONS ---
export const Icon: React.FC<{ type: string; className?: string }> = ({ type, className = "w-6 h-6" }) => {
  const icons: { [key: string]: React.ReactNode } = {
    weight: <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M6 9l6 6 6-6" />,
    volume: <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />,
    distance: <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.5-11.375l-6 2.25-6-2.25m12 0l-6 2.25-6-2.25" />,
    time: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />,
    user: <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />,
    truck: <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 4.5h10.5a1.125 1.125 0 001.125-1.125V6.75a1.125 1.125 0 00-1.125-1.125H3.375A1.125 1.125 0 002.25 6.75v10.5a1.125 1.125 0 001.125 1.125z" />,
    star: <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />,
    fleteroPro: (
        <>
          <path d="M18.75 1.5H5.25C4.00736 1.5 3 2.50736 3 3.75V15.75C3 16.9926 4.00736 18 5.25 18H6.75C6.75 19.6569 8.09315 21 9.75 21C11.4069 21 12.75 19.6569 12.75 18H16.5C16.5 19.6569 17.8431 21 19.5 21C21.1569 21 22.5 19.6569 22.5 18H23.25C23.6642 18 24 17.6642 24 17.25V11.25L20.25 6L18.75 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <path d="M3 12H18.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </>
    ),
    clientePro: (
        <>
            <path d="M12.5 8.25C12.5 6.29822 10.9518 4.75 9 4.75C7.04822 4.75 5.5 6.29822 5.5 8.25C5.5 10.2018 7.04822 11.75 9 11.75C10.9518 11.75 12.5 10.2018 12.5 8.25Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <path d="M15.5 20.75V18.25C15.5 16.2982 13.9518 14.75 12 14.75H6C4.04822 14.75 2.5 16.2982 2.5 18.25V20.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <rect x="15" y="10" width="8" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <rect x="15" y="14" width="8" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <rect x="15" y="18" width="8" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </>
    ),
    creditCard: <path d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6.75 2.25h3.375" strokeLinecap="round" strokeLinejoin="round" />,
    mercadoPago: <path d="M18.75 3.75H5.25C4.00736 3.75 3 4.75736 3 6V18C3 19.2426 4.00736 20.25 5.25 20.25H18.75C19.9926 20.25 21 19.2426 21 18V6C21 4.75736 19.9926 3.75 18.75 3.75ZM8.625 15.75L6 12L7.5 10.125L10.125 12.75L16.5 7.125L18 9L10.125 15.75H8.625Z" strokeLinecap="round" strokeLinejoin="round"/>,
    qrCode: <path d="M4 4h6v6H4V4zm8 0h6v6h-6V4zM4 14h6v6H4v-6zm8 3h2v2h-2v-2zm-3-3h2v2h-2v-2zm6 0h2v2h-2v-2zm-3 3h2v2h-2v-2zm3-3h2v2h-2v-2z" strokeLinecap="round" strokeLinejoin="round" />,
    checkCircle: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  };

  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      {icons[type]}
    </svg>
  );
};

// --- BUTTON ---
// FIX: Added a `size` prop to allow for different button sizes and resolve the type error.
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
  size?: 'default' | 'sm';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
// FIX: Destructured the 'size' prop to make it available within the component. This resolves a bug where 'size' was used to select a class but was not defined in the function's scope.
  ({ children, className, variant = 'primary', isLoading = false, size = 'default', ...props }, ref) => {
    // FIX: Removed size-specific classes (text-base, py-3, px-6) to be handled by the new `size` prop.
    const baseClasses = "relative overflow-hidden font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-px active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-md flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";
    
    const variantClasses = {
      primary: 'fletapp-gold-gradient text-slate-900 shadow-amber-900/30 hover:shadow-amber-800/50 focus-visible:ring-amber-400',
      secondary: 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-100 border border-slate-700 hover:border-slate-600 focus-visible:ring-slate-400',
      ghost: 'bg-transparent hover:bg-slate-800/50 text-slate-200 focus-visible:ring-slate-400 shadow-none hover:shadow-none'
    };
    
    // FIX: Added size-specific classes to be applied based on the `size` prop.
    const sizeClasses = {
      default: 'text-base py-3 px-6',
      sm: 'text-sm py-1.5 px-3',
    };
    
    const createRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
        const button = event.currentTarget;
        const circle = document.createElement("span");
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;

        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${event.clientX - button.offsetLeft - radius}px`;
        circle.style.top = `${event.clientY - button.offsetTop - radius}px`;
        circle.classList.add("absolute", "pointer-events-none", "rounded-full", "bg-white/30", "scale-0", "animate-[ripple_500ms_linear]");
        
        button.appendChild(circle);
        setTimeout(() => circle.remove(), 500);
    };

    return (
      <button ref={ref} className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className || ''}`} disabled={isLoading} onClick={createRipple} {...props}>
        {isLoading ? <Spinner /> : <span className="relative z-10">{children}</span>}
      </button>
    );
  }
);
Button.displayName = 'Button';

// --- INPUT & TEXTAREA ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, id, type = 'text', icon, ...props }, ref) => {
    return (
      <div className="relative">
        {label && <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-2">{label}</label>}
        <div className="relative">
          {icon && <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">{icon}</div>}
          <input
            ref={ref}
            id={id}
            type={type}
            className={`w-full bg-slate-900/70 border border-slate-700/80 rounded-lg py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition duration-200 ease-in-out shadow-inner shadow-black/20 ${icon ? 'pl-10' : 'px-4'}`}
            {...props}
          />
        </div>
      </div>
    );
  }
);
Input.displayName = 'Input';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, id, ...props }, ref) => {
    return (
      <div className="relative">
        <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
        <textarea
          ref={ref}
          id={id}
          rows={4}
          className="w-full bg-slate-900/70 border border-slate-700/80 rounded-lg py-3 px-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition duration-200 ease-in-out shadow-inner shadow-black/20"
          {...props}
        />
      </div>
    );
  }
);
TextArea.displayName = 'TextArea';


// --- SELECT ---
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, id, options, ...props }, ref) => {
    return (
      <div className="relative">
        <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
        <select
          ref={ref}
          id={id}
          className="w-full bg-slate-900/70 border border-slate-700/80 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition duration-200 ease-in-out shadow-inner shadow-black/20 appearance-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 0.5rem center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '1.5em 1.5em',
            paddingRight: '2.5rem',
          }}
          {...props}
        >
          {options.map(option => (
            <option key={option.value} value={option.value} className="bg-slate-800 text-white">
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);
Select.displayName = 'Select';


// --- CARD ---
export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const { left, top, width, height } = card.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;
    
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);

    const rotateX = (-y / height / 2 + 0.25) * 10;
    const rotateY = (x / width / 2 - 0.25) * 10;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`;
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/60 transition-transform duration-300 ease-out shadow-2xl shadow-black/30 group ${className || ''}`}
      {...props}
    >
      <div className="absolute -inset-px rounded-2xl border border-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{
          background: `radial-gradient(400px at var(--mouse-x, 0) var(--mouse-y, 0), rgba(245, 158, 11, 0.15), transparent 80%)`,
      }}></div>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};


// --- STAR RATING ---
interface StarRatingProps {
  count?: number;
  value: number;
  onChange?: (value: number) => void;
  size?: 'sm' | 'md' | 'lg';
  isEditable?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  count = 5,
  value,
  onChange,
  size = 'md',
  isEditable = false,
}) => {
  const [hoverValue, setHoverValue] = useState<number | undefined>(undefined);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: count }, (_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= (hoverValue ?? value);

        return (
          <button
            key={i}
            type="button"
            disabled={!isEditable}
            onClick={() => onChange?.(starValue)}
            onMouseEnter={() => isEditable && setHoverValue(starValue)}
            onMouseLeave={() => isEditable && setHoverValue(undefined)}
            className={`transition-all duration-200 ${isEditable ? 'cursor-pointer transform hover:scale-125' : 'cursor-default'}`}
            aria-label={`Rate ${starValue} star`}
          >
            <Icon
              type="star"
              className={`${sizeClasses[size]} ${isFilled ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`}
            />
          </button>
        );
      })}
    </div>
  );
};


// --- SKELETON LOADER ---
export const SkeletonCard: React.FC<{style?: React.CSSProperties}> = ({style}) => {
    const Shimmer = () => (
        <div className="absolute top-0 left-0 w-full h-full" style={{
          background: `linear-gradient(110deg, transparent 20%, #0d162b 50%, transparent 80%)`,
          animation: 'skeleton-shimmer 1.8s infinite linear'
        }}></div>
    );

    return (
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/60 shadow-2xl shadow-black/30 overflow-hidden relative" style={style}>
            <div className="flex justify-between items-start">
                <div className="space-y-3 flex-1">
                    <div className="h-5 w-3/4 rounded bg-slate-800"></div>
                </div>
                <div className="h-5 w-20 rounded-full bg-slate-800"></div>
            </div>
            <div className="h-4 w-5/6 rounded bg-slate-800 mt-4"></div>
            <div className="border-t border-slate-800 my-4"></div>
            <div className="flex justify-between items-center">
                <div className="flex gap-4">
                    <div className="h-5 w-16 rounded bg-slate-800"></div>
                    <div className="h-5 w-16 rounded bg-slate-800"></div>
                </div>
                <div className="h-8 w-24 rounded-lg bg-slate-800"></div>
            </div>
            <Shimmer />
        </div>
    );
};
