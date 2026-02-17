import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Search, Phone, Video, Mic, MoreVertical, Trash2,
  Send, Smile, Paperclip, X,
  Play, Pause, Check, CheckCheck, Sparkles
} from 'lucide-react';
import { cn, formatTimestamp, formatDuration, linkify, MEDIA_MARKER, markMediaLink, uploadToCatbox, sendMessage, fetchMessages, deleteMessage, rewriteText } from '@/lib/utils';
import { useStore } from '@/hooks/useStore';
import { useRecording } from '@/hooks/useRecording';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import type { Message } from '@/types';

// Voice Note Component
const VoiceNotePlayer: React.FC<{ url: string; duration?: number }> = ({ url, duration = 0 }) => {
  const { isPlaying, currentTime, progress, load, toggle } = useAudioPlayer();

  useEffect(() => {
    load(url);
  }, [url, load]);

  return (
    <div className="flex items-center gap-3 bg-cyan-500/20 rounded-full px-4 py-2 min-w-[200px]">
      <button
        onClick={toggle}
        className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center hover:bg-cyan-600 transition-colors"
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      
      {/* Waveform visualization */}
      <div className="flex-1 flex items-center gap-0.5 h-8">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="w-1 bg-cyan-400/50 rounded-full transition-all"
            style={{
              height: `${Math.random() * 100}%`,
              opacity: (i / 20) * 100 <= progress ? 1 : 0.3,
            }}
          />
        ))}
      </div>
      
      <span className="text-xs text-cyan-400">
        {formatDuration(Math.floor(isPlaying ? currentTime : duration))}
      </span>
    </div>
  );
};

// Message Bubble Component
const MessageBubble: React.FC<{ 
  message: Message; 
  isOwn: boolean;
  onDelete: () => void;
}> = ({ message, isOwn, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);

  // Extract media from content
  const mediaMatch = message.content?.match(new RegExp(`${MEDIA_MARKER}(.*?)${MEDIA_MARKER}`));
  const mediaUrl = message.media || mediaMatch?.[1];
  const cleanContent = message.content?.replace(new RegExp(`${MEDIA_MARKER}.*?${MEDIA_MARKER}`, 'g'), '').trim();

  return (
    <div className={cn(
      "flex flex-col max-w-[80%]",
      isOwn ? "ml-auto items-end" : "mr-auto items-start"
    )}>
      <div className={cn(
        "relative group",
        isOwn ? "bg-cyan-600" : "bg-gray-800",
        "rounded-2xl px-4 py-2"
      )}>
        {/* Media content */}
        {mediaUrl && (
          <div className="mb-2 rounded-xl overflow-hidden">
            {mediaUrl.match(/\.(mp3|wav|ogg|m4a|webm)$/i) ? (
              <VoiceNotePlayer url={mediaUrl} />
            ) : mediaUrl.match(/\.(mp4|mov|avi|webm)$/i) ? (
              <video src={mediaUrl} controls className="max-w-full max-h-64 rounded-lg" />
            ) : (
              <img src={mediaUrl} alt="Media" className="max-w-full max-h-64 rounded-lg object-cover" />
            )}
          </div>
        )}

        {/* Text content */}
        {cleanContent && (
          <p 
            className="text-sm whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: linkify(cleanContent) }}
          />
        )}

        {/* Menu button */}
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="absolute -top-2 -right-2 p-1 bg-gray-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreVertical className="w-3 h-3" />
        </button>

        {/* Menu */}
        {showMenu && (
          <div className="absolute top-full right-0 mt-1 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-10 animate-scale-in">
            {isOwn && (
              <button
                onClick={() => {
                  onDelete();
                  setShowMenu(false);
                }}
                className="px-3 py-2 text-sm text-red-400 hover:bg-white/5 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Timestamp & status */}
      <div className="flex items-center gap-1 mt-1 px-1">
        <span className="text-[10px] text-gray-500">
          {formatTimestamp(message.timestamp)}
        </span>
        {isOwn && (
          message.isRead ? (
            <CheckCheck className="w-3 h-3 text-cyan-400" />
          ) : (
            <Check className="w-3 h-3 text-gray-500" />
          )
        )}
      </div>
    </div>
  );
};

// Main Chat Screen
export const ChatScreen: React.FC = () => {
  const { currentUser, currentChatUser, setCurrentChatUser } = useStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAIRewrite, setShowAIRewrite] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recording
  const { isRecording, duration, startRecording, stopRecording, cancelRecording } = useRecording();

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load messages
  useEffect(() => {
    if (!currentUser || !currentChatUser) return;

    const loadMessages = async () => {
      const msgs = await fetchMessages(currentUser.username, currentChatUser);
      setMessages(msgs);
    };

    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [currentUser, currentChatUser]);

  const handleSend = async () => {
    if (!inputText.trim() || !currentUser || !currentChatUser) return;

    setIsLoading(true);
    try {
      await sendMessage(currentUser.username, currentChatUser, inputText);
      setInputText('');
      
      // Refresh messages
      const msgs = await fetchMessages(currentUser.username, currentChatUser);
      setMessages(msgs);
    } catch (error) {
      console.error('Send error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || !currentChatUser) return;

    setIsLoading(true);
    try {
      const url = await uploadToCatbox(file);
      const mediaType = file.type.startsWith('video/') ? 'video' : 
                        file.type.startsWith('audio/') ? 'audio' : 'image';
      
      await sendMessage(
        currentUser.username, 
        currentChatUser, 
        '', 
        url, 
        mediaType
      );
      
      const msgs = await fetchMessages(currentUser.username, currentChatUser);
      setMessages(msgs);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceRecord = async () => {
    if (isRecording) {
      const result = await stopRecording();
      if (result && currentUser && currentChatUser) {
        setIsLoading(true);
        try {
          // Upload voice note
          const file = new File([result.blob], 'voice.webm', { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('reqtype', 'fileupload');
          formData.append('fileToUpload', file);
          
          const response = await fetch('https://corsproxy.io/?https://catbox.moe/user/api.php', {
            method: 'POST',
            body: formData,
          });
          
          const url = await response.text();
          const markedUrl = markMediaLink(url.trim());
          
          await sendMessage(currentUser.username, currentChatUser, markedUrl, url.trim(), 'audio');
          
          const msgs = await fetchMessages(currentUser.username, currentChatUser);
          setMessages(msgs);
        } catch (error) {
          console.error('Voice upload error:', error);
        } finally {
          setIsLoading(false);
        }
      }
    } else {
      await startRecording('audio');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Delete this message?')) return;
    
    try {
      await deleteMessage(messageId, currentUser?.username || '');
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleAIRewrite = async () => {
    if (!inputText.trim()) return;
    
    setIsLoading(true);
    try {
      const rewritten = await rewriteText(inputText, 'casual');
      setInputText(rewritten);
      setShowAIRewrite(false);
    } catch (error) {
      console.error('AI rewrite error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentChatUser) {
    return <MessagesScreen />;
  }

  return (
    <div className="screen-container flex flex-col h-screen pt-14">
      {/* Header */}
      <div className="glass border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button 
          onClick={() => setCurrentChatUser(null)}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <img
          src={`https://ui-avatars.com/api/?name=${currentChatUser}&background=random`}
          alt={currentChatUser}
          className="w-10 h-10 rounded-full"
        />

        <div className="flex-1">
          <h3 className="font-semibold">@{currentChatUser}</h3>
          <p className="text-xs text-green-400">Online</p>
        </div>

        <div className="flex gap-2">
          <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <Phone className="w-5 h-5" />
          </button>
          <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <Video className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, idx) => (
          <MessageBubble
            key={idx}
            message={message}
            isOwn={message.sender === currentUser?.username}
            onDelete={() => handleDeleteMessage(message.id || '')}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="glass border-t border-gray-800 p-4">
        {/* AI Rewrite suggestion */}
        {showAIRewrite && inputText && (
          <div className="mb-2 p-2 bg-purple-500/20 rounded-lg flex items-center justify-between">
            <span className="text-sm text-purple-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI can rewrite this message
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowAIRewrite(false)}
                className="text-xs text-gray-400 hover:text-white"
              >
                Dismiss
              </button>
              <button 
                onClick={handleAIRewrite}
                className="text-xs text-purple-400 hover:text-purple-300 font-medium"
              >
                Rewrite
              </button>
            </div>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Attachments */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-full hover:bg-white/10 transition-colors"
          >
            <Paperclip className="w-5 h-5 text-gray-400" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Text Input */}
          <div className="flex-1 relative">
            <textarea
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                if (e.target.value.length > 10) {
                  setShowAIRewrite(true);
                }
              }}
              placeholder="Type a message..."
              className="w-full px-4 py-3 bg-gray-800/50 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/20 max-h-32"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            
            {/* Emoji button */}
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <Smile className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Voice / Send */}
          {inputText.trim() ? (
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="p-3 rounded-full bg-cyan-500 hover:bg-cyan-600 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleVoiceRecord}
              className={cn(
                "p-3 rounded-full transition-colors",
                isRecording ? "bg-red-500 animate-pulse" : "bg-gray-700 hover:bg-gray-600"
              )}
            >
              {isRecording ? <X className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          )}
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="mt-2 flex items-center justify-center gap-2 text-red-400">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm">Recording... {formatDuration(duration)}</span>
            <button onClick={cancelRecording} className="text-xs underline">Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
};

// DM List Screen (exported as MessagesScreen)
export const MessagesScreen: React.FC = () => {
  const { currentUser, setCurrentChatUser } = useStore();
  const [users, setUsers] = useState<Array<{ username: string; pic?: string; lastMessage?: string }>>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await fetch(
          `https://docs.google.com/spreadsheets/d/1cQyIHRYMCwo_PMMW6gHm3Uul4e79oi7Z8uMra5-GQuI/gviz/tq?sheet=Users&tqx=out:json`
        );
        const text = await response.text();
        const jsonStr = text.replace(/^\/\*O_o\*\/\ngoogle\.visualization\.Query\.setResponse\(/, '').replace(/\);$/, '');
        const data = JSON.parse(jsonStr);
        
        const userList = data.table.rows
          .map((row: any) => ({
            username: row.c[1]?.v,
            pic: row.c[6]?.v,
          }))
          .filter((u: any) => u.username && u.username !== currentUser?.username);
        
        setUsers(userList);
      } catch (error) {
        console.error('Load users error:', error);
      }
    };

    loadUsers();
  }, [currentUser]);

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="screen-container pt-20 pb-24">
      {/* Header */}
      <div className="px-4 mb-4">
        <h1 className="text-2xl font-bold mb-4">Messages</h1>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-10 pr-4 py-3 bg-gray-800/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
        </div>
      </div>

      {/* User List */}
      <div className="px-4 space-y-2">
        {filteredUsers.map((user) => (
          <button
            key={user.username}
            onClick={() => setCurrentChatUser(user.username)}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
          >
            <div className="relative">
              <img
                src={user.pic || `https://ui-avatars.com/api/?name=${user.username}&background=random`}
                alt={user.username}
                className="w-12 h-12 rounded-full object-cover"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-900" />
            </div>
            
            <div className="flex-1 text-left">
              <h3 className="font-semibold">@{user.username}</h3>
              <p className="text-sm text-gray-500 truncate">
                {user.lastMessage || 'Tap to start chatting'}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ChatScreen;
