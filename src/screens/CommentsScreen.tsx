import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Heart, MoreHorizontal } from 'lucide-react';
import { linkify, formatTimestamp, addComment, fetchFeed } from '@/lib/utils';
import { useStore } from '@/hooks/useStore';
import type { Post, Comment } from '@/types';

export const CommentsScreen: React.FC = () => {
  const { currentUser, navigateTo } = useStore();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedPost = sessionStorage.getItem('currentPost');
    if (savedPost) {
      const parsed = JSON.parse(savedPost);
      setPost(parsed);
      loadComments(parsed.pid);
    }
  }, []);

  const loadComments = async (postId: string) => {
    setIsLoading(true);
    try {
      // Fetch fresh post data to get comments
      const feed = await fetchFeed();
      const currentPost = feed.find(p => p.pid === postId);
      if (currentPost?.recent_comments) {
        setComments(currentPost.recent_comments);
      }
    } catch (error) {
      console.error('Load comments error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !post || !currentUser) return;

    setIsLoading(true);
    try {
      await addComment(post.pid, currentUser.username, newComment);
      
      // Optimistically add comment
      const comment: Comment = {
        user: currentUser.username,
        text: newComment,
        timestamp: new Date().toISOString(),
        pic: currentUser.pic,
      };
      
      setComments(prev => [comment, ...prev]);
      setNewComment('');
      
      // Refresh to get actual data
      loadComments(post.pid);
    } catch (error) {
      console.error('Add comment error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!post) {
    return (
      <div className="screen-container pt-20 pb-24 flex items-center justify-center">
        <p className="text-gray-500">Post not found</p>
      </div>
    );
  }

  return (
    <div className="screen-container pt-14 pb-24">
      {/* Header */}
      <div className="glass border-b border-gray-800 px-4 py-3 flex items-center gap-3 sticky top-14 z-40">
        <button 
          onClick={() => navigateTo('home')}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-semibold">Comments</h2>
      </div>

      {/* Original Post */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex gap-3">
          <img
            src={post.pic || `https://ui-avatars.com/api/?name=${post.author}`}
            alt={post.author}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">@{post.author}</span>
              <span className="text-gray-500 text-sm">{formatTimestamp(post.timestamp)}</span>
            </div>
            <p 
              className="mt-1 text-sm"
              dangerouslySetInnerHTML={{ __html: linkify(post.content) }}
            />
            {post.media && (
              <img 
                src={post.media} 
                alt="Post media" 
                className="mt-2 rounded-xl max-h-48 object-cover"
              />
            )}
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className="flex-1 p-4 space-y-4">
        {isLoading && comments.length === 0 ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-800 rounded w-1/4" />
                  <div className="h-3 bg-gray-800 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No comments yet</p>
            <p className="text-sm text-gray-600 mt-1">Be the first to comment!</p>
          </div>
        ) : (
          comments.map((comment, idx) => (
            <div key={idx} className="flex gap-3 group">
              <img
                src={comment.pic || `https://ui-avatars.com/api/?name=${comment.user}`}
                alt={comment.user}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">@{comment.user}</span>
                  <span className="text-gray-500 text-xs">
                    {comment.timestamp ? formatTimestamp(comment.timestamp) : ''}
                  </span>
                </div>
                <p 
                  className="mt-1 text-sm text-gray-300"
                  dangerouslySetInnerHTML={{ __html: linkify(comment.text) }}
                />
                
                {/* Comment actions */}
                <div className="flex items-center gap-4 mt-2">
                  <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-pink-400">
                    <Heart className="w-3 h-3" />
                    Like
                  </button>
                  <button className="text-xs text-gray-500 hover:text-cyan-400">
                    Reply
                  </button>
                </div>
              </div>
              
              {comment.user === currentUser?.username && (
                <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-all">
                  <MoreHorizontal className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="fixed bottom-0 left-0 right-0 glass border-t border-gray-800 p-4">
        <form onSubmit={handleSubmit} className="flex gap-3 max-w-2xl mx-auto">
          <img
            src={currentUser?.pic || `https://ui-avatars.com/api/?name=${currentUser?.username}`}
            alt={currentUser?.username}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="w-full px-4 py-3 pr-12 bg-gray-800/50 rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!newComment.trim() || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommentsScreen;
