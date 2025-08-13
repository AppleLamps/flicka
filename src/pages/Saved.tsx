import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FeedSkeleton } from "@/components/SkeletonLoader";

interface SavedItem {
  id: string;
  created_at: string;
  video: {
    id: string;
    thumbnail_url?: string;
    description?: string;
    video_url: string;
    profiles?: {
      username?: string;
      display_name?: string;
      avatar_url?: string;
    };
  };
}

export default function SavedPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSaved = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("saved_videos")
        .select(
          `id, created_at, video:video_id (
            id, thumbnail_url, description, video_url,
            profiles:profiles!videos_user_id_fkey (username, display_name, avatar_url)
          )`
        )
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setItems((data as any) || []);
      }
      setLoading(false);
    };
    fetchSaved();
  }, [user]);

  if (loading) return <FeedSkeleton count={2} />;
  if (error) return <div className="p-4 text-center text-destructive">{error}</div>;
  if (!user) return <div className="p-4 text-center text-muted-foreground">Sign in to view saved videos.</div>;

  if (items.length === 0) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">No saved videos yet</h2>
        <p className="text-muted-foreground">Long-press a video to save it for later.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Saved</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((item) => (
          <a
            key={item.id}
            href={`/?v=${item.video.id}`}
            className="relative rounded-lg overflow-hidden bg-muted/40 aspect-[9/16]"
            title={item.video.description || "Saved video"}
          >
            {item.video.thumbnail_url ? (
              <img
                src={item.video.thumbnail_url}
                alt={item.video.description || "Saved video"}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/40 to-primary/20" />
            )}
            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
              <p className="text-[11px] text-white line-clamp-2">
                {item.video.description || ""}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}


