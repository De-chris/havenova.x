import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, TrendingUp, Users, Clock } from 'lucide-react';
import { PostCard } from '@/components/ui/custom/PostCard';
import { FuturisticLoader, SkeletonLoader } from '@/components/ui/custom/FuturisticLoader';
import { useStore } from '@/hooks/useStore';
import { fetchFeed, fetchUsers } from '@/lib/utils';
import type { Post, User } from '@/types';

export const HomeScreen: React.FC = () => {
  const { posts, setPosts, navigateTo, setUserRole, setLoading, isLoading } = useStore();
  const [activeTab, setActiveTab] = useState<'feed' | 'trending' | 'following'>('feed');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stories, setStories] = useState<User[]>([]);

  const loadFeed = useCallback(async (force = false) => {
    if (force) {
      setIsRefreshing(true);
    } else {
      setLoading(true, 'Syncing neural network...');
    }

    try {
      const [feedData, usersData] = await Promise.all([
        fetchFeed(),
        fetchUsers(),
      ]);

      setPosts(feedData);
      
      // Cache user roles
      usersData.forEach(user => {
        setUserRole(user.username, user.role);
      });

      // Set stories (users with pics)
      setStories(usersData.filter(u => u.pic).slice(0, 10));
    } catch (error) {
      console.error('Load feed error:', error);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  }, [setPosts, setUserRole, setLoading]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleUserClick = (username: string) => {
    navigateTo('user-profile');
    // Store the target user for the profile screen
    sessionStorage.setItem('viewTarget', username);
  };

  const handleCommentClick = (post: Post) => {
    sessionStorage.setItem('currentPost', JSON.stringify(post));
    navigateTo('comments');
  };

  const filteredPosts = posts.filter(post => {
    if (activeTab === 'trending') {
      return post.likes > 10 || post.comment_count > 5;
    }
    return true;
  });

  return (
    <div className="screen-container pt-16 pb-24">
      {/* Stories Row */}
      {stories.length > 0 && (
        <div className="px-4 mb-4">
          <div className="flex gap-4 overflow-x-auto hide-scrollbar py-2">
            {/* Add Story Button */}
            <button className="flex-shrink-0 flex flex-col items-center gap-1">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-cyan-400 flex items-center justify-center hover:bg-cyan-400/10 transition-colors">
                <span className="text-2xl text-cyan-400">+</span>
              </div>
              <span className="text-xs text-gray-400">Add Story</span>
            </button>

            {/* User Stories */}
            {stories.map((user, idx) => (
              <button
                key={user.username}
                className="flex-shrink-0 flex flex-col items-center gap-1 group"
                onClick={() => handleUserClick(user.username)}
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="story-ring group-hover:scale-105 transition-transform">
                  <img
                    src={user.pic}
                    alt={user.username}
                    className="w-14 h-14 rounded-full object-cover border-2 border-gray-900"
                  />
                </div>
                <span className="text-xs text-gray-400 truncate max-w-16">
                  {user.username}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {[
            { id: 'feed', label: 'For You', icon: Clock },
            { id: 'trending', label: 'Trending', icon: TrendingUp },
            { id: 'following', label: 'Following', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                  transition-all duration-300 whitespace-nowrap
                  ${activeTab === tab.id 
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg shadow-cyan-500/25' 
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-white'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feed */}
      <div className="px-4">
        {isLoading && posts.length === 0 ? (
          <SkeletonLoader count={3} />
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
              <RefreshCw className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-300 mb-2">No posts yet</h3>
            <p className="text-sm text-gray-500">Be the first to share something!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map((post, idx) => (
              <div 
                key={post.pid}
                className="animate-slide-up"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <PostCard
                  post={post}
                  onUserClick={handleUserClick}
                  onCommentClick={() => handleCommentClick(post)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pull to refresh indicator */}
      {isRefreshing && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
          <FuturisticLoader size="sm" text="Refreshing..." />
        </div>
      )}
    </div>
  );
};

export default HomeScreen;
