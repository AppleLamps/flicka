import { useState, useEffect } from "react";
import { ArrowLeft, MoreHorizontal, UserPlus, MessageCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Video } from "@/hooks/usePaginatedVideos";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { EnhancedVideoCard } from "./EnhancedVideoCard";

interface UserProfileProps {
  userId?: string;
  username?: string;
  onBack?: () => void;
  onVideoSelect?: (video: Video) => void;
}

interface ProfileData {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  followers_count: number;
  following_count: number;
  videos_count: number;
  created_at: string;
}

interface FollowersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  type: 'followers' | 'following';
}

const FollowersModal = ({ open, onOpenChange, userId, type }: FollowersModalProps) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && userId) {
      loadUsers();
    }
  }, [open, userId, type]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('follows')
        .select(`
          ${type === 'followers' ? 'follower_id' : 'following_id'},
          profiles:profiles!${type === 'followers' ? 'follows_follower_id_fkey' : 'follows_following_id_fkey'} (
            user_id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq(type === 'followers' ? 'following_id' : 'follower_id', userId);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error(`Error loading ${type}:`, error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[60vh] glass-surface">
        <DialogHeader>
          <DialogTitle className="capitalize">{type}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="loading-spinner w-6 h-6 rounded-full"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((item) => {
                const profile = item.profiles;
                return (
                  <div key={profile.user_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-full overflow-hidden">
                        {profile.avatar_url && (
                          <img
                            src={profile.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{profile.display_name}</p>
                        <p className="text-sm text-muted-foreground">@{profile.username}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="rounded-full">
                      Follow
                    </Button>
                  </div>
                );
              })}
              {users.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No {type} yet
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const UserProfile = ({ userId, username, onBack, onVideoSelect }: UserProfileProps) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [followersModal, setFollowersModal] = useState(false);
  const [followingModal, setFollowingModal] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (userId || username) {
      loadProfile();
    }
  }, [userId, username]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      let query = supabase.from('profiles').select('*');
      
      if (userId) {
        query = query.eq('user_id', userId);
      } else if (username) {
        query = query.eq('username', username);
      }

      const { data: profileData, error: profileError } = await query.single();
      
      if (profileError) throw profileError;
      setProfile(profileData);

      // Load user's videos
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select(`
          *,
          profiles:profiles!videos_user_id_fkey (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('user_id', profileData.user_id)
        .order('created_at', { ascending: false });

      if (videosError) throw videosError;
      setVideos(videosData || []);

      // Check if current user follows this profile
      if (user && user.id !== profileData.user_id) {
        const { data: followData } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', profileData.user_id)
          .single();
        
        setIsFollowing(!!followData);
      }

    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Failed to load profile",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!user || !profile) return;

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profile.user_id);
        setIsFollowing(false);
      } else {
        await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: profile.user_id
          });
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast({
        title: "Action failed",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-64">
          <div className="loading-spinner w-8 h-8 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">User not found</h2>
          <p className="text-muted-foreground">This user doesn't exist or has been removed.</p>
          {onBack && (
            <Button onClick={onBack} className="mt-4">
              Go Back
            </Button>
          )}
        </div>
      </div>
    );
  }

  const isOwnProfile = user?.id === profile.user_id;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-surface backdrop-blur-header border-b border-border/20">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} className="icon-button">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <div>
              <h1 className="font-semibold">{profile.display_name}</h1>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="icon-button">
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Profile Info */}
      <div className="px-4 py-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-20 h-20 bg-muted rounded-full overflow-hidden flex-shrink-0">
            {profile.avatar_url && (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-1">{profile.display_name}</h2>
            <p className="text-muted-foreground mb-3">@{profile.username}</p>
            
            {profile.bio && (
              <p className="text-foreground mb-4">{profile.bio}</p>
            )}

            {/* Stats */}
            <div className="flex gap-6 mb-4">
              <button 
                onClick={() => setFollowingModal(true)}
                className="text-center hover:opacity-80 transition-opacity"
              >
                <div className="font-bold">{profile.following_count}</div>
                <div className="text-sm text-muted-foreground">Following</div>
              </button>
              <button 
                onClick={() => setFollowersModal(true)}
                className="text-center hover:opacity-80 transition-opacity"
              >
                <div className="font-bold">{profile.followers_count}</div>
                <div className="text-sm text-muted-foreground">Followers</div>
              </button>
              <div className="text-center">
                <div className="font-bold">{profile.videos_count}</div>
                <div className="text-sm text-muted-foreground">Videos</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {isOwnProfile ? (
                <Button variant="outline" className="flex-1 rounded-xl">
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button 
                    variant={isFollowing ? "outline" : "default"} 
                    onClick={handleFollow}
                    className="flex-1 rounded-xl"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {isFollowing ? 'Following' : 'Follow'}
                  </Button>
                  <Button variant="outline" size="sm" className="icon-button">
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="icon-button">
                    <Share2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="videos" className="px-4">
        <TabsList className="w-full">
          <TabsTrigger value="videos" className="flex-1">Videos</TabsTrigger>
          <TabsTrigger value="liked" className="flex-1">Liked</TabsTrigger>
        </TabsList>
        
        <TabsContent value="videos" className="mt-6">
          {videos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No videos yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {videos.map((video) => (
                <button
                  key={video.id}
                  onClick={() => onVideoSelect?.(video)}
                  className="aspect-[9/16] bg-muted rounded-lg overflow-hidden relative group"
                >
                  {video.thumbnail_url && (
                    <img
                      src={video.thumbnail_url}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                  <div className="absolute bottom-2 left-2 right-2">
                    {video.title && (
                      <p className="text-white text-xs font-medium line-clamp-2">
                        {video.title}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="liked" className="mt-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Liked videos are private</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <FollowersModal
        open={followersModal}
        onOpenChange={setFollowersModal}
        userId={profile.user_id}
        type="followers"
      />
      <FollowersModal
        open={followingModal}
        onOpenChange={setFollowingModal}
        userId={profile.user_id}
        type="following"
      />
    </div>
  );
};