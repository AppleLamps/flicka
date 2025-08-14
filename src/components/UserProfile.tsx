import { useState, useEffect } from "react";
import { ArrowLeft, MoreHorizontal, UserPlus, MessageCircle, Share2, Copy, Share, Link as LinkIcon, Grid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Video } from "@/hooks/usePaginatedVideos";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { EnhancedVideoCard } from "./EnhancedVideoCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileEditModal } from "./ProfileEditModal";
import { ShareSheet } from "./ShareSheet";
import { CollectionGrid } from "./CollectionGrid";

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
  const [showEdit, setShowEdit] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [gridView, setGridView] = useState<'grid' | 'list'>('grid');
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
        setProfile(prev => prev ? { ...prev, followers_count: Math.max(0, (prev.followers_count || 0) - 1) } as ProfileData : prev);
      } else {
        await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: profile.user_id
          });
        setIsFollowing(true);
        setProfile(prev => prev ? { ...prev, followers_count: (prev.followers_count || 0) + 1 } as ProfileData : prev);
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

  const handleShareProfile = async () => {
    if (!profile) return;
    const url = `${window.location.origin}/@${profile.username}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${profile.display_name} on Loop`, url });
      } else {
        setShareOpen(true);
      }
    } catch {}
  };

  const handleCopyUsername = async () => {
    if (!profile) return;
    try {
      await navigator.clipboard.writeText(`@${profile.username}`);
      toast({ title: "Copied", description: "Username copied to clipboard" });
    } catch {}
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
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="icon-button" onClick={handleShareProfile} aria-label="Share profile" title="Share profile">
              <Share className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" className="icon-button" onClick={handleCopyUsername} aria-label="Copy username" title="Copy username">
              <Copy className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Profile Info */}
      <div className="px-4 py-6">
        <div className="flex items-start gap-4 mb-6">
          <Avatar className="w-20 h-20">
            <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
            <AvatarFallback>{profile.display_name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-1">{profile.display_name}</h2>
            <p className="text-muted-foreground mb-3">@{profile.username}</p>
            
            {profile.bio && (
              <p className="text-foreground mb-4">{profile.bio}</p>
            )}

            {/* Temporarily commented until types regenerate */}
            {/* {(profile.website_url || (profile as any).links) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {profile.website_url && (
                  <a href={profile.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
                    <LinkIcon className="w-3 h-3" /> Website
                  </a>
                )}
                {((profile as any).links?.items || []).map((l: any, idx: number) => (
                  <a key={idx} href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-xs">
                    <LinkIcon className="w-3 h-3" /> {l.title || l.url}
                  </a>
                ))}
              </div>
            )} */}

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
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowEdit(true)}>
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
                  <Button variant="outline" size="sm" className="icon-button" onClick={handleShareProfile} aria-label="Share profile" title="Share profile">
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
          <TabsTrigger value="about" className="flex-1">About</TabsTrigger>
          <TabsTrigger value="saved" className="flex-1">Saved</TabsTrigger>
        </TabsList>
        
        <TabsContent value="videos" className="mt-6">
          <div className="flex justify-end mb-2">
            <Button variant="ghost" size="sm" onClick={() => setGridView(v => v === 'grid' ? 'list' : 'grid')}>
              {gridView === 'grid' ? <List className="w-4 h-4 mr-2" /> : <Grid className="w-4 h-4 mr-2" />}
              {gridView === 'grid' ? 'List' : 'Grid'} view
            </Button>
          </div>
          {videos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No videos yet</p>
            </div>
          ) : (
            gridView === 'grid' ? (
              <div className="grid grid-cols-3 gap-1">
                {videos.map((video) => (
                  <button key={video.id} onClick={() => onVideoSelect?.(video)} className="aspect-[9/16] bg-muted rounded-lg overflow-hidden relative group" aria-label="Open video" title="Open video">
                    <img src={video.thumbnail_url || '/placeholder.svg'} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {videos.map((video) => (
                  <button key={video.id} onClick={() => onVideoSelect?.(video)} className="flex gap-3 items-center p-2 rounded-lg hover:bg-muted/50" aria-label="Open video" title="Open video">
                    <div className="w-20 aspect-[9/16] bg-muted rounded overflow-hidden">
                      <img src={video.thumbnail_url || '/placeholder.svg'} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium line-clamp-2">{video.title || 'Untitled'}</div>
                      <div className="text-xs text-muted-foreground">{new Date(video.created_at).toLocaleDateString()}</div>
                    </div>
                  </button>
                ))}
              </div>
            )
          )}
        </TabsContent>
        
        <TabsContent value="liked" className="mt-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Liked videos are private</p>
          </div>
        </TabsContent>

        <TabsContent value="about" className="mt-6">
          <div className="space-y-4">
            {profile.bio ? (
              <p className="text-sm leading-relaxed whitespace-pre-line">{profile.bio}</p>
            ) : (
              <p className="text-muted-foreground text-sm">No bio yet.</p>
            )}
            <div className="text-xs text-muted-foreground">Joined {new Date(profile.created_at).toLocaleDateString()}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleShareProfile}><Share2 className="w-4 h-4 mr-2" /> Share profile</Button>
              <Button variant="outline" size="sm" onClick={handleCopyUsername}><Copy className="w-4 h-4 mr-2" /> Copy @username</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="saved" className="mt-6">
          <CollectionGrid userId={profile.user_id} />
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

      {isOwnProfile && (
        <ProfileEditModal
          isOpen={showEdit}
          onClose={() => {
            setShowEdit(false);
            loadProfile();
          }}
        />
      )}

      <ShareSheet open={shareOpen} onOpenChange={setShareOpen} title={`${profile.display_name} on Loop`} url={`${window.location.origin}/@${profile.username}`} />
    </div>
  );
};