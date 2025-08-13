import { useState, useEffect } from "react";
import { X, Share, MoreHorizontal, Heart, Send } from "lucide-react";

interface Comment {
  id: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  text: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
  replies?: Comment[];
}

interface VideoDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: {
    id: string;
    videoUrl: string;
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
    };
  };
  comments: Comment[];
  onShare?: () => void;
  onCommentSubmit?: (text: string) => void;
  onCommentLike?: (commentId: string) => void;
}

export const VideoDetailModal = ({
  isOpen,
  onClose,
  video,
  comments,
  onShare,
  onCommentSubmit,
  onCommentLike
}: VideoDetailModalProps) => {
  const [commentText, setCommentText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowComments(false);
      // Delay showing comments for smooth animation
      setTimeout(() => setShowComments(true), 200);
    }
  }, [isOpen]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsLoading(true);
    try {
      await onCommentSubmit?.(commentText);
      setCommentText("");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return 'now';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Video Section */}
      <div className="relative w-full h-2/3">
        <video
          src={video.videoUrl}
          className="w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
        />

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="icon-button"
              aria-label="Close video"
              title="Close"
            >
              <X size={24} className="text-white" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onShare}
                className="icon-button"
                aria-label="Share"
                title="Share"
              >
                <Share size={24} className="text-white" />
              </button>
              
              <button className="icon-button" aria-label="More options" title="More options">
                <MoreHorizontal size={24} className="text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Video Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-muted overflow-hidden border-2 border-white/20">
              {video.user.avatarUrl ? (
                <img src={video.user.avatarUrl} alt={video.user.displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/50 to-primary flex items-center justify-center">
                  <span className="text-white font-medium">{video.user.displayName[0]}</span>
                </div>
              )}
            </div>
            <div>
              <p className="text-white font-medium">{video.user.displayName}</p>
              <p className="text-white/70 text-sm">@{video.user.username}</p>
            </div>
          </div>

          <p className="text-white text-base mb-2">{video.caption}</p>
          
          {video.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {video.hashtags.map((tag, index) => (
                <span key={index} className="text-primary text-sm font-medium">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Comments Section */}
      <div className="flex-1 bg-background">
        {/* Comments Header */}
        <div className="p-4 border-b border-border/20">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {video.stats.comments} {video.stats.comments === 1 ? 'Comment' : 'Comments'}
            </h3>
            <button
              onClick={() => setShowComments(!showComments)}
              className="btn-ghost text-sm"
            >
              {showComments ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {comments.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Heart size={24} className="text-muted-foreground" />
              </div>
              <h4 className="text-lg font-medium mb-2">No comments yet</h4>
              <p className="text-muted-foreground text-sm">Be the first to comment on this loop</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex-shrink-0">
                    {comment.user.avatarUrl ? (
                      <img src={comment.user.avatarUrl} alt={comment.user.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/50 to-primary flex items-center justify-center">
                        <span className="text-white text-xs font-medium">{comment.user.displayName[0]}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{comment.user.displayName}</span>
                      <span className="text-muted-foreground text-xs">@{comment.user.username}</span>
                      <span className="text-muted-foreground text-xs">·</span>
                      <span className="text-muted-foreground text-xs">{formatTimeAgo(comment.timestamp)}</span>
                    </div>
                    
                    <p className="text-foreground text-sm mb-2">{comment.text}</p>
                    
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => onCommentLike?.(comment.id)}
                        className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                        aria-label={comment.isLiked ? 'Unlike comment' : 'Like comment'}
                        title={comment.isLiked ? 'Unlike' : 'Like'}
                      >
                        <Heart size={14} className={comment.isLiked ? "fill-current text-red-500" : ""} />
                        <span className="text-xs">{comment.likes}</span>
                      </button>
                      
                      <button className="text-muted-foreground hover:text-primary transition-colors text-xs">
                        Reply
                      </button>
                    </div>

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="mt-3 space-y-3 border-l-2 border-border/20 pl-4">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="flex gap-2">
                            <div className="w-6 h-6 rounded-full bg-muted overflow-hidden flex-shrink-0">
                              {reply.user.avatarUrl ? (
                                <img src={reply.user.avatarUrl} alt={reply.user.displayName} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-primary/50 to-primary flex items-center justify-center">
                                  <span className="text-white text-xs font-medium">{reply.user.displayName[0]}</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-xs">{reply.user.displayName}</span>
                                <span className="text-muted-foreground text-xs">{formatTimeAgo(reply.timestamp)}</span>
                              </div>
                              <p className="text-foreground text-xs">{reply.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comment Input */}
        <div className="p-4 border-t border-border/20">
          <form onSubmit={handleCommentSubmit} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex-shrink-0">
              <div className="w-full h-full bg-gradient-to-br from-primary/50 to-primary flex items-center justify-center">
                <span className="text-white text-xs font-medium">Y</span>
              </div>
            </div>
            
            <div className="flex-1 relative">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="w-full bg-muted/50 text-foreground placeholder-muted-foreground px-4 py-2 rounded-full border border-transparent focus:border-primary focus:outline-none transition-colors"
                disabled={isLoading}
              />
            </div>
            
            <button
              type="submit"
              disabled={!commentText.trim() || isLoading}
              className="icon-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Post comment"
              title="Post comment"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};