import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { TopAppBar } from "@/components/TopAppBar";
import { EnhancedVideoCard } from "@/components/EnhancedVideoCard";
import { BottomNavigation } from "@/components/BottomNavigation";
import { CaptureScreen } from "@/components/CaptureScreen";
import { VideoDetailSheet } from "@/components/VideoDetailSheet";
import { FeedSkeleton } from "@/components/SkeletonLoader";
import { HomeFeedEmpty, ExploreEmpty, NotificationsEmpty, NetworkError } from "@/components/EmptyStates";
import { ProfileEditModal } from "@/components/ProfileEditModal";
import { useErrorBoundary, useNetworkStatus } from "@/hooks/useErrorBoundary";
import { useReducedMotion } from "@/hooks/useAccessibility";
import { useVideoManager } from "@/hooks/useVideoManager";
import { useAuth } from "@/hooks/useAuth";
import { useSocialFeatures } from "@/hooks/useSocialFeatures";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

// Mock data
const mockVideos = [
  {
    id: "1",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1611647832580-377268dba7cb?w=400",
    user: {
      id: "user1",
      username: "creativeartist",
      displayName: "Creative Artist",
      avatarUrl: "https://images.unsplash.com/photo-1494790108755-2616b612b5c4?w=100",
      isFollowing: false
    },
    caption: "Just experimenting with some new lighting techniques in my studio setup! ✨",
    hashtags: ["photography", "studio", "lighting", "creative"],
    audioTitle: "Chill Vibes - Lo-fi Hip Hop",
    stats: {
      likes: 1240,
      comments: 89,
      shares: 156,
      saves: 45,
      revines: 23
    },
    isLiked: false
  },
  {
    id: "2", 
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400",
    user: {
      id: "user2",
      username: "urbandancer",
      displayName: "Urban Dancer",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
      isFollowing: true
    },
    caption: "Morning practice session in the city. The energy here is unmatched! 🔥",
    hashtags: ["dance", "urban", "morning", "energy", "city"],
    audioTitle: "Street Beats - Hip Hop Mix",
    stats: {
      likes: 2890,
      comments: 234,
      shares: 445,
      saves: 123,
      revines: 67
    },
    isLiked: true
  }
];

const mockComments = [
  {
    id: "1",
    user: {
      id: "commenter1",
      username: "photolover",
      displayName: "Photo Lover",
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"
    },
    text: "This lighting setup is incredible! Can you share what equipment you're using?",
    timestamp: "2024-01-15T10:30:00Z",
    likes: 12,
    isLiked: false,
    replies: [
      {
        id: "1-1",
        user: {
          id: "user1",
          username: "creativeartist", 
          displayName: "Creative Artist"
        },
        text: "Thanks! I'm using a Godox AD400 Pro with a 120cm softbox 📸",
        timestamp: "2024-01-15T10:45:00Z",
        likes: 5,
        isLiked: false
      }
    ]
  },
  {
    id: "2",
    user: {
      id: "commenter2",
      username: "studiovibes",
      displayName: "Studio Vibes",
      avatarUrl: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100"
    },
    text: "The shadows are perfect! Really inspiring work 🙌",
    timestamp: "2024-01-15T11:00:00Z",
    likes: 8,
    isLiked: true
  },
  {
    id: "3",
    user: {
      id: "commenter3",
      username: "newbietographer",
      displayName: "Newbie Photographer"
    },
    text: "As someone just starting out, this gives me so much motivation to keep practicing!",
    timestamp: "2024-01-15T11:15:00Z",
    likes: 3,
    isLiked: false
  }
];

const Index = () => {
  const { user, loading: authLoading, profile, signOut } = useAuth();
  const { toggleLike, toggleFollow, addComment } = useSocialFeatures();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'home' | 'explore' | 'capture' | 'notifications' | 'profile'>('home');
  const [showCapture, setShowCapture] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<typeof mockVideos[0] | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [videos, setVideos] = useState<any[]>([]);
  const [realTimeComments, setRealTimeComments] = useState<any[]>([]);
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
    currentVideoIndex
  } = useVideoManager({
    preloadDistance: 2,
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

  // Simulate loading state for demo
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

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
      mockVideos.forEach((video, index) => {
        const distance = Math.abs(index - currentVideoIndex);
        if (distance <= 2 && distance > 0) {
          const priority = distance === 1 ? 'high' : 'medium';
          preloadVideo(video.id, video.videoUrl, priority);
        }
      });
    };

    preloadAdjacent();
  }, [currentVideoIndex, preloadVideo]);

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
  };

  const handleVideoComment = (videoId: string) => {
    const video = mockVideos.find(v => v.id === videoId);
    if (video) {
      setSelectedVideo(video);
    }
  };

  const handleCommentSubmit = (text: string) => {
    console.log('New comment:', text);
    // Handle comment submission
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
    return <CaptureScreen onClose={handleCaptureClose} />;
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
    if (activeTab === "home" && mockVideos.length === 0) {
      return <HomeFeedEmpty onExplore={handleExplore} onCapture={handleCreateLoop} />;
    }

    if (activeTab === "explore" && mockVideos.length === 0) {
      return <ExploreEmpty onRefresh={handleRefresh} />;
    }

    if (activeTab === "notifications") {
      return <NotificationsEmpty />;
    }

    // Regular content for each tab
    if (activeTab === 'home') {
      return (
        <div className="w-full">
          {mockVideos.map((video, index) => (
            <div 
              key={video.id}
              data-video-id={video.id}
              className="w-full h-screen snap-start"
            >
              <EnhancedVideoCard
                {...video}
                user={{
                  ...video.user,
                  isVerified: video.user.username === 'creativeartist',
                  isPrivate: video.user.username === 'urbandancer'
                }}
                autoPlay={index === currentVideoIndex}
                isBuffering={isBuffering[video.id] || false}
                onComment={() => handleVideoComment(video.id)}
                onUserClick={() => console.log('User clicked:', video.user.username)}
                onLike={() => console.log('Like video:', video.id)}
                onShare={() => console.log('Share video:', video.id)}
                onRevine={() => console.log('Revine video:', video.id)}
                onVideoRef={(element) => handleVideoRef(video.id, element)}
                onVisibilityChange={(isVisible) => handleVideoVisibilityChange(video.id, index, isVisible)}
                triggerHaptic={triggerHaptic}
              />
            </div>
          ))}
        </div>
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
        isScrolled={scrollY > 50}
      />

      {/* Main Content */}
      <main className="pt-16 pb-20" ref={containerRef} role="main" aria-label={`${activeTab} feed`}>
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
          video={selectedVideo}
          comments={mockComments}
          isLoadingComments={false}
          onShare={() => console.log('Share video')}
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