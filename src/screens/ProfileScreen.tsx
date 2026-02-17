import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, Edit3, MapPin, Link as LinkIcon, Calendar, 
  ArrowLeft, Settings, LogOut, Grid, Heart, MessageSquare,
  Check, X, Upload
} from 'lucide-react';
import { cn, uploadToCatbox, updateProfile, fetchUserData, fetchSocialStats } from '@/lib/utils';
import { useStore } from '@/hooks/useStore';
import type { User } from '@/types';

export const ProfileScreen: React.FC = () => {
  const { currentUser, setCurrentUser, logout, navigateTo } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'likes' | 'media'>('posts');
  const [stats, setStats] = useState({ followers: 0, following: 0, posts: 0 });
  const [isLoading, setIsLoading] = useState(false);
  
  // Edit form state
  const [editBio, setEditBio] = useState('');
  const [editPic, setEditPic] = useState('');
  const [editLocation] = useState('');
  const [editWebsite] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUser) {
      loadUserData();
    }
  }, [currentUser]);

  const loadUserData = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      const [userData, socialStats] = await Promise.all([
        fetchUserData(currentUser.username),
        fetchSocialStats(currentUser.username),
      ]);
      
      if (userData) {
        setCurrentUser(userData);
        setEditBio(userData.bio || '');
        setEditPic(userData.pic || '');
      }
      
      setStats(socialStats);
    } catch (error) {
      console.error('Load user data error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      await updateProfile(currentUser.username, editBio, editPic);
      setCurrentUser({
        ...currentUser,
        bio: editBio,
        pic: editPic,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Update profile error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const url = await uploadToCatbox(file);
      setEditPic(url);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
      navigateTo('profile');
    }
  };

  // Login/Signup view
  if (!currentUser) {
    return <AuthView />;
  }

  return (
    <div className="screen-container pt-14 pb-24">
      {/* Header */}
      <div className="sticky top-14 z-40 glass border-b border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => navigateTo('home')}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigateTo('settings')}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button 
              onClick={handleLogout}
              className="p-2 rounded-full hover:bg-red-500/20 text-red-400 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Cover Image */}
      <div className="relative h-48 bg-gradient-to-br from-cyan-500/30 via-purple-500/30 to-pink-500/30">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] opacity-30" />
        
        {/* Edit cover button */}
        <button className="absolute bottom-4 right-4 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors">
          <Camera className="w-4 h-4" />
        </button>
      </div>

      {/* Profile Info */}
      <div className="px-4 -mt-16 relative">
        {/* Avatar */}
        <div className="relative inline-block">
          <div className="w-32 h-32 rounded-full border-4 border-gray-900 overflow-hidden bg-gray-800">
            <img
              src={currentUser.pic || `https://ui-avatars.com/api/?name=${currentUser.username}&size=128`}
              alt={currentUser.username}
              className="w-full h-full object-cover"
            />
          </div>
          
          {isEditing && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 bg-cyan-500 rounded-full hover:bg-cyan-600 transition-colors"
            >
              <Camera className="w-4 h-4" />
            </button>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Edit/Save buttons */}
        <div className="flex justify-end -mt-8 mb-4">
          {isEditing ? (
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isLoading}
                className="px-4 py-2 rounded-full bg-cyan-500 hover:bg-cyan-600 transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 rounded-full border border-gray-600 hover:border-cyan-500 hover:text-cyan-400 transition-colors flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              Edit Profile
            </button>
          )}
        </div>

        {/* User Info */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            @{currentUser.username}
            {currentUser.role === 'Owner' && <span className="text-red-400 text-lg">👑</span>}
            {currentUser.role === 'Admin' && <span className="text-blue-400 text-lg">⚡</span>}
          </h1>
          
          {isEditing ? (
            <textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              placeholder="Write a bio..."
              className="w-full mt-2 p-3 bg-gray-800 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500"
              rows={3}
            />
          ) : (
            <p className="text-gray-400 mt-1">{currentUser.bio || 'No bio yet'}</p>
          )}

          {/* Meta info */}
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
            {editLocation && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {editLocation}
              </span>
            )}
            {editWebsite && (
              <a href={editWebsite} className="flex items-center gap-1 text-cyan-400 hover:underline">
                <LinkIcon className="w-4 h-4" />
                {editWebsite.replace(/^https?:\/\//, '')}
              </a>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Joined recently
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mb-6">
          <button className="hover:underline">
            <span className="font-bold">{stats.posts}</span>
            <span className="text-gray-500 ml-1">Posts</span>
          </button>
          <button className="hover:underline">
            <span className="font-bold">{stats.following}</span>
            <span className="text-gray-500 ml-1">Following</span>
          </button>
          <button className="hover:underline">
            <span className="font-bold">{stats.followers}</span>
            <span className="text-gray-500 ml-1">Followers</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          {[
            { id: 'posts', label: 'Posts', icon: Grid },
            { id: 'likes', label: 'Likes', icon: Heart },
            { id: 'media', label: 'Media', icon: MessageSquare },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors relative",
                  activeTab === tab.id ? "text-cyan-400" : "text-gray-500 hover:text-gray-300"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="py-8 text-center text-gray-500">
          {activeTab === 'posts' && (
            <div>
              <Grid className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No posts yet</p>
            </div>
          )}
          {activeTab === 'likes' && (
            <div>
              <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No likes yet</p>
            </div>
          )}
          {activeTab === 'media' && (
            <div>
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No media yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Auth View Component
const AuthView: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pic, setPic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setCurrentUser, navigateTo } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        // Login
        const response = await fetch(
          `https://docs.google.com/spreadsheets/d/1cQyIHRYMCwo_PMMW6gHm3Uul4e79oi7Z8uMra5-GQuI/gviz/tq?sheet=Users&tq=${encodeURIComponent(
            `SELECT * WHERE B = '${username}' AND D = '${password}'`
          )}&tqx=out:json`
        );
        const text = await response.text();
        const jsonStr = text.replace(/^\/\*O_o\*\/\ngoogle\.visualization\.Query\.setResponse\(/, '').replace(/\);$/, '');
        const data = JSON.parse(jsonStr);
        
        if (data.table.rows.length > 0) {
          const row = data.table.rows[0].c;
          const user: User = {
            username: row[1]?.v || username,
            email: row[2]?.v || '',
            role: row[4]?.v || 'User',
            bio: row[5]?.v || '',
            pic: row[6]?.v || '',
          };
          setCurrentUser(user);
          navigateTo('home');
        } else {
          alert('Invalid credentials');
        }
      } else {
        // Signup - use Apps Script
        const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw7r4-_Y2k-rh_5Z_vaLNMYxPQ9erwvK8PohDyDUNiux0PVHD-UVMxYbEaGyYFnZFmcCQ/exec';
        const response = await fetch(SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'signup',
            username,
            email,
            password,
            pic,
          }),
        });
        const result = await response.json();
        
        if (result.status === 'Success') {
          setCurrentUser({
            username,
            email,
            role: 'User',
            pic,
          });
          navigateTo('home');
        } else {
          alert(result.message || 'Signup failed');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      alert('Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('reqtype', 'fileupload');
      formData.append('fileToUpload', file);
      
      const response = await fetch('https://corsproxy.io/?https://catbox.moe/user/api.php', {
        method: 'POST',
        body: formData,
      });
      
      const url = await response.text();
      setPic(url.trim());
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
            <span className="text-3xl font-bold text-white">HX</span>
          </div>
          <h1 className="text-2xl font-bold gradient-text">
            {isLogin ? 'Welcome Back' : 'Join HX Community'}
          </h1>
          <p className="text-gray-500 mt-2">
            {isLogin ? 'Sign in to continue' : 'Create your account'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
              required
            />
          </div>

          {!isLogin && (
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                required
              />
            </div>
          )}

          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
              required
            />
          </div>

          {!isLogin && (
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-3 bg-gray-800/50 border border-dashed border-gray-700 rounded-xl hover:border-cyan-500 transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {pic ? 'Photo uploaded' : 'Upload profile photo'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isLoading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Toggle */}
        <p className="text-center mt-6 text-gray-500">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="ml-2 text-cyan-400 hover:underline"
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default ProfileScreen;
