import { useState, useRef, useEffect, useCallback } from "react";
import { Heart, MessageCircle, Share, Plus, Play, Repeat2, Bookmark, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoCardProps {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    isFollowing?: boolean;
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
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onRevine?: () => void;
  onFollow?: () => void;
  onUserClick?: () => void;
  onVideoRef?: (element: HTMLVideoElement | null) => void;
  triggerHaptic?: (type?: 'light' | 'medium' | 'heavy') => void;
  autoPlay?: boolean;
}

export const VideoCard = ({
  id,
  videoUrl,
  thumbnailUrl,
  user,
  caption,
  hashtags,
  audioTitle,
  stats,
  isLiked = false,
  onLike,
  onComment,
  onShare,
  onRevine,
  onFollow,
  onUserClick,
  onVideoRef,
  triggerHaptic,
  autoPlay = true
}: VideoCardProps) => {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(isLiked);
  const [isRevined, setIsRevined] = useState(false);
  const [isFollowing, setIsFollowing] = useState(user.isFollowing || false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [likeCount, setLikeCount] = useState(stats.likes);
  const [revineCount, setRevineCount] = useState(stats.revines || 0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastTap = useRef<number>(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Register video ref with parent
    if (onVideoRef) {
      onVideoRef(video);
    }

    const updateProgress = () => {
      const currentTime = video.currentTime;
      const duration = video.duration;
      if (duration > 0) {
        // Reset progress every 6 seconds for loop effect
        const loopTime = currentTime % 6;
        setProgress((loopTime / 6) * 100);
      }
    };

    const handleEnded = () => {
      video.currentTime = 0;
      setProgress(0);
      video.play();
    };

    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', updateProgress);
      video.removeEventListener('ended', handleEnded);
      // Cleanup video ref
      if (onVideoRef) {
        onVideoRef(null);
      }
    };
  }, [onVideoRef]);

  // Double-tap to like functionality
  const handleVideoTap = useCallback(() => {
    const now = Date.now();
    const timeDiff = now - lastTap.current;
    
    if (timeDiff < 300 && timeDiff > 0) {
      // Double tap detected
      handleLike();
      triggerHaptic?.('medium');
    } else {
      // Single tap - toggle play/pause
      setTimeout(() => {
        if (Date.now() - lastTap.current >= 300) {
          handleVideoClick();
        }
      }, 300);
    }
    
    lastTap.current = now;
  }, []);

  // Long press for quick actions
  const handleTouchStart = useCallback(() => {
    longPressTimeout.current = setTimeout(() => {
      setShowQuickActions(true);
      triggerHaptic?.('heavy');
    }, 500);
  }, [triggerHaptic]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
  }, []);

  const handleLike = useCallback(() => {
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
    triggerHaptic?.('light');
    onLike?.();
  }, [liked, triggerHaptic, onLike]);

  const handleRevine = useCallback(() => {
    setIsRevined(!isRevined);
    setRevineCount(prev => isRevined ? prev - 1 : prev + 1);
    triggerHaptic?.('medium');
    onRevine?.();
  }, [isRevined, triggerHaptic, onRevine]);

  const handleFollow = useCallback(() => {
    setIsFollowing(!isFollowing);
    triggerHaptic?.('light');
    onFollow?.();
  }, [isFollowing, triggerHaptic, onFollow]);

  const handleVideoClick = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Video */}
      <video
        ref={videoRef}
        src={videoUrl}
        poster={thumbnailUrl}
        className="w-full h-full object-cover cursor-pointer"
        onClick={handleVideoTap}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        loop
        muted
        autoPlay={autoPlay}
        playsInline
      />

      {/* Play Overlay */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={handleVideoClick}
            className="w-16 h-16 rounded-full glass-surface flex items-center justify-center"
          >
            <Play size={24} className="text-white ml-1" />
          </button>
        </div>
      )}

      {/* Progress Ring */}
      <div className="absolute top-4 right-4">
        <svg className="w-8 h-8 progress-ring" viewBox="0 0 32 32">
          <circle
            cx="16"
            cy="16"
            r="14"
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="2"
          />
          <circle
            cx="16"
            cy="16"
            r="14"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            strokeDasharray={`${progress * 0.88} 88`}
            className="progress-ring"
          />
        </svg>
      </div>

      {/* Quick Actions Menu */}
      {showQuickActions && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background/90 backdrop-blur-md rounded-2xl p-6 flex flex-col gap-4 min-w-[200px]">
            <button 
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/10 transition-colors"
              onClick={() => setShowQuickActions(false)}
            >
              <Bookmark size={20} />
              <span>Save Video</span>
            </button>
            <button 
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/10 transition-colors"
              onClick={() => setShowQuickActions(false)}
            >
              <Share size={20} />
              <span>Copy Link</span>
            </button>
            <button 
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/10 text-destructive"
              onClick={() => setShowQuickActions(false)}
            >
              <MoreHorizontal size={20} />
              <span>Report</span>
            </button>
            <button 
              className="mt-2 px-4 py-2 bg-secondary rounded-xl"
              onClick={() => setShowQuickActions(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Top Overlay - User Info */}
      <div className="absolute top-0 left-0 right-0 p-4 video-overlay-top">
        <div className="flex items-center justify-between">
          <button
            onClick={onUserClick}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-muted overflow-hidden border-2 border-white/20">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/50 to-primary flex items-center justify-center">
                  <span className="text-white font-medium">{user.displayName[0]}</span>
                </div>
              )}
            </div>
            <div className="text-left">
              <p className="text-white font-medium">{user.displayName}</p>
              <p className="text-white/70 text-sm">@{user.username}</p>
            </div>
          </button>

          <button
            onClick={handleFollow}
            className={cn(
              "text-sm px-4 py-2 rounded-xl font-medium transition-all duration-200 min-w-[80px]",
              isFollowing 
                ? "btn-secondary" 
                : "btn-primary"
            )}
          >
            {isFollowing ? "Following" : "Follow"}
          </button>
        </div>
      </div>

      {/* Bottom Overlay - Caption & Actions */}
      <div className="absolute bottom-0 left-0 right-0 p-4 video-overlay-bottom">
        <div className="flex items-end justify-between gap-4">
          {/* Caption & Audio */}
          <div className="flex-1 text-white">
            <p className="text-base mb-2 leading-relaxed">
              {caption}
            </p>
            
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {hashtags.map((tag, index) => (
                  <span key={index} className="text-primary text-sm font-medium">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {audioTitle && (
              <div className="flex items-center gap-2 text-sm text-white/80">
                <div className="w-4 h-4 bg-primary rounded flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <span>{audioTitle}</span>
              </div>
            )}
          </div>

          {/* Action Rail */}
          <div className="flex flex-col items-center gap-4">
            {/* Like */}
            <button
              onClick={handleLike}
              className="flex flex-col items-center gap-1 group"
            >
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 min-h-[48px] min-w-[48px]",
                liked 
                  ? "bg-red-500 text-white scale-110" 
                  : "icon-button active:scale-95"
              )}>
                <Heart 
                  size={24} 
                  className={cn(
                    "transition-all duration-200",
                    liked && "fill-current animate-like"
                  )}
                />
              </div>
              <span className="text-white text-xs font-medium">{formatCount(likeCount)}</span>
            </button>

            {/* Comment */}
            <button
              onClick={onComment}
              className="flex flex-col items-center gap-1"
            >
              <div className="icon-button active:scale-95 min-h-[48px] min-w-[48px]">
                <MessageCircle size={24} className="text-white" />
              </div>
              <span className="text-white text-xs font-medium">{formatCount(stats.comments)}</span>
            </button>

            {/* Revine */}
            <button
              onClick={handleRevine}
              className="flex flex-col items-center gap-1"
            >
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 min-h-[48px] min-w-[48px]",
                isRevined 
                  ? "bg-green-500 text-white scale-110" 
                  : "icon-button active:scale-95"
              )}>
                <Repeat2 
                  size={24} 
                  className={cn(
                    "transition-all duration-200",
                    isRevined && "animate-spin"
                  )}
                />
              </div>
              <span className="text-white text-xs font-medium">{formatCount(revineCount)}</span>
            </button>

            {/* Share */}
            <button
              onClick={onShare}
              className="flex flex-col items-center gap-1"
            >
              <div className="icon-button active:scale-95 min-h-[48px] min-w-[48px]">
                <Share size={24} className="text-white" />
              </div>
              <span className="text-white text-xs font-medium">{formatCount(stats.shares)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};