import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Post, Message, Notification, ScreenType, AIChat } from '@/types';
import { storage } from '@/lib/utils';

interface AppState {
  // User State
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  
  // Screen State
  currentScreen: ScreenType;
  setCurrentScreen: (screen: ScreenType) => void;
  previousScreen: ScreenType | null;
  navigateTo: (screen: ScreenType) => void;
  goBack: () => void;
  
  // Loading State
  isLoading: boolean;
  loadingText: string;
  setLoading: (isLoading: boolean, text?: string) => void;
  
  // Feed State
  posts: Post[];
  setPosts: (posts: Post[]) => void;
  addPost: (post: Post) => void;
  updatePost: (postId: string, updates: Partial<Post>) => void;
  deletePost: (postId: string) => void;
  likedPosts: string[];
  toggleLike: (postId: string) => void;
  
  // Messages State
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  deleteMessage: (messageId: string) => void;
  currentChatUser: string | null;
  setCurrentChatUser: (username: string | null) => void;
  
  // AI Chat State
  aiChats: AIChat[];
  currentAIChat: string | null;
  setCurrentAIChat: (chatId: string | null) => void;
  addAIChat: (chat: AIChat) => void;
  updateAIChat: (chatId: string, updates: Partial<AIChat>) => void;
  
  // Notifications State
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  unreadCount: number;
  
  // UI State
  showFab: boolean;
  setShowFab: (show: boolean) => void;
  isComposeOpen: boolean;
  setIsComposeOpen: (open: boolean) => void;
  
  // Role Cache
  roleCache: Record<string, string>;
  setUserRole: (username: string, role: string) => void;
  
  // Actions
  logout: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // User State
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),
      
      // Screen State
      currentScreen: 'home',
      previousScreen: null,
      setCurrentScreen: (screen) => set({ currentScreen: screen }),
      navigateTo: (screen) => set((state) => ({ 
        previousScreen: state.currentScreen,
        currentScreen: screen 
      })),
      goBack: () => set((state) => ({ 
        currentScreen: state.previousScreen || 'home',
        previousScreen: null 
      })),
      
      // Loading State
      isLoading: false,
      loadingText: 'Initializing...',
      setLoading: (isLoading, text = 'Processing...') => set({ isLoading, loadingText: text }),
      
      // Feed State
      posts: [],
      setPosts: (posts) => set({ posts }),
      addPost: (post) => set((state) => ({ posts: [post, ...state.posts] })),
      updatePost: (postId, updates) => set((state) => ({
        posts: state.posts.map(p => p.pid === postId ? { ...p, ...updates } : p)
      })),
      deletePost: (postId) => set((state) => ({
        posts: state.posts.filter(p => p.pid !== postId)
      })),
      likedPosts: [],
      toggleLike: (postId) => set((state) => ({
        likedPosts: state.likedPosts.includes(postId)
          ? state.likedPosts.filter(id => id !== postId)
          : [...state.likedPosts, postId]
      })),
      
      // Messages State
      messages: [],
      setMessages: (messages) => set({ messages }),
      addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
      deleteMessage: (messageId) => set((state) => ({
        messages: state.messages.filter(m => m.id !== messageId)
      })),
      currentChatUser: null,
      setCurrentChatUser: (username) => set({ currentChatUser: username }),
      
      // AI Chat State
      aiChats: [],
      currentAIChat: null,
      setCurrentAIChat: (chatId) => set({ currentAIChat: chatId }),
      addAIChat: (chat) => set((state) => ({ aiChats: [...state.aiChats, chat] })),
      updateAIChat: (chatId, updates) => set((state) => ({
        aiChats: state.aiChats.map(c => c.id === chatId ? { ...c, ...updates } : c)
      })),
      
      // Notifications State
      notifications: [],
      addNotification: (notification) => set((state) => ({
        notifications: [notification, ...state.notifications]
      })),
      markNotificationRead: (id) => set((state) => ({
        notifications: state.notifications.map(n => 
          n.id === id ? { ...n, isRead: true } : n
        )
      })),
      clearNotifications: () => set({ notifications: [] }),
      get unreadCount() {
        return get().notifications.filter(n => !n.isRead).length;
      },
      
      // UI State
      showFab: true,
      setShowFab: (show) => set({ showFab: show }),
      isComposeOpen: false,
      setIsComposeOpen: (open) => set({ isComposeOpen: open }),
      
      // Role Cache
      roleCache: {},
      setUserRole: (username, role) => set((state) => ({
        roleCache: { ...state.roleCache, [username.toLowerCase()]: role }
      })),
      
      // Actions
      logout: () => set({
        currentUser: null,
        currentScreen: 'profile',
        posts: [],
        messages: [],
        notifications: [],
        likedPosts: [],
      }),
    }),
    {
      name: 'hx-community-storage',
      storage: {
        getItem: (name) => {
          const value = storage.get(name, null);
          return value ? { state: value } : null;
        },
        setItem: (name, value) => {
          storage.set(name, value.state);
        },
        removeItem: (name) => {
          storage.remove(name);
        },
      },
      partialize: (state: AppState) => ({
        currentUser: state.currentUser,
        likedPosts: state.likedPosts,
        roleCache: state.roleCache,
        aiChats: state.aiChats,
      } as any),
    }
  )
);

export default useStore;
