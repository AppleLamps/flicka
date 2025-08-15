import { useState, useRef, useEffect, useCallback, memo } from "react";
import { Heart, MessageCircle, Share, Play, Repeat2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface OptimizedVideoCardProps {
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
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onRevine?: () => void;
  onFollow?: () => void;
  onUserClick?: () => void;
  triggerHaptic?: (type?: 'light' | 'medium' | 'heavy') => void;
  autoPlay?: boolean;
  isMuted?: boolean;
  onToggleMute?: () => void;
  isVisible?: boolean;
}

const OptimizedVideoCardBase = ({
  id,
  videoUrl,
  thumbnailUrl,
  user,
  caption,
  hashtags,
  audioTitle,
  stats,
  isLiked = false,
  isFollowing = false,
  onLike,
  onComment,
  onShare,
  onRevine,
  onFollow,
  onUserClick,
  triggerHaptic,
  autoPlay = false,
  isMuted = true,
  onToggleMute,
  isVisible = false
}: OptimizedVideoCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [liked, setLiked] = useState(isLiked);
  const [following, setFollowing] = useState(isFollowing);
  const [likeCount, setLikeCount] = useState(stats.likes);
  const [revined, setRevined] = useState(false);
  const [revineCount, setRevineCount] = useState(stats.revines || 0);
  const [loadError, setLoadError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Simple video control - only when visible
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isVisible && autoPlay) {
      video.play().catch(() => setLoadError(true));
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [isVisible, autoPlay]);

  // Optimized event handlers
  const handleLike = useCallback(() => {
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
    triggerHaptic?.('light');
    onLike?.();
    
    // Add visual animation class
    const buttonElement = document.querySelector(`[data-video-id="${id}"] .like-button`);
    if (buttonElement) {
      buttonElement.classList.add('animate-like');
      setTimeout(() => buttonElement.classList.remove('animate-like'), 600);
    }
  }, [liked, triggerHaptic, onLike, id]);

  const handleRevine = useCallback(() => {
    setRevined(!revined);
    setRevineCount(prev => revined ? prev - 1 : prev + 1);
    triggerHaptic?.('medium');
    onRevine?.();
    
    // Add visual animation class
    const buttonElement = document.querySelector(`[data-video-id="${id}"] .revine-button`);
    if (buttonElement) {
      buttonElement.classList.add('animate-revine');
      setTimeout(() => buttonElement.classList.remove('animate-revine'), 800);
    }
  }, [revined, triggerHaptic, onRevine, id]);

  const handleFollow = useCallback(() => {
    setFollowing(!following);
    triggerHaptic?.('light');
    onFollow?.();
    
    // Add visual animation class
    const buttonElement = document.querySelector(`[data-video-id="${id}"] .follow-button`);
    if (buttonElement) {
      buttonElement.classList.add('animate-follow');
      setTimeout(() => buttonElement.classList.remove('animate-follow'), 400);
    }
  }, [following, triggerHaptic, onFollow, id]);

  const handleVideoClick = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => setLoadError(true));
      setIsPlaying(true);
      // Allow sound on user interaction
      if (isMuted) onToggleMute?.();
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [isMuted, onToggleMute]);

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div 
      className="relative w-full h-screen bg-black overflow-hidden snap-start feed-item"
      data-video-id={id}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={videoUrl}
        poster={thumbnailUrl}
        className="w-full h-full object-cover cursor-pointer"
        onClick={handleVideoClick}
        loop
        muted={isMuted}
        playsInline
        preload="metadata"
        onError={() => setLoadError(true)}
      />

      {/* Play Overlay */}
      {(!isPlaying || loadError) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <button
            onClick={handleVideoClick}
            className="w-16 h-16 rounded-full glass-surface flex items-center justify-center hover:scale-110 transition-transform"
            aria-label="Play video"
          >
            <Play size={24} className="text-white ml-1" />
          </button>
        </div>
      )}

      {/* Error State */}
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <span className="text-white text-sm">Video unavailable</span>
        </div>
      )}

      {/* Top Overlay - User Info */}
      <div className="absolute top-0 left-0 right-0 p-4 video-overlay-top">
        <div className="flex items-center justify-between">
          <button
            onClick={onUserClick}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 rounded-full bg-muted overflow-hidden border-2 border-white/20">
              {user.avatarUrl ? (
                <img 
                  src={user.avatarUrl} 
                  alt={user.displayName} 
                  className="w-full h-full object-cover" 
                  loading="lazy"
                />
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
                "text-sm px-4 py-2 rounded-xl font-medium transition-all duration-200 min-w-[80px] follow-button",
                "hover:scale-105 active:scale-95",
                following 
                  ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" 
                  : "bg-primary text-primary-foreground hover:shadow-glow"
              )}
            >
              {following ? "Following" : "Follow"}
            </button>
        </div>
      </div>

      {/* Bottom Overlay - Caption & Actions */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pt-4 pb-40 video-overlay-bottom">
        <div className="flex items-end justify-between gap-4">
          {/* Caption */}
          <div className="flex-1 text-white">
            <p className="text-base mb-2 leading-relaxed">{caption}</p>
            
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {hashtags.slice(0, 3).map((tag, index) => (
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
                <span className="truncate">{audioTitle}</span>
              </div>
            )}
          </div>

          {/* Action Rail - Positioned higher to avoid bottom nav */}
          <div className="flex flex-col items-center gap-4 mb-4">
            {/* Like */}
            <button
              onClick={handleLike}
              className="flex flex-col items-center gap-1 group like-button"
              aria-label={liked ? 'Unlike' : 'Like'}
            >
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200",
                "hover:scale-110 active:scale-95 will-change-transform",
                liked 
                  ? "bg-red-500 text-white shadow-lg shadow-red-500/25" 
                  : "bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm"
              )}>
                <Heart 
                  size={24} 
                  className={cn(
                    "transition-all duration-200",
                    liked && "fill-current"
                  )}
                />
              </div>
              <span className="text-white text-xs font-medium transition-all duration-200">
                {formatCount(likeCount)}
              </span>
            </button>

            {/* Comment */}
            <button
              onClick={onComment}
              className="flex flex-col items-center gap-1"
              aria-label="Open comments"
            >
              <div className="bg-black/30 text-white hover:bg-black/50 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 backdrop-blur-sm will-change-transform">
                <MessageCircle size={24} />
              </div>
              <span className="text-white text-xs font-medium transition-all duration-200">
                {formatCount(stats.comments)}
              </span>
            </button>

            {/* Revine */}
            <button
              onClick={handleRevine}
              className="flex flex-col items-center gap-1 revine-button"
              aria-label={revined ? 'Undo repost' : 'Repost'}
            >
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200",
                "hover:scale-110 active:scale-95 will-change-transform",
                revined 
                  ? "bg-green-500 text-white shadow-lg shadow-green-500/25" 
                  : "bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm"
              )}>
                <Repeat2 size={24} />
              </div>
              <span className="text-white text-xs font-medium transition-all duration-200">
                {formatCount(revineCount)}
              </span>
            </button>

            {/* Share */}
            <button
              onClick={onShare}
              className="flex flex-col items-center gap-1"
              aria-label="Share video"
            >
              <div className="bg-black/30 text-white hover:bg-black/50 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 backdrop-blur-sm will-change-transform">
                <Share size={24} />
              </div>
              <span className="text-white text-xs font-medium transition-all duration-200">
                {formatCount(stats.shares)}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const OptimizedVideoCard = memo(OptimizedVideoCardBase);
