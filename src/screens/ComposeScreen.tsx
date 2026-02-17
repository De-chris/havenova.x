import React, { useState, useRef } from 'react';
import { 
  X, Image as ImageIcon, Video, Mic, Sparkles,
  Film, Hash, AtSign, Globe
} from 'lucide-react';
import { cn, createPost, uploadToCatbox, markMediaLink, rewriteText } from '@/lib/utils';
import { useStore } from '@/hooks/useStore';
import { useRecording } from '@/hooks/useRecording';

export const ComposeScreen: React.FC = () => {
  const { currentUser, setIsComposeOpen, navigateTo, setLoading } = useStore();
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio' | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showAIRewrite, setShowAIRewrite] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  // Voice recording
  const { isRecording, duration, startRecording, stopRecording, cancelRecording } = useRecording();

  const handleClose = () => {
    setIsComposeOpen(false);
    setContent('');
    setMedia(null);
    setMediaType(null);
    setMediaFile(null);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setMedia(previewUrl);
    setMediaType(type);
    setMediaFile(file);
  };

  const handleVoiceRecord = async () => {
    if (isRecording) {
      const result = await stopRecording();
      if (result) {
        setMedia(result.url);
        setMediaType('audio');
        
        // Convert blob to file for upload
        const file = new File([result.blob], 'voice.webm', { type: 'audio/webm' });
        setMediaFile(file);
      }
    } else {
      await startRecording('audio');
    }
  };

  const handleVideoRecord = async () => {
    if (isRecording) {
      const result = await stopRecording();
      if (result) {
        setMedia(result.url);
        setMediaType('video');
        
        const file = new File([result.blob], 'video.webm', { type: 'video/webm' });
        setMediaFile(file);
      }
    } else {
      await startRecording('video');
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && !mediaFile) return;
    if (!currentUser) {
      navigateTo('profile');
      return;
    }

    setIsUploading(true);
    setLoading(true, 'Uploading to neural network...');

    try {
      let mediaUrl = '';
      let finalContent = content;

      // Upload media if present
      if (mediaFile) {
        mediaUrl = await uploadToCatbox(mediaFile);
        
        // Mark media link with special character
        const markedMedia = markMediaLink(mediaUrl);
        finalContent = content ? `${content}\n${markedMedia}` : markedMedia;
      }

      // Create post
      await createPost(currentUser.username, finalContent, mediaUrl, mediaType || undefined);

      handleClose();
      navigateTo('home');
    } catch (error) {
      console.error('Post error:', error);
      alert('Failed to create post');
    } finally {
      setIsUploading(false);
      setLoading(false);
    }
  };

  const handleAIRewrite = async () => {
    if (!content.trim()) return;
    
    setLoading(true, 'AI is rewriting...');
    try {
      const rewritten = await rewriteText(content, 'casual');
      setContent(rewritten);
      setShowAIRewrite(false);
    } catch (error) {
      console.error('Rewrite error:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeMedia = () => {
    setMedia(null);
    setMediaType(null);
    setMediaFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const charCount = content.length;
  const maxChars = 500;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <h2 className="font-semibold">New Post</h2>
          
          <button
            onClick={handleSubmit}
            disabled={(!content.trim() && !mediaFile) || isUploading || isRecording}
            className={cn(
              "px-4 py-2 rounded-full font-medium transition-all",
              (content.trim() || mediaFile) && !isUploading && !isRecording
                ? "bg-cyan-500 hover:bg-cyan-600 text-white"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
            )}
          >
            {isUploading ? 'Posting...' : 'Post'}
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* User info */}
          <div className="flex items-center gap-3 mb-4">
            <img
              src={currentUser?.pic || `https://ui-avatars.com/api/?name=${currentUser?.username}`}
              alt={currentUser?.username}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <p className="font-semibold">@{currentUser?.username}</p>
              <button 
                onClick={() => setVisibility(prev => 
                  prev === 'public' ? 'followers' : prev === 'followers' ? 'private' : 'public'
                )}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-cyan-400"
              >
                <Globe className="w-3 h-3" />
                {visibility.charAt(0).toUpperCase() + visibility.slice(1)}
              </button>
            </div>
          </div>

          {/* AI Rewrite suggestion */}
          {showAIRewrite && content.length > 20 && (
            <div className="mb-4 p-3 bg-purple-500/20 rounded-lg flex items-center justify-between">
              <span className="text-sm text-purple-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                AI can improve your post
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

          {/* Text input */}
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (e.target.value.length > 20) {
                setShowAIRewrite(true);
              }
            }}
            placeholder="What's on your mind?"
            className="w-full bg-transparent text-lg placeholder-gray-500 resize-none focus:outline-none min-h-[120px]"
            maxLength={maxChars}
          />

          {/* Media Preview */}
          {media && (
            <div className="relative mt-4 rounded-xl overflow-hidden">
              {mediaType === 'image' ? (
                <img src={media} alt="Preview" className="w-full max-h-64 object-cover" />
              ) : mediaType === 'video' ? (
                <video src={media} controls className="w-full max-h-64" />
              ) : mediaType === 'audio' ? (
                <audio src={media} controls className="w-full" />
              ) : null}
              
              <button
                onClick={removeMedia}
                className="absolute top-2 right-2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Recording indicator */}
          {isRecording && (
            <div className="mt-4 p-4 bg-red-500/20 rounded-xl flex items-center justify-center gap-3">
              <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-400">
                Recording {mediaType === 'video' ? 'video' : 'voice'}... {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
              </span>
              <button onClick={cancelRecording} className="text-sm underline">Cancel</button>
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="border-t border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {/* Image */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isRecording || isUploading || !!media}
                className="p-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
                title="Add image"
              >
                <ImageIcon className="w-5 h-5 text-cyan-400" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileSelect(e, 'image')}
                className="hidden"
              />

              {/* Video */}
              <button
                onClick={() => videoInputRef.current?.click()}
                disabled={isRecording || isUploading || !!media}
                className="p-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
                title="Add video"
              >
                <Film className="w-5 h-5 text-purple-400" />
              </button>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={(e) => handleFileSelect(e, 'video')}
                className="hidden"
              />

              {/* Voice Note */}
              <button
                onClick={handleVoiceRecord}
                disabled={isUploading || !!media}
                className={cn(
                  "p-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50",
                  isRecording && "bg-red-500/20 animate-pulse"
                )}
                title={isRecording ? "Stop recording" : "Record voice"}
              >
                <Mic className={cn("w-5 h-5", isRecording ? "text-red-400" : "text-pink-400")} />
              </button>

              {/* Record Video */}
              <button
                onClick={handleVideoRecord}
                disabled={isUploading || !!media}
                className={cn(
                  "p-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50",
                  isRecording && mediaType === 'video' && "bg-red-500/20 animate-pulse"
                )}
                title={isRecording ? "Stop recording" : "Record video"}
              >
                <Video className={cn("w-5 h-5", isRecording && mediaType === 'video' ? "text-red-400" : "text-green-400")} />
              </button>

              {/* AI Assist */}
              <button
                onClick={() => setShowAIRewrite(!showAIRewrite)}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                title="AI Assist"
              >
                <Sparkles className="w-5 h-5 text-yellow-400" />
              </button>

              {/* Hashtag */}
              <button
                onClick={() => setContent(prev => prev + '#')}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                title="Add hashtag"
              >
                <Hash className="w-5 h-5 text-blue-400" />
              </button>

              {/* Mention */}
              <button
                onClick={() => setContent(prev => prev + '@')}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                title="Mention user"
              >
                <AtSign className="w-5 h-5 text-orange-400" />
              </button>
            </div>

            {/* Character count */}
            <span className={cn(
              "text-xs",
              charCount > maxChars * 0.9 ? "text-red-400" : "text-gray-500"
            )}>
              {charCount}/{maxChars}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComposeScreen;
