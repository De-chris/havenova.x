import React, { useEffect, useState } from 'react';
import { Header } from '@/components/ui/custom/Header';
import { BottomNav } from '@/components/ui/custom/BottomNav';
import { FloatingActionButton } from '@/components/ui/custom/FloatingActionButton';
import { FullScreenLoader } from '@/components/ui/custom/FuturisticLoader';
import { HomeScreen } from '@/screens/HomeScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { ChatScreen } from '@/screens/MessagesScreen';
import { AIChatScreen } from '@/screens/AIChatScreen';
import { ComposeScreen } from '@/screens/ComposeScreen';
import { CommentsScreen } from '@/screens/CommentsScreen';
import { useStore } from '@/hooks/useStore';
import { cn } from '@/lib/utils';

// Explore Screen (placeholder)
const ExploreScreen: React.FC = () => {
  
  return (
    <div className="screen-container pt-20 pb-24 px-4">
      <h1 className="text-2xl font-bold mb-6">Explore</h1>
      
      {/* Trending Topics */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Trending Topics</h2>
        <div className="flex flex-wrap gap-2">
          {['#technology', '#ai', '#coding', '#design', '#music', '#gaming'].map(tag => (
            <button 
              key={tag}
              className="px-4 py-2 bg-gray-800/50 rounded-full text-sm hover:bg-cyan-500/20 hover:text-cyan-400 transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
      
      {/* Suggested Users */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Suggested for You</h2>
        <div className="space-y-3">
          {['user1', 'user2', 'user3'].map(user => (
            <div key={user} className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-xl">
              <img 
                src={`https://ui-avatars.com/api/?name=${user}&background=random`}
                alt={user}
                className="w-12 h-12 rounded-full"
              />
              <div className="flex-1">
                <p className="font-semibold">@{user}</p>
                <p className="text-sm text-gray-500">Suggested for you</p>
              </div>
              <button className="px-4 py-2 bg-cyan-500 rounded-full text-sm font-medium hover:bg-cyan-600 transition-colors">
                Follow
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Notifications Screen
const NotificationsScreen: React.FC = () => {
  const { notifications, markNotificationRead } = useStore();
  
  return (
    <div className="screen-container pt-20 pb-24 px-4">
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>
      
      {notifications.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => (
            <div 
              key={notif.id}
              onClick={() => markNotificationRead(notif.id)}
              className={cn(
                "p-4 rounded-xl cursor-pointer transition-colors",
                notif.isRead ? "bg-gray-800/30" : "bg-cyan-500/10 border border-cyan-500/20"
              )}
            >
              <div className="flex items-center gap-3">
                <img 
                  src={`https://ui-avatars.com/api/?name=${notif.from}&background=random`}
                  alt={notif.from}
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-semibold">@{notif.from}</span>
                    {' '}
                    {notif.type === 'like' && 'liked your post'}
                    {notif.type === 'comment' && 'commented on your post'}
                    {notif.type === 'follow' && 'started following you'}
                    {notif.type === 'message' && 'sent you a message'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notif.timestamp).toLocaleDateString()}
                  </p>
                </div>
                {!notif.isRead && (
                  <div className="w-2 h-2 bg-cyan-500 rounded-full" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Settings Screen
const SettingsScreen: React.FC = () => {
  const { currentUser, logout, navigateTo } = useStore();
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  return (
    <div className="screen-container pt-20 pb-24 px-4">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <div className="space-y-4">
        {/* Account */}
        <div className="card-futuristic">
          <h2 className="text-lg font-semibold mb-4">Account</h2>
          <div className="flex items-center gap-4">
            <img 
              src={currentUser?.pic || `https://ui-avatars.com/api/?name=${currentUser?.username}`}
              alt={currentUser?.username}
              className="w-16 h-16 rounded-full"
            />
            <div>
              <p className="font-semibold">@{currentUser?.username}</p>
              <p className="text-sm text-gray-500">{currentUser?.email}</p>
            </div>
          </div>
        </div>
        
        {/* Preferences */}
        <div className="card-futuristic space-y-4">
          <h2 className="text-lg font-semibold">Preferences</h2>
          
          <div className="flex items-center justify-between">
            <span>Dark Mode</span>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative",
                darkMode ? "bg-cyan-500" : "bg-gray-700"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all",
                darkMode ? "left-6" : "left-0.5"
              )} />
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Notifications</span>
            <button 
              onClick={() => setNotifications(!notifications)}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative",
                notifications ? "bg-cyan-500" : "bg-gray-700"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all",
                notifications ? "left-6" : "left-0.5"
              )} />
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Sound Effects</span>
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative",
                soundEnabled ? "bg-cyan-500" : "bg-gray-700"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all",
                soundEnabled ? "left-6" : "left-0.5"
              )} />
            </button>
          </div>
        </div>
        
        {/* Danger Zone */}
        <div className="card-futuristic border-red-500/30">
          <h2 className="text-lg font-semibold mb-4 text-red-400">Danger Zone</h2>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to logout?')) {
                logout();
                navigateTo('profile');
              }
            }}
            className="w-full py-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

// User Profile View Screen
const UserProfileViewScreen: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const { setCurrentChatUser, navigateTo } = useStore();
  
  useEffect(() => {
    const targetUser = sessionStorage.getItem('viewTarget');
    if (targetUser) {
      // Load user data
      setUser({
        username: targetUser,
        pic: `https://ui-avatars.com/api/?name=${targetUser}&background=random`,
        bio: 'No bio yet',
        followers: 0,
        following: 0,
        posts: 0,
      });
    }
  }, []);
  
  if (!user) return null;
  
  return (
    <div className="screen-container pt-14 pb-24">
      {/* Header */}
      <div className="glass border-b border-gray-800 px-4 py-3 flex items-center gap-3 sticky top-14 z-40">
        <button 
          onClick={() => navigateTo('home')}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <span className="sr-only">Back</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-semibold">@{user.username}</span>
      </div>
      
      {/* Profile Content */}
      <div className="px-4 py-6">
        <div className="flex items-start gap-4">
          <img 
            src={user.pic}
            alt={user.username}
            className="w-20 h-20 rounded-full"
          />
          <div className="flex-1">
            <h1 className="text-xl font-bold">@{user.username}</h1>
            <p className="text-gray-500 mt-1">{user.bio}</p>
            
            <div className="flex gap-4 mt-3 text-sm">
              <span><strong>{user.posts}</strong> posts</span>
              <span><strong>{user.followers}</strong> followers</span>
              <span><strong>{user.following}</strong> following</span>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setIsFollowing(!isFollowing)}
            className={cn(
              "flex-1 py-2 rounded-full font-medium transition-colors",
              isFollowing 
                ? "bg-gray-700 text-white" 
                : "bg-cyan-500 text-white hover:bg-cyan-600"
            )}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
          <button
            onClick={() => {
              setCurrentChatUser(user.username);
              navigateTo('chat');
            }}
            className="flex-1 py-2 rounded-full border border-gray-600 hover:border-cyan-500 transition-colors"
          >
            Message
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  const { 
    currentScreen, 
    isLoading, 
    loadingText, 
    isComposeOpen,
  } = useStore();

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen />;
      case 'dm':
      case 'chat':
        return <ChatScreen />;
      case 'profile':
        return <ProfileScreen />;
      case 'ai-chat':
        return <AIChatScreen />;
      case 'explore':
        return <ExploreScreen />;
      case 'comments':
        return <CommentsScreen />;
      case 'notifications':
        return <NotificationsScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'user-profile':
        return <UserProfileViewScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Loading Overlay */}
      {isLoading && <FullScreenLoader text={loadingText} />}
      
      {/* Header - only show on certain screens */}
      {['home', 'explore', 'notifications'].includes(currentScreen) && (
        <Header />
      )}
      
      {/* Main Content */}
      <main className="relative">
        {renderScreen()}
      </main>
      
      {/* Bottom Navigation */}
      <BottomNav />
      
      {/* Floating Action Button */}
      <FloatingActionButton />
      
      {/* Compose Modal */}
      {isComposeOpen && <ComposeScreen />}
    </div>
  );
}

export default App;
