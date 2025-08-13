import { useState, useEffect, useRef } from "react";
import { Search, TrendingUp, Clock, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Video } from "@/hooks/usePaginatedVideos";
import { useToast } from "@/hooks/use-toast";

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVideoSelect?: (video: Video) => void;
}

interface SearchResult {
  videos: Video[];
  hashtags: string[];
  users: Array<{
    user_id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  }>;
}

const TRENDING_HASHTAGS = ['#fyp', '#viral', '#trending', '#comedy', '#music', '#art', '#dance', '#lifestyle'];

export const SearchModal = ({ open, onOpenChange, onVideoSelect }: SearchModalProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult>({ videos: [], hashtags: [], users: [] });
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'videos' | 'users' | 'hashtags'>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
    // Load search history
    const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    setSearchHistory(history.slice(0, 5));
  }, [open]);

  const saveToHistory = (searchTerm: string) => {
    const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    const newHistory = [searchTerm, ...history.filter(h => h !== searchTerm)].slice(0, 10);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));
    setSearchHistory(newHistory.slice(0, 5));
  };

  const performSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults({ videos: [], hashtags: [], users: [] });
      return;
    }

    setLoading(true);
    try {
      // Search videos by title, description, hashtags
      const { data: videos, error: videosError } = await supabase
        .from('videos')
        .select(`
          *,
          profiles:profiles!videos_user_id_fkey (
            username,
            display_name,
            avatar_url
          )
        `)
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      // Search users by username and display name
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .or(`username.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`)
        .limit(10);

      if (videosError || usersError) {
        throw videosError || usersError;
      }

      // Extract hashtags from videos
      const hashtags = new Set<string>();
      videos?.forEach(video => {
        video.hashtags?.forEach(tag => {
          if (tag.toLowerCase().includes(searchTerm.toLowerCase())) {
            hashtags.add(tag);
          }
        });
      });

      setResults({
        videos: videos || [],
        hashtags: Array.from(hashtags).slice(0, 10),
        users: users || []
      });

      if (searchTerm.length > 2) {
        saveToHistory(searchTerm);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search failed",
        description: "Failed to search. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleVideoClick = (video: Video) => {
    onVideoSelect?.(video);
    onOpenChange(false);
  };

  const handleHashtagClick = (hashtag: string) => {
    setQuery(hashtag);
    setActiveTab('videos');
  };

  const clearHistory = () => {
    localStorage.removeItem('searchHistory');
    setSearchHistory([]);
  };

  const getTotalResults = () => {
    return results.videos.length + results.users.length + results.hashtags.length;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0 glass-surface">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-3">
            <Search className="w-5 h-5 text-muted-foreground" />
            Search
          </DialogTitle>
        </DialogHeader>

        <div className="px-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search videos, users, hashtags..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-10 bg-input border-border/20 rounded-xl"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search Tabs */}
          <div className="flex gap-2 mt-4">
            <Button
              variant={activeTab === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('all')}
              className="rounded-full"
            >
              All {getTotalResults() > 0 && `(${getTotalResults()})`}
            </Button>
            <Button
              variant={activeTab === 'videos' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('videos')}
              className="rounded-full"
            >
              Videos {results.videos.length > 0 && `(${results.videos.length})`}
            </Button>
            <Button
              variant={activeTab === 'users' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('users')}
              className="rounded-full"
            >
              Users {results.users.length > 0 && `(${results.users.length})`}
            </Button>
            <Button
              variant={activeTab === 'hashtags' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('hashtags')}
              className="rounded-full"
            >
              Tags {results.hashtags.length > 0 && `(${results.hashtags.length})`}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="loading-spinner w-6 h-6 rounded-full"></div>
            </div>
          )}

          {!query && !loading && (
            <div className="space-y-6">
              {/* Search History */}
              {searchHistory.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Recent searches
                    </h3>
                    <Button variant="ghost" size="sm" onClick={clearHistory}>
                      Clear
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {searchHistory.map((term, index) => (
                      <button
                        key={index}
                        onClick={() => setQuery(term)}
                        className="w-full text-left p-2 rounded-lg hover:bg-muted/20 transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending Hashtags */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Trending
                </h3>
                <div className="flex flex-wrap gap-2">
                  {TRENDING_HASHTAGS.map((hashtag) => (
                    <Badge
                      key={hashtag}
                      variant="secondary"
                      className="cursor-pointer hover:bg-accent/20 transition-colors"
                      onClick={() => handleHashtagClick(hashtag)}
                    >
                      {hashtag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {query && !loading && getTotalResults() === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No results found for "{query}"
            </div>
          )}

          {/* Search Results */}
          {query && !loading && getTotalResults() > 0 && (
            <div className="space-y-6">
              {/* Videos */}
              {(activeTab === 'all' || activeTab === 'videos') && results.videos.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Videos ({results.videos.length})
                  </h3>
                  <div className="space-y-3">
                    {results.videos.slice(0, activeTab === 'videos' ? 20 : 5).map((video) => (
                      <button
                        key={video.id}
                        onClick={() => handleVideoClick(video)}
                        className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-muted/20 transition-colors text-left"
                      >
                        <div className="w-16 h-12 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
                          {video.thumbnail_url && (
                            <img
                              src={video.thumbnail_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{video.title || 'Untitled'}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            @{video.profiles?.username}
                          </p>
                          {video.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {video.description}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Users */}
              {(activeTab === 'all' || activeTab === 'users') && results.users.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Users ({results.users.length})
                  </h3>
                  <div className="space-y-3">
                    {results.users.slice(0, activeTab === 'users' ? 20 : 5).map((user) => (
                      <div
                        key={user.user_id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/20 transition-colors"
                      >
                        <div className="w-10 h-10 bg-muted rounded-full overflow-hidden flex-shrink-0">
                          {user.avatar_url && (
                            <img
                              src={user.avatar_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{user.display_name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            @{user.username}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" className="rounded-full">
                          Follow
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hashtags */}
              {(activeTab === 'all' || activeTab === 'hashtags') && results.hashtags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Hashtags ({results.hashtags.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {results.hashtags.map((hashtag) => (
                      <Badge
                        key={hashtag}
                        variant="secondary"
                        className="cursor-pointer hover:bg-accent/20 transition-colors"
                        onClick={() => handleHashtagClick(hashtag)}
                      >
                        {hashtag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};