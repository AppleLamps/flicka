import { useState } from "react";
import { TopAppBar } from "@/components/TopAppBar";
import { VideoCard } from "@/components/VideoCard";
import { BottomNavigation } from "@/components/BottomNavigation";
import { CaptureScreen } from "@/components/CaptureScreen";
import { VideoDetailModal } from "@/components/VideoDetailModal";

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
      shares: 156
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
      shares: 445
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
  const [activeTab, setActiveTab] = useState<'home' | 'explore' | 'capture' | 'notifications' | 'profile'>('home');
  const [showCapture, setShowCapture] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<typeof mockVideos[0] | null>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  const handleTabChange = (tab: typeof activeTab) => {
    if (tab === 'capture') {
      setShowCapture(true);
    } else {
      setActiveTab(tab);
    }
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

  // Show capture screen
  if (showCapture) {
    return <CaptureScreen onClose={handleCaptureClose} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top App Bar */}
      <TopAppBar 
        hasNotifications={true}
        onCaptureClick={() => setShowCapture(true)}
      />

      {/* Main Content */}
      <main className="pt-16 pb-20">
        {activeTab === 'home' && (
          <div className="relative">
            {/* Video Feed */}
            <div className="snap-y snap-mandatory overflow-y-auto h-screen">
              {mockVideos.map((video, index) => (
                <div key={video.id} className="snap-start">
                  <VideoCard
                    {...video}
                    autoPlay={index === currentVideoIndex}
                    onComment={() => handleVideoComment(video.id)}
                    onUserClick={() => console.log('User clicked:', video.user.username)}
                    onLike={() => console.log('Like video:', video.id)}
                    onShare={() => console.log('Share video:', video.id)}
                    onFollow={() => console.log('Follow user:', video.user.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'explore' && (
          <div className="p-4 text-center">
            <h2 className="text-2xl font-bold mb-4">Explore</h2>
            <p className="text-muted-foreground">Discover trending loops and creators</p>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="p-4 text-center">
            <h2 className="text-2xl font-bold mb-4">Notifications</h2>
            <p className="text-muted-foreground">Stay updated with your loops</p>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="p-4 text-center">
            <h2 className="text-2xl font-bold mb-4">Profile</h2>
            <p className="text-muted-foreground">Your loops and profile settings</p>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation 
        activeTab={activeTab}
        onTabChange={handleTabChange}
        hasNotifications={true}
      />

      {/* Video Detail Modal */}
      <VideoDetailModal
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
        video={selectedVideo!}
        comments={mockComments}
        onCommentSubmit={handleCommentSubmit}
        onCommentLike={handleCommentLike}
        onShare={() => console.log('Share from modal')}
      />
    </div>
  );
};

export default Index;