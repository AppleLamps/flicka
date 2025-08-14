import { useState, useRef, useEffect, useCallback, memo } from "react";
import { OptimizedVideoCard } from "./OptimizedVideoCard";
import { FeedSkeleton } from "./SkeletonLoader";

interface Video {
  id: string;
  video_url: string;
  thumbnail_url?: string;
  user_id: string;
  description?: string;
  hashtags?: string[];
  audio_title?: string;
  likes_count: number;
  comments_count: number;
  profiles?: {
    username?: string;
    display_name?: string;
    avatar_url?: string;
  };
}

interface VideoFeedProps {
  videos: Video[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onVideoComment: (videoId: string) => void;
  onUserClick: (userId: string) => void;
  onShare: (video: Video) => void;
  onLike: (videoId: string) => void;
  onRevine: (videoId: string) => void;
  triggerHaptic: (type?: 'light' | 'medium' | 'heavy') => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

const VideoFeedBase = ({
  videos,
  loading,
  hasMore,
  onLoadMore,
  onVideoComment,
  onUserClick,
  onShare,
  onLike,
  onRevine,
  triggerHaptic,
  isMuted,
  onToggleMute
}: VideoFeedProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleVideos, setVisibleVideos] = useState(new Set<number>());
  const containerRef = useRef<HTMLDivElement>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const loadMoreObserverRef = useRef<IntersectionObserver | null>(null);
  const loadMoreElementRef = useRef<HTMLDivElement>(null);

  // Intersection observer for visible videos
  useEffect(() => {
    if (intersectionObserverRef.current) {
      intersectionObserverRef.current.disconnect();
    }

    intersectionObserverRef.current = new IntersectionObserver(
      (entries) => {
        const newVisibleVideos = new Set(visibleVideos);
        
        entries.forEach((entry) => {
          const index = parseInt(entry.target.getAttribute('data-index') || '0');
          
          if (entry.isIntersecting && entry.intersectionRatio > 0.7) {
            newVisibleVideos.add(index);
            setCurrentIndex(index);
          } else {
            newVisibleVideos.delete(index);
          }
        });
        
        setVisibleVideos(newVisibleVideos);
      },
      {
        threshold: [0.7],
        rootMargin: '0px'
      }
    );

    // Observe all video elements
    const videoElements = containerRef.current?.querySelectorAll('[data-video-item]');
    videoElements?.forEach(el => intersectionObserverRef.current?.observe(el));

    return () => intersectionObserverRef.current?.disconnect();
  }, [videos.length]);

  // Load more observer
  useEffect(() => {
    if (loadMoreObserverRef.current) {
      loadMoreObserverRef.current.disconnect();
    }

    loadMoreObserverRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          onLoadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px'
      }
    );

    if (loadMoreElementRef.current) {
      loadMoreObserverRef.current.observe(loadMoreElementRef.current);
    }

    return () => loadMoreObserverRef.current?.disconnect();
  }, [hasMore, loading, onLoadMore]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' && currentIndex < videos.length - 1) {
        const nextElement = document.querySelector(`[data-index="${currentIndex + 1}"]`);
        nextElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (e.key === 'ArrowUp' && currentIndex > 0) {
        const prevElement = document.querySelector(`[data-index="${currentIndex - 1}"]`);
        prevElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, videos.length]);

  if (loading && videos.length === 0) {
    return <FeedSkeleton count={3} />;
  }

  return (
    <div 
      ref={containerRef}
      className="h-full overflow-y-auto snap-y snap-mandatory scroll-smooth overscroll-none touch-scroll-smooth"
    >
      {videos.map((video, index) => (
        <div
          key={video.id}
          data-video-item
          data-index={index}
          className="w-full h-screen snap-start snap-always will-change-transform"
        >
          <OptimizedVideoCard
            id={video.id}
            videoUrl={video.video_url}
            thumbnailUrl={video.thumbnail_url}
            user={{
              id: video.user_id,
              username: video.profiles?.username || 'user',
              displayName: video.profiles?.display_name || 'User',
              avatarUrl: video.profiles?.avatar_url || ''
            }}
            caption={video.description || ''}
            hashtags={video.hashtags || []}
            audioTitle={video.audio_title}
            stats={{
              likes: video.likes_count,
              comments: video.comments_count,
              shares: 0,
              saves: 0,
              revines: 0
            }}
            autoPlay={visibleVideos.has(index)}
            isVisible={visibleVideos.has(index)}
            isMuted={isMuted}
            onToggleMute={onToggleMute}
            onComment={() => onVideoComment(video.id)}
            onUserClick={() => onUserClick(video.user_id)}
            onLike={() => onLike(video.id)}
            onShare={() => onShare(video)}
            onRevine={() => onRevine(video.id)}
            triggerHaptic={triggerHaptic}
          />
        </div>
      ))}

      {/* Load More Trigger */}
      <div 
        ref={loadMoreElementRef}
        className="h-20 flex items-center justify-center"
      >
        {loading && hasMore && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
            <span className="text-sm">Loading more videos...</span>
          </div>
        )}
        
        {!hasMore && videos.length > 0 && (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">You've reached the end!</p>
            <p className="text-xs mt-1">Follow more creators to see more content</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const VideoFeed = memo(VideoFeedBase);
