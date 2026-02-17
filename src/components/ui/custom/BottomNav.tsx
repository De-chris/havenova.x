import React from 'react';
import { Home, MessageCircle, User, Compass, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/hooks/useStore';
import type { ScreenType } from '@/types';

interface NavItem {
  id: ScreenType;
  icon: React.ElementType;
  label: string;
}

const navItems: NavItem[] = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'explore', icon: Compass, label: 'Explore' },
  { id: 'ai-chat', icon: Sparkles, label: 'AI' },
  { id: 'dm', icon: MessageCircle, label: 'Messages' },
  { id: 'profile', icon: User, label: 'Profile' },
];

export const BottomNav: React.FC = () => {
  const { currentScreen, navigateTo, currentUser } = useStore();

  const handleNavClick = (screen: ScreenType) => {
    if (screen === 'profile' && !currentUser) {
      navigateTo('profile');
      return;
    }
    navigateTo(screen);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-cyan-500/20">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 relative group",
                  isActive 
                    ? "text-cyan-400" 
                    : "text-gray-500 hover:text-gray-300"
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full" />
                )}
                
                {/* Icon container */}
                <div className={cn(
                  "p-2 rounded-xl transition-all duration-300",
                  isActive 
                    ? "bg-gradient-to-br from-cyan-500/20 to-purple-500/20 shadow-lg shadow-cyan-500/20" 
                    : "group-hover:bg-white/5"
                )}>
                  <Icon className={cn(
                    "w-5 h-5 transition-transform duration-300",
                    isActive && "scale-110"
                  )} />
                </div>
                
                {/* Label */}
                <span className={cn(
                  "text-[10px] font-medium transition-all duration-300",
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-50"
                )}>
                  {item.label}
                </span>
                
                {/* Glow effect */}
                {isActive && (
                  <div className="absolute inset-0 bg-cyan-400/10 blur-xl rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Safe area for mobile */}
      <div className="h-safe-area-inset-bottom bg-transparent" />
    </nav>
  );
};

export default BottomNav;
