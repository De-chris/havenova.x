import React, { useState } from 'react';
import { 
  Heart, MessageCircle, Share2, MoreHorizontal, Send,
  Trash2, Flag, Bookmark, Copy, Check, Laugh, Frown, 
  Angry, ThumbsUp
} from 'lucide-react';
import { cn, linkify, formatTimestamp, extractMediaLinks, MEDIA_MARKER } from '@/lib/utils';
import type { Post } from '@/types';
import { useStore } from '@/hooks/useStore';
import { likePost, deletePost } from '@/lib/utils';

interface PostCardProps {
  post: Post;
  onCommentClick?: () => void;
  onUserClick?: (username: string) => void;
}

const reactions = [
  { type: 'like', icon: ThumbsUp, color: 'text-blue-500', label: 'Like' },
  { type: 'love', icon: Heart, color: 'text-pink-500', label: 'Love' },
  { type: 'laugh', icon: Laugh, color: 'text-yellow-500', label: 'Haha' },
  { type: 'sad', icon: Frown, color: 'text-purple-500', label: 'Sad' },
  { type: 'angry', icon: Angry, color: 'text-red-500', label: 'Angry' },
];

export const PostCard: React.FC<PostCardProps> = ({ post, onCommentClick, onUserClick }) => {
  const { currentUser, likedPosts, toggleLike, roleCache, navigateTo, setCurrentChatUser } = useStore();
  const [showReactions, setShowReactions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isLiked, setIsLiked] = useState(likedPosts.includes(post.pid));
  const [likeCount, setLikeCount] = useState(post.likes);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);

  const userRole = roleCache[post.author.toLowerCase()] || post.role || 'User';
  const hasPower = currentUser?.role === 'Admin' || currentUser?.role === 'Owner';
  const isOwner = post.author === currentUser?.username;
  const canDelete = isOwner || hasPower;

  // Extract media links
  const mediaLinks = post.content ? extractMediaLinks(post.content) : [];
  const cleanContent = post.content?.replace(new RegExp(`${MEDIA_MARKER}.*?${MEDIA_MARKER}`, 'g'), '').trim() || '';

  const handleLike = async () => {
    if (!currentUser) {
      navigateTo('profile');
      return;
    }

    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikeCount(prev => newLiked ? prev + 1 : prev - 1);
    toggleLike(post.pid);

    try {
      await likePost(post.pid, currentUser.username);
    } catch (error) {
      // Revert on error
      setIsLiked(!newLiked);
      setLikeCount(prev => newLiked ? prev - 1 : prev + 1);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
      await deletePost(post.pid, currentUser?.username || '');
      setIsDeleted(true);
    } catch (error) {
      alert('Failed to delete post');
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/?post=${post.pid}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${post.author}`,
          url,
        });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleMessage = () => {
    if (!currentUser) {
      navigateTo('profile');
      return;
    }
    setCurrentChatUser(post.author);
    navigateTo('chat');
  };

  const getRoleStyles = (role: string) => {
    switch (role) {
      case 'Owner':
        return 'text-red-400 font-bold';
      case 'Admin':
        return 'text-blue-400 font-semibold';
      default:
        return 'text-gray-300';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Owner':
        return '👑';
      case 'Admin':
        return '⚡';
      default:
        return '';
    }
  };

  if (isDeleted) return null;

  return (
    <article className="card-futuristic mb-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => onUserClick?.(post.author)}
        >
          <div className="relative">
            <img
              src={post.pic || `https://ui-avatars.com/api/?name=${post.author}&background=random`}
              alt={post.author}
              className="w-10 h-10 rounded-full object-cover border-2 border-transparent group-hover:border-cyan-400 transition-colors"
            />
            <span className="absolute -bottom-1 -right-1 text-xs">
              {getRoleIcon(userRole)}
            </span>
          </div>
          
          <div>
            <h3 className={cn("text-sm font-semibold", getRoleStyles(userRole))}>
              @{post.author}
            </h3>
            <p className="text-xs text-gray-500">
              {formatTimestamp(post.timestamp)}
            </p>
          </div>
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <MoreHorizontal className="w-5 h-5 text-gray-400" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 rounded-xl border border-gray-700 shadow-xl z-20 animate-scale-in">
              <button
                onClick={() => {
                  setIsBookmarked(!isBookmarked);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
              >
                <Bookmark className={cn("w-4 h-4", isBookmarked && "fill-current text-cyan-400")} />
                <span className="text-sm">{isBookmarked ? 'Saved' : 'Save Post'}</span>
              </button>
              
              <button
                onClick={() => {
                  handleShare();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                <span className="text-sm">{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
              
              {!isOwner && (
                <button
                  onClick={() => setShowMenu(false)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left text-red-400"
                >
                  <Flag className="w-4 h-4" />
                  <span className="text-sm">Report</span>
                </button>
              )}
              
              {canDelete && (
                <button
                  onClick={() => {
                    handleDelete();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm">Delete</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        {cleanContent && (
          <div 
            className="text-sm text-gray-200 whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: linkify(cleanContent) }}
          />
        )}
      </div>

      {/* Media */}
      {post.media && (
        <div className="relative">
          {post.mediaType === 'video' || post.media.match(/\.(mp4|webm|mov)$/i) ? (
            <video
              src={post.media}
              controls
              className="w-full max-h-96 object-cover"
              poster={post.media.replace(/\.[^.]+$/, '.jpg')}
            />
          ) : (
            <img
              src={post.media}
              alt="Post media"
              className="w-full max-h-96 object-cover"
              loading="lazy"
            />
          )}
        </div>
      )}

      {/* Embedded Media from Markers */}
      {mediaLinks.length > 0 && (
        <div className="px-4 py-2 space-y-2">
          {mediaLinks.map((media, idx) => (
            <div key={idx} className="rounded-xl overflow-hidden">
              {media.type === 'audio' ? (
                <audio src={media.url} controls className="w-full" />
              ) : media.type === 'video' ? (
                <video src={media.url} controls className="w-full max-h-64" />
              ) : (
                <img src={media.url} alt="Media" className="w-full max-h-64 object-cover" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center justify-between">
          {/* Left actions */}
          <div className="flex items-center gap-4">
            {/* Like with reactions */}
            <div 
              className="relative"
              onMouseEnter={() => setShowReactions(true)}
              onMouseLeave={() => setShowReactions(false)}
            >
              <button
                onClick={handleLike}
                className={cn(
                  "flex items-center gap-2 transition-all",
                  isLiked ? "text-pink-500" : "text-gray-400 hover:text-pink-400"
                )}
              >
                <Heart className={cn("w-5 h-5", isLiked && "fill-current")} />
                <span className="text-sm">{likeCount}</span>
              </button>
              
              {/* Reaction picker */}
              {showReactions && (
                <div className="absolute bottom-full left-0 mb-2 flex items-center gap-1 bg-gray-800 rounded-full p-2 shadow-xl border border-gray-700 animate-scale-in">
                  {reactions.map((reaction) => {
                    const Icon = reaction.icon;
                    return (
                      <button
                        key={reaction.type}
                        onClick={() => {
                          handleLike();
                          setShowReactions(false);
                        }}
                        className={cn(
                          "p-2 rounded-full hover:bg-white/10 transition-all hover:scale-125",
                          reaction.color
                        )}
                        title={reaction.label}
                      >
                        <Icon className="w-5 h-5" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Comments */}
            <button
              onClick={onCommentClick}
              className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm">{post.comment_count}</span>
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="flex items-center gap-2 text-gray-400 hover:text-green-400 transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          {/* Message button */}
          {!isOwner && (
            <button
              onClick={handleMessage}
              className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-cyan-400"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export default PostCard;
