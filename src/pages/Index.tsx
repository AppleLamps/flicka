import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { TopAppBar } from "@/components/TopAppBar";
import { EnhancedVideoCard } from "@/components/EnhancedVideoCard";
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
import { useVideoManager } from "@/hooks/useVideoManager";
import { useAuth } from "@/hooks/useAuth";
import { useSocialFeatures } from "@/hooks/useSocialFeatures";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SearchModal } from "@/components/SearchModal";
import { UserProfile } from "@/components/UserProfile";
import { Virtuoso } from "react-virtuoso";
// import { InfiniteScroll } from "@/components/InfiniteScroll"; // Replaced by Virtuoso virtualization
import { SampleDataButton } from "@/components/SampleDataButton";


const Index = () => {
  const { user, loading: authLoading, profile, signOut } = useAuth();
  const { toggleLike, toggleFollow, toggleRevine, addComment } = useSocialFeatures();
  
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'home' | 'explore' | 'capture' | 'notifications' | 'profile'>('home');
  const [showCapture, setShowCapture] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [scrollY, setScrollY] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [realTimeComments, setRealTimeComments] = useState<any[]>([]);
  
  // Real data hooks with pagination
  const { videos, loading: videosLoading, loadingMore, error: videosError, hasMore, refreshVideos, loadMore } = usePaginatedVideos();
  const { comments, loading: commentsLoading, addComment: addNewComment, fetchComments } = useComments(selectedVideo?.id);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);
  
  // Enhanced video management
  const {
    registerVideo,
    updateVideoVisibility,
    playVideo,
    pauseVideo,
    pauseAllVideos,
    preloadVideo,
    isBuffering,
    networkType,
    currentVideoIndex,
    toggleMute,
    isMuted
  } = useVideoManager({
    preloadDistance: 3,
    maxActiveVideos: 5,
    networkAware: true
  });
  
  // Accessibility and error handling hooks
  const { error, handleNetworkError, clearError, retry } = useErrorBoundary();
  const isOnline = useNetworkStatus();
  const prefersReducedMotion = useReducedMotion();

  // Haptic feedback helper with reduced motion support
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator && !prefersReducedMotion) {
      const patterns = { light: 10, medium: 50, heavy: 100 };
      navigator.vibrate(patterns[type]);
    }
  }, [prefersReducedMotion]);

  // Update loading state based on videos loading
  useEffect(() => {
    setIsLoading(videosLoading);
  }, [videosLoading]);

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

  // Enhanced video management with preloading
  useEffect(() => {
    // Preload adjacent videos
    const preloadAdjacent = () => {
      videos.forEach((video, index) => {
        const distance = Math.abs(index - currentVideoIndex);
        if (distance <= 2 && distance > 0) {
          const priority = distance === 1 ? 'high' : 'medium';
          preloadVideo(video.id, video.video_url, priority);
        }
      });
    };

    preloadAdjacent();
  }, [currentVideoIndex, preloadVideo, videos]);

  // Background tab handling - pause all videos when tab becomes inactive
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        pauseAllVideos();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [pauseAllVideos]);

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
      setShowCapture(true);
    } else {
      setActiveTab(tab);
    }
  };

  const handleRefresh = () => {
    refreshVideos();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
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
      shares: 0,
    },
  });

  const handleCommentSubmit = async (text: string) => {
    if (!selectedVideo?.id || !text.trim()) return;
    
    try {
      await addNewComment(selectedVideo.id, text);
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const handleCommentLike = (commentId: string) => {
    console.log('Like comment:', commentId);
    // Handle comment like
  };

  const handleVideoRef = useCallback((videoId: string, element: HTMLVideoElement | null) => {
    registerVideo(videoId, element);
  }, [registerVideo]);

  const handleVideoVisibilityChange = useCallback((videoId: string, index: number, isVisible: boolean) => {
    updateVideoVisibility(videoId, isVisible, index);
    
    if (isVisible) {
      playVideo(videoId);
    } else {
      pauseVideo(videoId);
    }
  }, [updateVideoVisibility, playVideo, pauseVideo]);

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

    if (isLoading) {
      return <FeedSkeleton count={3} />;
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
        <Virtuoso
          useWindowScroll
          data={videos}
          endReached={loadMore}
          increaseViewportBy={{ top: 200, bottom: 200 }}
          itemContent={(index, video) => (
              <div
              key={video.id}
              data-video-id={video.id}
                id={`feed-item-${index}`}
                className="w-full h-screen snap-start snap-always"
            >
              <EnhancedVideoCard
                id={video.id}
                videoUrl={video.video_url}
                thumbnailUrl={video.thumbnail_url}
                user={{
                  id: video.user_id,
                  username: video.profiles?.username || 'user',
                  displayName: video.profiles?.display_name || 'User',
                  avatarUrl: video.profiles?.avatar_url || '',
                  isVerified: false,
                  isPrivate: false
                }}
                caption={video.description || ''}
                hashtags={video.hashtags || []}
                audioTitle={video.audio_title}
                stats={{
                  likes: video.likes_count,
                  comments: video.comments_count,
                  shares: 0,
                  saves: 0,
                  revines: (video as any).revines_count || 0
                }}
                autoPlay={index === currentVideoIndex}
                isBuffering={isBuffering[video.id] || false}
                isMuted={isMuted}
                onToggleMute={toggleMute}
                onComment={() => handleVideoComment(video.id)}
                onUserClick={() => handleUserClick(video.user_id)}
                onLike={() => toggleLike(video.id)}
                onShare={() => handleShare(video)}
                onRevine={() => toggleRevine(video.id)}
                onVideoRef={(element) => handleVideoRef(video.id, element)}
                onVisibilityChange={(isVisible) => handleVideoVisibilityChange(video.id, index, isVisible)}
                triggerHaptic={triggerHaptic}
              />
            </div>
          )}
        />
      );
    }

    if (activeTab === 'explore') {
      return (
        <div className="p-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Explore</h2>
          <p className="text-muted-foreground">Discover trending loops and creators</p>
        </div>
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
      <main className="pt-16 pb-20 snap-y snap-mandatory" ref={containerRef} role="main" aria-label={`${activeTab} feed`}>
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
          comments={comments.map(comment => ({
            id: comment.id,
            user: {
              id: comment.user_id,
              username: comment.profiles?.username || 'user',
              displayName: comment.profiles?.display_name || 'User',
              avatarUrl: comment.profiles?.avatar_url || '',
            },
            text: comment.content,
            timestamp: comment.created_at,
            likes: 0,
            isLiked: false,
            replies: []
          }))}
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