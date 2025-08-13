import { useState, useRef, useEffect } from "react";
import { Heart, MessageCircle, Share, Plus, Play } from "lucide-react";

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
  };
  isLiked?: boolean;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onFollow?: () => void;
  onUserClick?: () => void;
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
  onFollow,
  onUserClick,
  autoPlay = true
}: VideoCardProps) => {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(isLiked);
  const [likeCount, setLikeCount] = useState(stats.likes);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = () => {
      const progress = (video.currentTime / video.duration) * 100;
      setProgress(progress);
    };

    video.addEventListener('timeupdate', updateProgress);
    return () => video.removeEventListener('timeupdate', updateProgress);
  }, []);

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
    onLike?.();
  };

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
        onClick={handleVideoClick}
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

          {!user.isFollowing && (
            <button
              onClick={onFollow}
              className="btn-primary text-sm px-4 py-2"
            >
              Follow
            </button>
          )}
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
              <div className={`icon-button ${liked ? 'bg-red-500' : ''} transition-colors`}>
                <Heart 
                  size={24} 
                  className={`${liked ? 'text-white fill-white animate-like' : 'text-white'}`} 
                />
              </div>
              <span className="text-white text-xs font-medium">{formatCount(likeCount)}</span>
            </button>

            {/* Comment */}
            <button
              onClick={onComment}
              className="flex flex-col items-center gap-1"
            >
              <div className="icon-button">
                <MessageCircle size={24} className="text-white" />
              </div>
              <span className="text-white text-xs font-medium">{formatCount(stats.comments)}</span>
            </button>

            {/* Share */}
            <button
              onClick={onShare}
              className="flex flex-col items-center gap-1"
            >
              <div className="icon-button">
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