import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Sparkles, Bot, User, Trash2, Plus, 
  ChevronLeft, Copy, Check, RefreshCw
} from 'lucide-react';
import { cn, sendAIMessage, rewriteText } from '@/lib/utils';
import { useStore } from '@/hooks/useStore';
import type { AIMessage } from '@/types';

interface ChatSession {
  id: string;
  title: string;
  messages: AIMessage[];
  createdAt: string;
}

const WELCOME_MESSAGE: AIMessage = {
  role: 'assistant',
  content: "Hello! I'm Dechris AI, created by the Havenova-x team. I'm here to help you with anything you need. How can I assist you today?",
  timestamp: new Date().toISOString(),
};

export const AIChatScreen: React.FC = () => {
  const { navigateTo } = useStore();
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chats from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dechris_ai_chats');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setChats(parsed);
        if (parsed.length > 0) {
          setCurrentChatId(parsed[0].id);
        }
      } catch {
        createNewChat();
      }
    } else {
      createNewChat();
    }
  }, []);

  // Save chats
  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem('dechris_ai_chats', JSON.stringify(chats));
    }
  }, [chats]);

  const currentChat = chats.find(c => c.id === currentChatId);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.messages]);

  const createNewChat = () => {
    const newChat: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [WELCOME_MESSAGE],
      createdAt: new Date().toISOString(),
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setShowSidebar(false);
  };

  const deleteChat = (id: string) => {
    setChats(prev => prev.filter(c => c.id !== id));
    if (currentChatId === id) {
      const remaining = chats.filter(c => c.id !== id);
      setCurrentChatId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !currentChatId || isLoading) return;

    const userMessage: AIMessage = {
      role: 'user',
      content: inputText,
      timestamp: new Date().toISOString(),
    };

    // Add user message
    setChats(prev => prev.map(chat => 
      chat.id === currentChatId 
        ? { ...chat, messages: [...chat.messages, userMessage] }
        : chat
    ));

    setInputText('');
    setIsLoading(true);

    try {
      const chatMessages = currentChat?.messages.slice(-10) || [];
      const response = await sendAIMessage([
        ...chatMessages,
        userMessage,
      ]);

      const aiMessage: AIMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };

      setChats(prev => prev.map(chat => 
        chat.id === currentChatId 
          ? { ...chat, messages: [...chat.messages, aiMessage] }
          : chat
      ));

      // Update chat title based on first user message
      if (currentChat?.messages.length === 1) {
        const title = inputText.slice(0, 30) + (inputText.length > 30 ? '...' : '');
        setChats(prev => prev.map(chat => 
          chat.id === currentChatId 
            ? { ...chat, title }
            : chat
        ));
      }
    } catch (error) {
      console.error('AI error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleRewrite = async () => {
    if (!inputText.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const rewritten = await rewriteText(inputText, 'casual');
      setInputText(rewritten);
    } catch (error) {
      console.error('Rewrite error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="screen-container flex h-screen pt-14">
      {/* Sidebar - Chat History */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 transform transition-transform duration-300 lg:relative lg:translate-x-0",
        showSidebar ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <span className="font-semibold">Dechris AI</span>
          </div>
          <button 
            onClick={() => setShowSidebar(false)}
            className="lg:hidden p-1 hover:bg-white/10 rounded"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={createNewChat}
            className="w-full flex items-center gap-2 px-4 py-2 border border-gray-700 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        {/* Chat List */}
        <div className="overflow-y-auto flex-1 px-2 space-y-1">
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => {
                setCurrentChatId(chat.id);
                setShowSidebar(false);
              }}
              className={cn(
                "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                currentChatId === chat.id 
                  ? "bg-purple-500/20 border border-purple-500/30" 
                  : "hover:bg-white/5"
              )}
            >
              <Bot className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="flex-1 truncate text-sm">{chat.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChat(chat.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
              >
                <Trash2 className="w-3 h-3 text-red-400" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Overlay for mobile */}
      {showSidebar && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="glass border-b border-gray-800 px-4 py-3 flex items-center gap-3">
          <button 
            onClick={() => setShowSidebar(true)}
            className="lg:hidden p-2 rounded-full hover:bg-white/10"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold">Dechris AI</h3>
            <p className="text-xs text-green-400 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Online
            </p>
          </div>

          <button 
            onClick={() => navigateTo('home')}
            className="p-2 rounded-full hover:bg-white/10"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {currentChat?.messages.map((message, idx) => (
            <div
              key={idx}
              className={cn(
                "flex gap-3",
                message.role === 'user' ? "flex-row-reverse" : ""
              )}
            >
              {/* Avatar */}
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                message.role === 'user' 
                  ? "bg-cyan-500" 
                  : "bg-gradient-to-br from-purple-500 to-pink-500"
              )}>
                {message.role === 'user' ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </div>

              {/* Message */}
              <div className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2 relative group",
                message.role === 'user' 
                  ? "bg-cyan-600" 
                  : "bg-gray-800"
              )}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                
                {/* Actions */}
                <div className={cn(
                  "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1",
                  message.role === 'user' ? "-left-16" : "-right-16"
                )}>
                  <button
                    onClick={() => handleCopy(message.content, idx)}
                    className="p-1.5 bg-gray-700 rounded-full hover:bg-gray-600"
                  >
                    {copiedIndex === idx ? (
                      <Check className="w-3 h-3 text-green-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                  {message.role === 'assistant' && (
                    <button
                      onClick={() => {
                        setInputText(message.content);
                      }}
                      className="p-1.5 bg-gray-700 rounded-full hover:bg-gray-600"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="bg-gray-800 rounded-2xl px-4 py-3 flex items-center gap-1">
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="glass border-t border-gray-800 p-4">
          <div className="flex items-end gap-2 max-w-4xl mx-auto">
            <div className="flex-1 relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Message Dechris AI..."
                className="w-full px-4 py-3 pr-20 bg-gray-800/50 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/20 max-h-32"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              
              {/* AI Rewrite button */}
              {inputText.length > 10 && (
                <button
                  onClick={handleRewrite}
                  className="absolute right-12 top-1/2 -translate-y-1/2 p-2 text-purple-400 hover:text-purple-300"
                  title="Rewrite with AI"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isLoading}
              className="p-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatScreen;
