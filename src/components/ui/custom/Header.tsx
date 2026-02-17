import React from 'react';
import { Bell, Zap, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/hooks/useStore';

interface HeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onRefresh, isRefreshing }) => {
  const { currentUser, notifications, navigateTo } = useStore();
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-cyan-500/20">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <div 
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => navigateTo('home')}
        >
          <div className="relative">
            <img 
              src="/logo.png" 
              alt="HX" 
              className="h-8 w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-500 blur-lg opacity-50 group-hover:opacity-80 transition-opacity" />
          </div>
          <span className="font-bold text-lg gradient-text hidden sm:block">HX Community</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className={cn(
                "p-2 rounded-full hover:bg-white/10 transition-all",
                isRefreshing && "animate-spin"
              )}
            >
              <RefreshCw className="w-5 h-5 text-cyan-400" />
            </button>
          )}

          {/* AI Button */}
          <button
            onClick={() => navigateTo('ai-chat')}
            className="p-2 rounded-full hover:bg-white/10 transition-all relative"
          >
            <Zap className="w-5 h-5 text-purple-400" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          </button>

          {/* Notifications */}
          <button
            onClick={() => navigateTo('notifications')}
            className="p-2 rounded-full hover:bg-white/10 transition-all relative"
          >
            <Bell className="w-5 h-5 text-cyan-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-gradient-to-r from-pink-500 to-red-500 text-white text-xs font-bold min-w-5 h-5 rounded-full flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Profile */}
          {currentUser ? (
            <button
              onClick={() => navigateTo('profile')}
              className="relative"
            >
              <img
                src={currentUser.pic || `https://ui-avatars.com/api/?name=${currentUser.username}&background=random`}
                alt={currentUser.username}
                className="w-8 h-8 rounded-full border-2 border-cyan-400/50 hover:border-cyan-400 transition-colors object-cover"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-900" />
            </button>
          ) : (
            <button
              onClick={() => navigateTo('profile')}
              className="p-2 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500"
            >
              <span className="text-white text-xs font-bold">Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
