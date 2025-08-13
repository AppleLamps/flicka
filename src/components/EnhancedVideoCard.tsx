import { useState, useRef, useEffect, useCallback, memo } from "react";
import { Heart, MessageCircle, Share, Plus, Play, Repeat2, Bookmark, MoreHorizontal, Loader2, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFollowState } from "@/hooks/useFollowState";
import { Button } from "@/components/ui/button";

interface VideoCardProps {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    isVerified?: boolean;
    isPrivate?: boolean;
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
  onUserClick?: () => void;
  onVideoRef?: (element: HTMLVideoElement | null) => void;
  triggerHaptic?: (type?: 'light' | 'medium' | 'heavy') => void;
  autoPlay?: boolean;
  isBuffering?: boolean;
  onVisibilityChange?: (isVisible: boolean) => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onSave?: () => Promise<boolean> | boolean;
}

const EnhancedVideoCardBase = ({
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
  onUserClick,
  onVideoRef,
  triggerHaptic,
  autoPlay = true,
  isBuffering = false,
  onVisibilityChange,
  isMuted = true,
  onToggleMute
  , onSave
}: VideoCardProps) => {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(isLiked);
  const [isRevined, setIsRevined] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [likeCount, setLikeCount] = useState(stats.likes);
  const [revineCount, setRevineCount] = useState(stats.revines || 0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isBufferingLocal, setIsBufferingLocal] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showSavePulse, setShowSavePulse] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const intersectionRef = useRef<HTMLDivElement>(null);
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastTap = useRef<number>(0);
  const rVfcId = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);
  const hlsRef = useRef<any | null>(null);

  // Enhanced follow state management
  const { 
    getFollowState, 
    handleFollow, 
    getFollowButtonText, 
    getFollowButtonVariant 
  } = useFollowState();

  const followState = getFollowState(user.id);

  // Intersection Observer for visibility tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isVisible = entry.isIntersecting && entry.intersectionRatio > 0.7;
          onVisibilityChange?.(isVisible);
        });
      },
      { threshold: [0.7] }
    );

    if (intersectionRef.current) {
      observer.observe(intersectionRef.current);
    }

    return () => observer.disconnect();
  }, [onVisibilityChange]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Register video ref with parent
    onVideoRef?.(video);

    const compute = () => {
      const t = video.currentTime;
      const d = video.duration || 0;
      if (d > 0) {
        const loopTime = t % 6;
        setProgress((loopTime / 6) * 100);
      }
    };

    const stepRvfc = () => {
      const v = video as any;
      if (typeof v.requestVideoFrameCallback === 'function') {
        rVfcId.current = v.requestVideoFrameCallback(() => {
          compute();
          stepRvfc();
        });
      }
    };

    const stepRaf = () => {
      compute();
      rafId.current = requestAnimationFrame(stepRaf);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setIsBufferingLocal(false);
      setHasError(false);
      const v = video as any;
      if (typeof v.requestVideoFrameCallback === 'function') {
        stepRvfc();
      } else {
        stepRaf();
      }
    };
    const handlePause = () => {
      setIsPlaying(false);
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      const v = video as any;
      if (rVfcId.current !== null && typeof v.cancelVideoFrameCallback === 'function') {
        v.cancelVideoFrameCallback(rVfcId.current);
        rVfcId.current = null;
      }
    };
    const handleWaiting = () => setIsBufferingLocal(true);
    const handleStalled = () => setIsBufferingLocal(true);
    const handleSeeking = () => setIsBufferingLocal(true);
    const handleCanPlay = () => setIsBufferingLocal(false);
    const handleCanPlayThrough = () => setIsBufferingLocal(false);
    const handleError = () => {
      setIsBufferingLocal(false);
      setHasError(true);
      setIsPlaying(false);
    };

    video.addEventListener('timeupdate', () => {});
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('stalled', handleStalled);
    video.addEventListener('seeking', handleSeeking);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('canplaythrough', handleCanPlayThrough);
    video.addEventListener('error', handleError);

    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      const v = video as any;
      if (rVfcId.current !== null && typeof v.cancelVideoFrameCallback === 'function') {
        v.cancelVideoFrameCallback(rVfcId.current);
        rVfcId.current = null;
      }
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('stalled', handleStalled);
      video.removeEventListener('seeking', handleSeeking);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
      video.removeEventListener('error', handleError);
      onVideoRef?.(null);
    };
  }, [onVideoRef]);

  // HLS setup for .m3u8 URLs (adaptive bitrate streaming)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const isHls = typeof videoUrl === 'string' && videoUrl.includes('.m3u8');
    if (!isHls) return;

    let destroyed = false;

    const setup = async () => {
      // Native HLS support (Safari/iOS)
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        try {
          video.src = videoUrl;
          video.load();
        } catch {}
        return;
      }

      try {
        const mod = await import('hls.js');
        const Hls = (mod as any).default || mod;
        if (Hls && Hls.isSupported && Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
          hlsRef.current = hls;
          hls.attachMedia(video);
          hls.loadSource(videoUrl);
          hls.on(Hls.Events.ERROR, (_evt: any, data: any) => {
            if (data?.fatal) {
              setHasError(true);
              try { hls.destroy(); } catch {}
              hlsRef.current = null;
            }
          });
        } else {
          video.src = videoUrl;
          video.load();
        }
      } catch {
        try {
          video.src = videoUrl;
          video.load();
        } catch {}
      }
    };

    setup();

    return () => {
      if (destroyed) return;
      destroyed = true;
      if (hlsRef.current) {
        try { hlsRef.current.destroy(); } catch {}
        hlsRef.current = null;
      }
    };
  }, [videoUrl]);

  // Enhanced interaction handlers
  const handleVideoTap = useCallback(() => {
    const now = Date.now();
    const timeDiff = now - lastTap.current;
    
    if (timeDiff < 300 && timeDiff > 0) {
      handleLike();
      triggerHaptic?.('medium');
    } else {
      setTimeout(() => {
        if (Date.now() - lastTap.current >= 300) {
          handleVideoClick();
          // explicit user gesture -> allow audio by unmuting
          if (isMuted) {
            onToggleMute?.();
          }
        }
      }, 300);
    }
    
    lastTap.current = now;
  }, [isMuted, onToggleMute]);

  const handleLongPress = useCallback(() => {
    longPressTimeout.current = setTimeout(async () => {
      let next = !isSaved;
      if (onSave) {
        try {
          const result = await onSave();
          if (typeof result === 'boolean') next = result;
        } catch {}
      }
      setIsSaved(next);
      setShowSavePulse(true);
      triggerHaptic?.('heavy');
      setTimeout(() => setShowSavePulse(false), 800);
    }, 500);
  }, [isSaved, onSave, triggerHaptic]);

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

  const handleFollowClick = useCallback(() => {
    handleFollow(user.id, user.isPrivate);
    triggerHaptic?.('light');
  }, [handleFollow, user.id, user.isPrivate, triggerHaptic]);

  const handleVideoClick = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const handleRetry = () => {
    const v = videoRef.current;
    if (!v) return;
    setHasError(false);
    setIsBufferingLocal(true);
    const src = v.currentSrc || v.src;
    if (src) v.src = src;
    v.load();
    v.play().catch(() => {});
  };

  return (
    <div ref={intersectionRef} className="relative w-full h-screen bg-black overflow-hidden snap-start">
      {/* Progressive Image Loading */}
      {thumbnailUrl && !imageLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-muted animate-pulse" />
      )}
      
      {/* Video with buffering/error indicators */}
      <div className="relative w-full h-full">
        <video
          ref={videoRef}
          src={typeof videoUrl === 'string' && videoUrl.includes('.m3u8') ? undefined : videoUrl}
          poster={thumbnailUrl}
          className="w-full h-full object-cover cursor-pointer"
          onClick={handleVideoTap}
          onTouchStart={handleLongPress}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleLongPress}
          onMouseUp={handleTouchEnd}
          onLoadedData={() => setImageLoaded(true)}
          loop
          muted={isMuted}
          autoPlay={autoPlay}
          playsInline
          preload="metadata"
        />
        
        {/* Buffering Indicator */}
        {(isBuffering || isBufferingLocal) && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
              <span className="text-white text-sm">Loading...</span>
            </div>
          </div>
        )}

        {/* Error Overlay with Retry */}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="flex flex-col items-center gap-3">
              <span className="text-white text-sm">Couldn’t load the video</span>
              <Button size="sm" variant="secondary" onClick={handleRetry}>
                Retry
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Play Overlay */}
      {!isPlaying && !(isBuffering || isBufferingLocal) && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={handleVideoClick}
            aria-label="Play video"
            title="Play video"
            className="w-16 h-16 rounded-full glass-surface flex items-center justify-center hover:scale-110 transition-transform"
          >
            <Play size={24} className="text-white ml-1" />
          </button>
        </div>
      )}

      {/* Enhanced Progress Ring with seeking */}
      <div
        className="absolute top-4 right-4"
        onClick={(e) => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const dx = e.clientX - cx;
          const dy = e.clientY - cy;
          let angle = Math.atan2(dy, dx);
          if (angle < 0) angle += Math.PI * 2;
          const ratio = angle / (Math.PI * 2);
          const v = videoRef.current;
          if (v) {
            const loopBase = Math.floor((v.currentTime || 0) / 6) * 6;
            const newTime = loopBase + Math.max(0, Math.min(1, ratio)) * 6;
            if (Number.isFinite(newTime)) {
              v.currentTime = Math.min(v.duration || newTime, newTime);
            }
          }
          e.stopPropagation();
        }}
        onTouchStart={(e) => {
          if (e.touches.length === 0) return;
          const t = e.touches[0];
          const target = e.currentTarget as HTMLDivElement;
          const rect = target.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const dx = t.clientX - cx;
          const dy = t.clientY - cy;
          let angle = Math.atan2(dy, dx);
          if (angle < 0) angle += Math.PI * 2;
          const ratio = angle / (Math.PI * 2);
          const v = videoRef.current;
          if (v) {
            const loopBase = Math.floor((v.currentTime || 0) / 6) * 6;
            const newTime = loopBase + Math.max(0, Math.min(1, ratio)) * 6;
            if (Number.isFinite(newTime)) {
              v.currentTime = Math.min(v.duration || newTime, newTime);
            }
          }
          e.stopPropagation();
          e.preventDefault();
        }}
        title="Seek"
        aria-label="Seek"
        role="button"
      >
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
            className="progress-ring transition-all duration-100"
          />
        </svg>
      </div>
      {/* Long-press Save pulse */}
      {showSavePulse && (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="w-20 h-20 rounded-full glass-surface flex items-center justify-center animate-like">
            <Bookmark size={28} className={cn("", isSaved ? "text-white" : "text-white/70")} />
          </div>
        </div>
      )}

      {/* Mute/Unmute control */}
      <div className="absolute top-4 left-4">
        <button
          aria-label={isMuted ? 'Unmute' : 'Mute'}
          onClick={onToggleMute}
          className="w-10 h-10 rounded-full glass-surface flex items-center justify-center hover:scale-105 transition-transform"
        >
          {isMuted ? (
            <VolumeX size={18} className="text-white" />
          ) : (
            <Volume2 size={18} className="text-white" />
          )}
        </button>
      </div>

      {/* Quick Actions Modal */}
      {showQuickActions && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-background/90 backdrop-blur-md rounded-2xl p-6 flex flex-col gap-4 min-w-[200px] animate-scale-in">
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
            <Button 
              variant="secondary"
              onClick={() => setShowQuickActions(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Top Overlay - Enhanced User Info */}
      <div className="absolute top-0 left-0 right-0 p-4 video-overlay-top pointer-events-none">
        <div className="flex items-center justify-between">
          <button
            onClick={onUserClick}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity pointer-events-auto"
          >
            <div className="w-10 h-10 rounded-full bg-muted overflow-hidden border-2 border-white/20">
              {user.avatarUrl ? (
                <img 
                  src={user.avatarUrl} 
                  alt={user.displayName} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/50 to-primary flex items-center justify-center">
                  <span className="text-white font-medium">{user.displayName[0]}</span>
                </div>
              )}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1">
                <p className="text-white font-medium">{user.displayName}</p>
                {user.isVerified && (
                  <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </div>
              <p className="text-white/70 text-sm">@{user.username}</p>
            </div>
          </button>

          {/* Enhanced Follow Button */}
          <Button
            onClick={handleFollowClick}
            variant={getFollowButtonVariant(user.id)}
            size="sm"
            disabled={followState.isLoading}
            className="min-w-[80px] transition-all duration-200 pointer-events-auto"
          >
            {followState.isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              getFollowButtonText(user.id)
            )}
          </Button>
        </div>
      </div>

      {/* Bottom Overlay - Caption & Enhanced Actions */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pt-4 pb-[var(--overlay-bottom-padding)] md:pb-6 video-overlay-bottom pointer-events-none">
        <div className="flex items-end justify-between gap-4">
          <div className="flex-1 text-white">
            <p className="text-base mb-2 leading-relaxed">{caption}</p>
            
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
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                </div>
                <span>{audioTitle}</span>
              </div>
            )}
          </div>

          {/* Enhanced Action Rail */}
          <div className="flex flex-col items-center gap-4">
            {/* Like with enhanced animation */}
            <button
              onClick={handleLike}
              className="flex flex-col items-center gap-1 group pointer-events-auto"
              aria-label={liked ? 'Unlike' : 'Like'}
            >
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 min-h-[48px] min-w-[48px]",
                liked 
                  ? "bg-red-500 text-white scale-110 shadow-lg shadow-red-500/30" 
                  : "icon-button active:scale-95 hover:scale-105"
              )}>
                <Heart 
                  size={24} 
                  className={cn(
                    "transition-all duration-300",
                    liked && "fill-current animate-like"
                  )}
                />
              </div>
              <span className="text-white text-xs font-medium">{formatCount(likeCount)}</span>
            </button>

            {/* Comment */}
            <button
              onClick={onComment}
              className="flex flex-col items-center gap-1 group pointer-events-auto"
              aria-label="Open comments"
            >
              <div className="icon-button active:scale-95 hover:scale-105 min-h-[48px] min-w-[48px] transition-transform">
                <MessageCircle size={24} className="text-white" />
              </div>
              <span className="text-white text-xs font-medium">{formatCount(stats.comments)}</span>
            </button>

            {/* Revine with enhanced animation */}
            <button
              onClick={handleRevine}
              className="flex flex-col items-center gap-1 group pointer-events-auto"
              aria-label={isRevined ? 'Undo repost' : 'Repost'}
            >
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 min-h-[48px] min-w-[48px]",
                isRevined 
                  ? "bg-green-500 text-white scale-110 shadow-lg shadow-green-500/30" 
                  : "icon-button active:scale-95 hover:scale-105"
              )}>
                <Repeat2 
                  size={24} 
                  className={cn(
                    "transition-all duration-300",
                    isRevined && "animate-spin"
                  )}
                />
              </div>
              <span className="text-white text-xs font-medium">{formatCount(revineCount)}</span>
            </button>

            {/* Share */}
            <button
              onClick={onShare}
              className="flex flex-col items-center gap-1 group pointer-events-auto"
              aria-label="Share video"
            >
              <div className="icon-button active:scale-95 hover:scale-105 min-h-[48px] min-w-[48px] transition-transform">
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

export const EnhancedVideoCard = memo(EnhancedVideoCardBase);