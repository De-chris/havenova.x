import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/hooks/useStore';
import { useInactivity } from '@/hooks/useInactivity';

interface FloatingActionButtonProps {
  onClick?: () => void;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ onClick }) => {
  const { currentScreen, currentUser, isComposeOpen, setIsComposeOpen } = useStore();
  const isInactive = useInactivity(5000);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (isInactive && !isComposeOpen) {
      setIsVisible(false);
    } else {
      setIsVisible(true);
    }
  }, [isInactive, isComposeOpen]);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (currentUser) {
      setIsComposeOpen(true);
    } else {
      // Navigate to login
      window.location.hash = 'profile';
    }
    setIsVisible(true);
  };

  // Only show on home screen
  if (currentScreen !== 'home') return null;

  return (
    <button
      onClick={handleClick}
      className={cn(
        "fixed right-4 z-40 transition-all duration-500 ease-out",
        isVisible ? "bottom-24 opacity-100 scale-100" : "bottom-20 opacity-0 scale-75 pointer-events-none"
      )}
    >
      <div className="relative group">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-2xl blur-xl opacity-60 group-hover:opacity-100 transition-opacity" />
        
        {/* Button */}
        <div className={cn(
          "relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300",
          "bg-gradient-to-br from-cyan-500 to-purple-600",
          "shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50",
          "hover:scale-110 active:scale-95"
        )}>
          <Plus className={cn(
            "w-7 h-7 text-white transition-transform duration-300",
            isComposeOpen && "rotate-45"
          )} />
        </div>
        
        {/* Ripple effect */}
        <div className="absolute inset-0 rounded-2xl border-2 border-cyan-400/50 animate-ping opacity-0 group-hover:opacity-100" />
      </div>
    </button>
  );
};

export default FloatingActionButton;
