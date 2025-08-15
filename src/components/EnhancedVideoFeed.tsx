import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PullToRefreshWrapper } from './PullToRefreshWrapper';
import { useGestures, showGestureFeedback } from '@/hooks/useGestures';
import { useHaptics } from '@/hooks/useHaptics';
import { OptimizedVideoCard } from './OptimizedVideoCard';
import { FeedSkeleton } from './SkeletonLoader';

interface Video {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  caption: string;
  hashtags: string[];
  audioTitle?: string;
  stats: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    revines?: number;
  };
  isLiked?: boolean;
  isFollowing?: boolean;
}

interface EnhancedVideoFeedProps {
  videos: Video[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onRefresh?: () => Promise<void>;
  onLike?: (videoId: string) => void;
  onComment?: (videoId: string) => void;
  onShare?: (videoId: string) => void;
  onRevine?: (videoId: string) => void;
  onFollow?: (userId: string) => void;
  onUserClick?: (userId: string) => void;
  currentIndex?: number;
  onIndexChange?: (index: number) => void;
}

export const EnhancedVideoFeed: React.FC<EnhancedVideoFeedProps> = ({
  videos,
  loading = false,
  hasMore = false,
  onLoadMore,
  onRefresh,
  onLike,
  onComment,
  onShare,
  onRevine,
  onFollow,
  onUserClick,
  currentIndex = 0,
  onIndexChange
}) => {
  const [visibleVideos, setVisibleVideos] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const { triggerHaptic } = useHaptics();

  // Intersection Observer for video visibility
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = new Set<number>();
        let newCurrentIndex = currentIndex;

        entries.forEach((entry) => {
          const index = parseInt(entry.target.getAttribute('data-index') || '0');
          if (entry.isIntersecting) {
            visible.add(index);
            if (entry.intersectionRatio > 0.7) {
              newCurrentIndex = index;
            }
          }
        });

        setVisibleVideos(visible);
        if (newCurrentIndex !== currentIndex) {
          onIndexChange?.(newCurrentIndex);
          triggerHaptic('light');
        }
      },
      {
        threshold: [0.1, 0.7],
        rootMargin: '-10% 0px'
      }
    );

    const videoElements = document.querySelectorAll('[data-index]');
    videoElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [videos.length, currentIndex, onIndexChange, triggerHaptic]);

  // Load more observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !loading) {
          onLoadMore?.();
        }
      },
      { threshold: 0.1 }
    );

    const loadMoreElement = document.getElementById('load-more-trigger');
    if (loadMoreElement) {
      observer.observe(loadMoreElement);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  // Navigation functions
  const navigateToVideo = useCallback((index: number) => {
    if (index < 0 || index >= videos.length) return;
    
    const videoElement = document.querySelector(`[data-index="${index}"]`);
    if (videoElement) {
      videoElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
      triggerHaptic('light');
    }
  }, [videos.length, triggerHaptic]);

  // Gesture handlers
  const gestureHandlers = useGestures({
    onSwipeUp: () => {
      if (currentIndex < videos.length - 1) {
        navigateToVideo(currentIndex + 1);
        showGestureFeedback('⬆️');
      }
    },
    onSwipeDown: () => {
      if (currentIndex > 0) {
        navigateToVideo(currentIndex - 1);
        showGestureFeedback('⬇️');
      }
    },
    onDoubleTap: () => {
      const currentVideo = videos[currentIndex];
      if (currentVideo) {
        onLike?.(currentVideo.id);
        showGestureFeedback('❤️');
        triggerHaptic('medium');
      }
    }
  });

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) {
            navigateToVideo(currentIndex - 1);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < videos.length - 1) {
            navigateToVideo(currentIndex + 1);
          }
          break;
        case ' ':
          e.preventDefault();
          // Space to like current video
          const currentVideo = videos[currentIndex];
          if (currentVideo) {
            onLike?.(currentVideo.id);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, videos, navigateToVideo, onLike]);

  if (loading && videos.length === 0) {
    return <FeedSkeleton count={3} />;
  }

  return (
    <PullToRefreshWrapper onRefresh={onRefresh || (() => Promise.resolve())}>
      <div
        ref={containerRef}
        className="h-full overflow-y-auto snap-y snap-mandatory hide-scrollbar touch-scroll-smooth"
        onTouchStart={gestureHandlers.onTouchStart}
        onTouchEnd={gestureHandlers.onTouchEnd}
        onTouchMove={gestureHandlers.onTouchMove}
      >
        {videos.map((video, index) => (
          <div
            key={video.id}
            data-index={index}
            className={`snap-start transition-opacity duration-300 ${
              index === 0 ? 'animate-fade-in' : ''
            }`}
            style={{
              animationDelay: `${index * 0.1}s`
            }}
          >
            <OptimizedVideoCard
              {...video}
              triggerHaptic={triggerHaptic}
              autoPlay={visibleVideos.has(index)}
              isVisible={visibleVideos.has(index)}
              onLike={() => onLike?.(video.id)}
              onComment={() => onComment?.(video.id)}
              onShare={() => onShare?.(video.id)}
              onRevine={() => onRevine?.(video.id)}
              onFollow={() => onFollow?.(video.user.id)}
              onUserClick={() => onUserClick?.(video.user.id)}
            />
          </div>
        ))}

        {/* Load More Trigger */}
        <div id="load-more-trigger" className="h-20 flex items-center justify-center">
          {loading && hasMore && (
            <div className="flex items-center gap-2 text-muted-foreground animate-fade-in">
              <div className="loading-spinner w-5 h-5 rounded-full"></div>
              <span className="text-sm">Loading more videos...</span>
            </div>
          )}
          
          {!hasMore && videos.length > 0 && (
            <div className="text-center text-muted-foreground py-8 animate-fade-in">
              <p className="text-sm">You've reached the end!</p>
              <p className="text-xs mt-1">Follow more creators to see more content</p>
            </div>
          )}
        </div>
      </div>
    </PullToRefreshWrapper>
  );
};