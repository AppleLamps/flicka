import { useState, useEffect, useRef } from "react";
import { X, Share, MoreHorizontal, Heart, Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

interface VideoDetailSheetProps {
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
  isLoadingComments?: boolean;
  onShare?: () => void;
  onCommentSubmit?: (text: string) => void;
  onCommentLike?: (commentId: string) => void;
}

export const VideoDetailSheet = ({
  isOpen,
  onClose,
  video,
  comments,
  isLoadingComments = false,
  onShare,
  onCommentSubmit,
  onCommentLike
}: VideoDetailSheetProps) => {
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Add haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } else {
      document.body.style.overflow = 'unset';
      setDragOffset(0);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsSubmitting(true);
    try {
      await onCommentSubmit?.(commentText);
      setCommentText("");
      // Add haptic feedback for success
      if ('vibrate' in navigator) {
        navigator.vibrate([10, 50, 10]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setDragStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartY === null) return;
    
    const currentY = e.touches[0].clientY;
    const offset = Math.max(0, currentY - dragStartY);
    setDragOffset(offset);
  };

  const handleTouchEnd = () => {
    if (dragOffset > 100) {
      onClose();
    } else {
      setDragOffset(0);
    }
    setDragStartY(null);
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
    <>
      {/* Backdrop - keeps video playing */}
      <div 
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl overflow-hidden animate-slide-in-right"
        style={{
          height: '70vh',
          transform: `translateY(${dragOffset}px)`,
          transition: dragStartY ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        <div className="flex justify-center py-3 border-b border-border/20">
          <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/20">
          <div>
            <h3 className="text-lg font-semibold">
              {video.stats.comments} {video.stats.comments === 1 ? 'Comment' : 'Comments'}
            </h3>
            <p className="text-sm text-muted-foreground">@{video.user.username}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={onShare} className="icon-button">
              <Share size={20} />
            </button>
            <button className="icon-button">
              <MoreHorizontal size={20} />
            </button>
            <button onClick={onClose} className="icon-button">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isLoadingComments ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
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
                        onClick={() => {
                          onCommentLike?.(comment.id);
                          // Add haptic feedback
                          if ('vibrate' in navigator) {
                            navigator.vibrate(10);
                          }
                        }}
                        className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
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
        <div className="p-4 border-t border-border/20 bg-background">
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
                disabled={isSubmitting}
              />
            </div>
            
            <button
              type="submit"
              disabled={!commentText.trim() || isSubmitting}
              className="icon-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};
