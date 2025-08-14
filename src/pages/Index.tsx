import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { TopAppBar } from "@/components/TopAppBar";
import { VideoFeed } from "@/components/VideoFeed";
import { BottomNavigation } from "@/components/BottomNavigation";
import { CaptureScreen } from "@/components/CaptureScreen";
import { VideoDetailSheet } from "@/components/VideoDetailSheet";
import { usePaginatedVideos } from '../hooks/usePaginatedVideos';
import { useComments } from '../hooks/useComments';
import { FeedSkeleton } from "@/components/SkeletonLoader";
import { HomeFeedEmpty, ExploreEmpty, NotificationsEmpty, NetworkError } from "@/components/EmptyStates";
import { ProfileEditModal } from "@/components/ProfileEditModal";
import { useErrorBoundary, useNetworkStatus } from "@/hooks/useErrorBoundary";
import { useReducedMotion } from "@/hooks/useAccessibility";
import { useAuth } from "@/hooks/useAuth";
import { useSocialFeatures } from "@/hooks/useSocialFeatures";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SearchModal } from "@/components/SearchModal";
import { UserProfile } from "@/components/UserProfile";
import SavedPage from "./Saved";
import { SampleDataButton } from "@/components/SampleDataButton";
import { ToastAction } from "@/components/ui/toast";


const Index = () => {
  const { user, loading: authLoading, profile, signOut } = useAuth();
  const { toggleLike, toggleFollow, toggleRevine, toggleSave, addComment, recordShare } = useSocialFeatures();
  
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'home' | 'explore' | 'capture' | 'notifications' | 'saved' | 'profile'>('home');
  const [showCapture, setShowCapture] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<ReturnType<typeof toDetailVideo> | any>(null);
  const [scrollY, setScrollY] = useState(0);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  
  // Real data hooks with pagination
  const { videos, loading: videosLoading, loadingMore, error: videosError, hasMore, refreshVideos, loadMore } = usePaginatedVideos();
  const { comments, loading: commentsLoading, addComment: addNewComment, fetchComments, toggleLike: toggleCommentLike } = useComments(selectedVideo?.id);
  
  // No automatic redirect to auth - allow anonymous browsing
  
  // Accessibility and error handling hooks
  const { error, handleNetworkError, clearError, retry } = useErrorBoundary();
  const isOnline = useNetworkStatus();
  const prefersReducedMotion = useReducedMotion();

  // Simplified haptic feedback helper
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator && !prefersReducedMotion) {
      const patterns = { light: 10, medium: 50, heavy: 100 };
      navigator.vibrate(patterns[type]);
    }
  }, [prefersReducedMotion]);

  // Network error handling
  useEffect(() => {
    if (!isOnline) {
      handleNetworkError(new Error('No internet connection'), () => {
        window.location.reload();
      });
    } else {
      clearError();
    }
  }, [isOnline, handleNetworkError, clearError]);

  // Simple mute toggle
  const handleToggleMute = useCallback(() => {
    setIsMuted(!isMuted);
  }, [isMuted]);

  // Handle scroll for Top App Bar blur effect
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleTabChange = (tab: typeof activeTab) => {
    triggerHaptic('light');
    if (tab === 'capture') {
      if (!user) {
        toast({
          title: "Sign in to create",
          description: "Create an account to upload content",
          action: (
            <ToastAction 
              altText="Sign In" 
              onClick={() => navigate('/auth')}
            >
              Sign In
            </ToastAction>
          )
        });
        return;
      }
      setShowCapture(true);
      return;
    }
    if (tab === 'profile') {
      if (!user) {
        toast({
          title: "Sign in to view profile",
          description: "Create an account to access your profile",
          action: (
            <ToastAction 
              altText="Sign In" 
              onClick={() => navigate('/auth')}
            >
              Sign In
            </ToastAction>
          )
        });
        return;
      }
      if (user?.id) {
        setSelectedUserId(user.id);
        setShowUserProfile(true);
      }
      return;
    }
    setActiveTab(tab);
  };

  const handleRefresh = () => {
    refreshVideos();
  };

  const handleExplore = () => {
    setActiveTab("explore");
  };

  const handleCreateLoop = () => {
    setShowCapture(true);
  };

  const handleCaptureClose = () => {
    setShowCapture(false);
    setActiveTab('home');
    refreshVideos(); // Refresh videos when returning from capture
  };

  const handleVideoComment = (videoId: string) => {
    const video = videos.find(v => v.id === videoId);
    if (video) {
      setSelectedVideo(video);
      fetchComments(video.id);
    }
  };

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId);
    setShowUserProfile(true);
  };

  const handleVideoSelect = (video: any) => {
    setSelectedVideo(video);
  };

  const handleShare = async (video: any) => {
    try {
      const shareData = {
        title: 'Loop',
        text: video.description || 'Check out this loop',
        url: window.location.origin + '/?v=' + video.id,
      };
      if (navigator.share && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast({ title: 'Link copied', description: 'Share URL copied to clipboard' });
      }
      await recordShare(video.id);
    } catch (err) {
      console.error('Share failed', err);
    }
  };

  const toDetailVideo = (video: any) => ({
    id: video.id,
    videoUrl: video.video_url,
    user: {
      id: video.user_id,
      username: video.profiles?.username || 'user',
      displayName: video.profiles?.display_name || 'User',
      avatarUrl: video.profiles?.avatar_url || '',
    },
    caption: video.description || '',
    hashtags: video.hashtags || [],
    audioTitle: video.audio_title,
    stats: {
      likes: video.likes_count || 0,
      comments: video.comments_count || 0,
      shares: (video as any).shares_count || 0,
    },
  });

  const handleCommentSubmit = async (text: string, parentId?: string) => {
    if (!selectedVideo?.id || !text.trim()) return;
    
    try {
      await addNewComment(selectedVideo.id, text, parentId);
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const handleCommentLike = (commentId: string) => {
    toggleCommentLike(commentId);
  };



  // Show capture screen
  if (showCapture) {
    return <CaptureScreen onClose={handleCaptureClose} onPost={refreshVideos} />;
  }

  // Show user profile
  if (showUserProfile) {
    return (
      <UserProfile
        userId={selectedUserId || undefined}
        onBack={() => {
          setShowUserProfile(false);
          setSelectedUserId(null);
        }}
        onVideoSelect={handleVideoSelect}
      />
    );
  }

  // Content rendering logic
  const renderContent = () => {
    if (error) {
      return <NetworkError onRetry={retry} />;
    }

    // Empty states for different tabs
    if (activeTab === "home" && videos.length === 0 && !videosLoading) {
      return (
        <div className="p-4 text-center">
          <SampleDataButton />
          <HomeFeedEmpty onExplore={handleExplore} onCapture={handleCreateLoop} />
        </div>
      );
    }

    if (activeTab === "explore" && videos.length === 0) {
      return <ExploreEmpty onRefresh={handleRefresh} />;
    }

    if (activeTab === "notifications") {
      return <NotificationsEmpty />;
    }

    // Regular content for each tab
    if (activeTab === 'home') {
      return (
        <VideoFeed
          videos={videos}
          loading={videosLoading}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onVideoComment={handleVideoComment}
          onUserClick={handleUserClick}
          onShare={handleShare}
          onLike={toggleLike}
          onRevine={toggleRevine}
          triggerHaptic={triggerHaptic}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      );
    }

    if (activeTab === 'explore') {
      return (
        <div className="p-4">
          <h2 className="text-2xl font-bold mb-4">Explore</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {videos.map((v) => (
              <button 
                key={v.id} 
                onClick={() => setSelectedVideo(v)} 
                className="aspect-[9/16] rounded-lg overflow-hidden bg-muted"
                aria-label="Open video"
                title="Open video"
              >
                <img src={v.thumbnail_url || '/placeholder.svg'} alt={v.title || 'Video thumbnail'} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (activeTab === 'saved') {
      return (
        <SavedPage />
      );
    }

    if (activeTab === 'profile') {
      if (!profile) {
        return <FeedSkeleton count={1} />;
      }
      
      return (
        <div className="p-6 max-w-md mx-auto">
          <div className="text-center mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full rounded-full object-cover" />
              ) : (
                profile.display_name?.[0]?.toUpperCase() || 'U'
              )}
            </div>
            <h2 className="text-xl font-bold">{profile.display_name}</h2>
            <p className="text-muted-foreground">@{profile.username}</p>
            {profile.bio && (
              <p className="text-sm text-muted-foreground mt-2">{profile.bio}</p>
            )}
            
            <div className="flex justify-center space-x-6 mt-4">
              <div className="text-center">
                <div className="font-bold">{profile.videos_count || 0}</div>
                <div className="text-sm text-muted-foreground">Loops</div>
              </div>
              <div className="text-center">
                <div className="font-bold">{profile.followers_count || 0}</div>
                <div className="text-sm text-muted-foreground">Followers</div>
              </div>
              <div className="text-center">
                <div className="font-bold">{profile.following_count || 0}</div>
                <div className="text-sm text-muted-foreground">Following</div>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={() => setShowProfileEdit(true)} 
              variant="outline" 
              className="w-full"
            >
              Edit Profile
            </Button>
            <Button 
              onClick={signOut} 
              variant="destructive" 
              className="w-full"
            >
              Sign Out
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-background safe-area-inset">
      {/* Top App Bar */}
      <TopAppBar 
        hasNotifications={true}
        onCaptureClick={() => setShowCapture(true)}
        onSearchClick={() => setShowSearch(true)}
        isScrolled={scrollY > 50}
      />

      {/* Search Modal */}
      <SearchModal
        open={showSearch}
        onOpenChange={setShowSearch}
        onVideoSelect={handleVideoSelect}
      />

      {/* Main Content */}
      <main className="pt-16 pb-20 h-screen overflow-hidden hide-scrollbar" role="main" aria-label={`${activeTab} feed`}>
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation 
        activeTab={activeTab}
        onTabChange={handleTabChange}
        hasNotifications={true}
      />

      {/* Video Detail Sheet */}
      {selectedVideo && (
        <VideoDetailSheet
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
          video={toDetailVideo(selectedVideo)}
          comments={(function buildThread() {
            const nodes: Record<string, any> = {};
            const roots: any[] = [];
            comments.forEach((c) => {
              nodes[c.id] = {
                id: c.id,
                user: {
                  id: c.user_id,
                  username: c.profiles?.username || 'user',
                  displayName: c.profiles?.display_name || 'User',
                  avatarUrl: c.profiles?.avatar_url || '',
                },
                text: c.content,
                timestamp: c.created_at,
                likes: (c as any).likes_count || 0,
                isLiked: !!(c as any).liked_by_me,
                replies: [] as any[],
              };
            });
            comments.forEach((c) => {
              if ((c as any).parent_id && nodes[(c as any).parent_id]) {
                nodes[(c as any).parent_id].replies.push(nodes[c.id]);
              } else {
                roots.push(nodes[c.id]);
              }
            });
            return roots;
          })()}
          isLoadingComments={commentsLoading}
          onShare={() => selectedVideo && handleShare(selectedVideo)}
          onCommentSubmit={handleCommentSubmit}
          onCommentLike={handleCommentLike}
        />
      )}

      {/* Profile Edit Modal */}
      <ProfileEditModal
        isOpen={showProfileEdit}
        onClose={() => setShowProfileEdit(false)}
      />
    </div>
  );
};

export default Index;