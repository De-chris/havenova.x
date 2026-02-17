// User Types
export interface User {
  username: string;
  email?: string;
  pic?: string;
  bio?: string;
  role: 'User' | 'Admin' | 'Owner';
  followers?: number;
  following?: number;
  posts?: number;
  isOnline?: boolean;
  lastSeen?: string;
}

// Post Types
export interface Post {
  pid: string;
  author: string;
  content: string;
  media?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'voice';
  likes: number;
  comment_count: number;
  timestamp: string;
  role?: string;
  pic?: string;
  recent_comments?: Comment[];
  isLiked?: boolean;
  reactions?: Reaction[];
}

export interface Comment {
  user: string;
  text: string;
  timestamp?: string;
  pic?: string;
}

export interface Reaction {
  user: string;
  type: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry';
}

// Message Types
export interface Message {
  id?: string;
  sender: string;
  receiver: string;
  content: string;
  media?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'voice';
  timestamp: string;
  isRead?: boolean;
  isDeleted?: boolean;
  reactions?: Reaction[];
}

export interface Chat {
  user: User;
  lastMessage?: Message;
  unreadCount: number;
  timestamp: string;
}

// Story Types
export interface Story {
  id: string;
  author: string;
  pic?: string;
  media: string;
  mediaType: 'image' | 'video';
  timestamp: string;
  views: string[];
  expiresAt: string;
}

// AI Types
export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface AIChat {
  id: string;
  title: string;
  messages: AIMessage[];
  createdAt: string;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'message' | 'mention';
  from: string;
  content?: string;
  timestamp: string;
  isRead: boolean;
  postId?: string;
}

// App State
export interface AppState {
  currentUser: User | null;
  currentScreen: ScreenType;
  isLoading: boolean;
  loadingText: string;
  notifications: Notification[];
}

export type ScreenType = 
  | 'home' 
  | 'dm' 
  | 'chat' 
  | 'profile' 
  | 'compose' 
  | 'comments' 
  | 'user-profile'
  | 'ai-chat'
  | 'explore'
  | 'stories'
  | 'settings'
  | 'notifications';

// Recording State
export interface RecordingState {
  isRecording: boolean;
  duration: number;
  mediaType: 'audio' | 'video' | null;
  stream?: MediaStream;
  recorder?: any;
  chunks: Blob[];
}

// API Response Types
export interface APIResponse<T = any> {
  status: 'Success' | 'Error';
  data: T;
  message?: string;
}

// Media Upload Types
export interface MediaUpload {
  file: File;
  preview: string;
  type: 'image' | 'video' | 'audio';
  uploadProgress: number;
}

// Theme Types
export interface Theme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
}

// Settings Types
export interface UserSettings {
  theme: 'dark' | 'light' | 'auto';
  notifications: boolean;
  soundEnabled: boolean;
  voicePreference: 'male' | 'female' | 'neutral';
  language: string;
  privacy: {
    showOnlineStatus: boolean;
    showLastSeen: boolean;
    allowMessagesFrom: 'everyone' | 'followers' | 'none';
  };
}
