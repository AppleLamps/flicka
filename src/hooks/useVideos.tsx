import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Video {
  id: string;
  user_id: string;
  title?: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  duration?: number;
  hashtags?: string[];
  audio_title?: string;
  likes_count: number;
  comments_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
  // Profile data
  profiles?: {
    username?: string;
    display_name?: string;
    avatar_url?: string;
  };
}

export const useVideos = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('videos')
        .select(`
          *,
          profiles:profiles!videos_user_id_fkey (
            username,
            display_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setVideos(data || []);
    } catch (err) {
      console.error('Error fetching videos:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch videos');
    } finally {
      setLoading(false);
    }
  };

  const refreshVideos = () => {
    fetchVideos();
  };

  useEffect(() => {
    fetchVideos();

    // Set up real-time subscription for new videos
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'videos'
        },
        (payload) => {
          console.log('New video added:', payload);
          refreshVideos(); // Refresh the entire list to get profile data
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    videos,
    loading,
    error,
    refreshVideos
  };
};