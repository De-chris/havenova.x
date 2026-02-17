import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import CryptoJS from 'crypto-js';
import type { APIResponse, Post, Message, User } from "@/types";

// Tailwind class merger
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================
// ENCRYPTION & SECURITY UTILITIES
// ============================================

const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'hx-community-secret-key-2024';

export const encrypt = (text: string): string => {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
};

export const decrypt = (encrypted: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return '';
  }
};

export const hashString = (text: string): string => {
  return CryptoJS.SHA256(text).toString();
};

// Obfuscate API calls
export const obfuscateRequest = (data: any): string => {
  const jsonStr = JSON.stringify(data);
  return btoa(jsonStr.split('').reverse().join(''));
};

export const deobfuscateResponse = (encoded: string): any => {
  try {
    const decoded = atob(encoded);
    return JSON.parse(decoded.split('').reverse().join(''));
  } catch {
    return null;
  }
};

// ============================================
// GOOGLE SHEETS INTEGRATION (GVIZ TRICK)
// ============================================

const SHEET_ID = '1cQyIHRYMCwo_PMMW6gHm3Uul4e79oi7Z8uMra5-GQuI';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw7r4-_Y2k-rh_5Z_vaLNMYxPQ9erwvK8PohDyDUNiux0PVHD-UVMxYbEaGyYFnZFmcCQ/exec';

// GViz API endpoint for GET requests (avoids Apps Script quotas)
const getGVizUrl = (sheetName: string, query?: string) => {
  const baseUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq`;
  const params = new URLSearchParams({
    sheet: sheetName,
    tqx: 'out:json',
  });
  if (query) params.append('tq', query);
  return `${baseUrl}?${params.toString()}`;
};

// Parse GViz response
const parseGVizResponse = (text: string): any[] => {
  try {
    // Remove the Google visualization callback wrapper
    const jsonStr = text.replace(/^\/\*O_o\*\/\ngoogle\.visualization\.Query\.setResponse\(/, '').replace(/\);$/, '');
    const data = JSON.parse(jsonStr);
    const rows = data.table.rows;
    const cols = data.table.cols.map((c: any) => c.label || c.id);
    
    return rows.map((row: any) => {
      const obj: any = {};
      row.c.forEach((cell: any, i: number) => {
        obj[cols[i]] = cell?.v ?? null;
      });
      return obj;
    });
  } catch (error) {
    console.error('GViz parse error:', error);
    return [];
  }
};

// ============================================
// API FUNCTIONS
// ============================================

// GET requests using GViz (no quota limits)
export const fetchFeed = async (): Promise<Post[]> => {
  try {
    const url = getGVizUrl('Posts', 'SELECT * ORDER BY A DESC LIMIT 100');
    const response = await fetch(url);
    const text = await response.text();
    const data = parseGVizResponse(text);
    
    return data.map((row: any) => ({
      pid: row.pid || row.PID || '',
      author: row.author || row.Author || '',
      content: row.content || row.Content || '',
      media: row.media || row.Media || '',
      mediaType: row.mediatype || row.MediaType || 'image',
      likes: parseInt(row.likes || row.Likes || '0'),
      comment_count: parseInt(row.commentcount || row.CommentCount || '0'),
      timestamp: row.timestamp || row.Timestamp || new Date().toISOString(),
      role: row.role || row.Role || 'User',
      pic: row.pic || row.Pic || '',
    }));
  } catch (error) {
    console.error('Fetch feed error:', error);
    return [];
  }
};

export const fetchUsers = async (): Promise<User[]> => {
  try {
    const url = getGVizUrl('Users', 'SELECT username, pic, role, bio, followers, following');
    const response = await fetch(url);
    const text = await response.text();
    const data = parseGVizResponse(text);
    
    return data.map((row: any) => ({
      username: row.username || row.Username || '',
      pic: row.pic || row.Pic || '',
      role: (row.role || row.Role || 'User') as 'User' | 'Admin' | 'Owner',
      bio: row.bio || row.Bio || '',
      followers: parseInt(row.followers || row.Followers || '0'),
      following: parseInt(row.following || row.Following || '0'),
    }));
  } catch (error) {
    console.error('Fetch users error:', error);
    return [];
  }
};

export const fetchUserData = async (username: string): Promise<User | null> => {
  try {
    const url = getGVizUrl('Users', `SELECT * WHERE B = '${username}'`);
    const response = await fetch(url);
    const text = await response.text();
    const data = parseGVizResponse(text);
    
    if (data.length === 0) return null;
    const row = data[0];
    
    return {
      username: row.username || row.Username || username,
      pic: row.pic || row.Pic || '',
      role: (row.role || row.Role || 'User') as 'User' | 'Admin' | 'Owner',
      bio: row.bio || row.Bio || '',
      email: row.email || row.Email || '',
      followers: parseInt(row.followers || row.Followers || '0'),
      following: parseInt(row.following || row.Following || '0'),
      posts: parseInt(row.posts || row.Posts || '0'),
    };
  } catch (error) {
    console.error('Fetch user data error:', error);
    return null;
  }
};

export const fetchMessages = async (user1: string, user2: string): Promise<Message[]> => {
  try {
    const url = getGVizUrl('Messages', 
      `SELECT * WHERE (B = '${user1}' AND C = '${user2}') OR (B = '${user2}' AND C = '${user1}') ORDER BY A DESC LIMIT 100`
    );
    const response = await fetch(url);
    const text = await response.text();
    const data = parseGVizResponse(text);
    
    return data.reverse().map((row: any) => ({
      id: row.id || row.ID || '',
      sender: row.sender || row.Sender || '',
      receiver: row.receiver || row.Receiver || '',
      content: row.content || row.Content || '',
      media: row.media || row.Media || '',
      mediaType: row.mediatype || row.MediaType || '',
      timestamp: row.timestamp || row.Timestamp || new Date().toISOString(),
      isRead: row.isread === 'true' || row.IsRead === 'true',
    }));
  } catch (error) {
    console.error('Fetch messages error:', error);
    return [];
  }
};

// POST requests using Apps Script (for write operations)
export const postRequest = async (action: string, data: any): Promise<APIResponse> => {
  try {
    const payload = obfuscateRequest({ action, ...data });
    
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ payload }),
    });
    
    const result = await response.json();
    return deobfuscateResponse(result.data) || result;
  } catch (error) {
    console.error('Post request error:', error);
    return { status: 'Error', data: null, message: 'Network error' };
  }
};

// ============================================
// AUTH FUNCTIONS
// ============================================

export const login = async (username: string, password: string): Promise<APIResponse> => {
  return postRequest('login', { username, password: hashString(password) });
};

export const signup = async (username: string, email: string, password: string, pic?: string): Promise<APIResponse> => {
  return postRequest('signup', { username, email, password: hashString(password), pic });
};

export const updateProfile = async (username: string, bio?: string, pic?: string): Promise<APIResponse> => {
  return postRequest('update_profile', { username, bio, pic });
};

// ============================================
// POST FUNCTIONS
// ============================================

export const createPost = async (username: string, content: string, media?: string, mediaType?: string): Promise<APIResponse> => {
  return postRequest('post', { uid: username, content, media, mediaType });
};

export const likePost = async (postId: string, username: string): Promise<APIResponse> => {
  return postRequest('like', { pid: postId, uid: username });
};

export const deletePost = async (postId: string, username: string): Promise<APIResponse> => {
  return postRequest('delete_post', { pid: postId, uid: username });
};

export const addComment = async (postId: string, username: string, content: string): Promise<APIResponse> => {
  return postRequest('comment', { pid: postId, uid: username, content });
};

// ============================================
// MESSAGE FUNCTIONS
// ============================================

export const sendMessage = async (sender: string, receiver: string, content: string, media?: string, mediaType?: string): Promise<APIResponse> => {
  return postRequest('dm', { uid: sender, target: receiver, message: content, media, mediaType });
};

export const deleteMessage = async (messageId: string, username: string): Promise<APIResponse> => {
  return postRequest('delete_message', { mid: messageId, uid: username });
};

// ============================================
// SOCIAL FUNCTIONS
// ============================================

export const followUser = async (follower: string, following: string): Promise<APIResponse> => {
  return postRequest('follow', { follower, following });
};

export const unfollowUser = async (follower: string, following: string): Promise<APIResponse> => {
  return postRequest('unfollow', { follower, following });
};

export const fetchSocialStats = async (username: string): Promise<{ followers: number; following: number; posts: number }> => {
  try {
    const user = await fetchUserData(username);
    return {
      followers: user?.followers || 0,
      following: user?.following || 0,
      posts: user?.posts || 0,
    };
  } catch {
    return { followers: 0, following: 0, posts: 0 };
  }
};

// ============================================
// AI FUNCTIONS
// ============================================

const LONGCAT_API_KEY = import.meta.env.VITE_LONGCAT_API_KEY || '';
const LONGCAT_API_URL = 'https://api.longcat.ai/v1/chat';

export const sendAIMessage = async (messages: { role: string; content: string }[]): Promise<string> => {
  try {
    const response = await fetch(LONGCAT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LONGCAT_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are Dechris AI, created by the Havenova-x team led by their founder Dechris. You are a helpful, intelligent, and friendly AI assistant. Keep responses clean, concise, and engaging. If users ask to contact Havenova-x, provide the email: havenova.x@gmail.com. Always address users by their name when provided.'
          },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Sorry, I could not process that request.';
  } catch (error) {
    console.error('AI request error:', error);
    return 'Sorry, I am having trouble connecting right now.';
  }
};

export const rewriteText = async (text: string, tone: 'professional' | 'casual' | 'funny' | 'poetic'): Promise<string> => {
  try {
    const response = await fetch(LONGCAT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LONGCAT_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a text rewriting assistant. Rewrite the user's text in a ${tone} tone while keeping the same meaning. Only return the rewritten text, no explanations.`
          },
          { role: 'user', content: text }
        ],
        temperature: 0.8,
        max_tokens: 500,
      }),
    });
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content || text;
  } catch {
    return text;
  }
};

// ============================================
// MEDIA UPLOAD FUNCTIONS
// ============================================

export const uploadToCatbox = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('reqtype', 'fileupload');
  formData.append('fileToUpload', file);
  
  const response = await fetch('https://corsproxy.io/?https://catbox.moe/user/api.php', {
    method: 'POST',
    body: formData,
  });
  
  const url = await response.text();
  return url.trim();
};

// Special marker for media links (so site knows to render them)
export const MEDIA_MARKER = '§HX§';

export const markMediaLink = (url: string): string => {
  return `${MEDIA_MARKER}${url}${MEDIA_MARKER}`;
};

export const isMarkedMedia = (text: string): boolean => {
  return text.includes(MEDIA_MARKER);
};

export const extractMediaLinks = (text: string): { url: string; type: 'audio' | 'video' | 'image' }[] => {
  const regex = new RegExp(`${MEDIA_MARKER}(.*?)${MEDIA_MARKER}`, 'g');
  const matches = [];
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    const url = match[1];
    let type: 'audio' | 'video' | 'image' = 'image';
    
    if (url.match(/\.(mp3|wav|ogg|m4a|webm)$/i)) type = 'audio';
    else if (url.match(/\.(mp4|mov|avi|webm|mkv)$/i)) type = 'video';
    else if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) type = 'image';
    
    matches.push({ url, type });
  }
  
  return matches;
};

// ============================================
// TEXT FORMATTING FUNCTIONS
// ============================================

export const linkify = (text: string): string => {
  if (!text) return '';
  
  // Extract media markers first
  let cleanText = text.replace(new RegExp(`${MEDIA_MARKER}.*?${MEDIA_MARKER}`, 'g'), '[media]');
  
  // Linkify URLs
  const urlPattern = /(\b(https?):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi;
  cleanText = cleanText.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-cyan-400 hover:underline">$1</a>');
  
  // Formatting
  cleanText = cleanText
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="text-gray-300">$1</em>')
    .replace(/~(.*?)~/g, '<del class="text-gray-500">$1</del>')
    .replace(/`(.*?)`/g, '<code class="bg-gray-800 px-1 rounded text-cyan-400">$1</code>')
    .replace(/@(\w+)/g, '<span class="text-cyan-400 cursor-pointer hover:underline" data-user="$1">@$1</span>');
  
  return cleanText;
};

export const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// ============================================
// LOCAL STORAGE FUNCTIONS
// ============================================

export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(decrypt(item)) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, encrypt(JSON.stringify(value)));
    } catch (error) {
      console.error('Storage error:', error);
    }
  },
  
  remove: (key: string): void => {
    localStorage.removeItem(key);
  },
  
  clear: (): void => {
    localStorage.clear();
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const debounce = <T extends (...args: any[]) => void>(func: T, wait: number): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => void>(func: T, limit: number): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};
