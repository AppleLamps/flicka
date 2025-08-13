import { useState, useEffect, useCallback, useRef } from "react";
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
  revines_count?: number;
  views_count: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    username?: string;
    display_name?: string;
    avatar_url?: string;
  };
}

const VIDEOS_PER_PAGE = 10;

export const usePaginatedVideos = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastVideoDate, setLastVideoDate] = useState<string | null>(null);
  const lastVideoDateRef = useRef<string | null>(null);
  const { user } = useAuth();

  const fetchVideos = useCallback(async (loadMore = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setVideos([]);
        setLastVideoDate(null);
        lastVideoDateRef.current = null;
        setHasMore(true);
      }
      setError(null);

      let query = supabase
        .from('videos')
        .select(`
          *,
          profiles:profiles!videos_user_id_fkey (
            username,
            display_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(VIDEOS_PER_PAGE);

      // Add cursor-based pagination
      if (loadMore && lastVideoDateRef.current) {
        query = query.lt('created_at', lastVideoDateRef.current);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      const newVideos = data || [];
      
      if (loadMore) {
        setVideos(prev => [...prev, ...newVideos]);
      } else {
        setVideos(newVideos);
      }

      // Update pagination state
      if (newVideos.length > 0) {
        const cursor = newVideos[newVideos.length - 1].created_at;
        setLastVideoDate(cursor);
        lastVideoDateRef.current = cursor;
      }
      
      setHasMore(newVideos.length === VIDEOS_PER_PAGE);
    } catch (err) {
      console.error('Error fetching videos:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch videos');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchVideos(true);
    }
  }, [fetchVideos, loadingMore, hasMore]);

  const refreshVideos = useCallback(() => {
    lastVideoDateRef.current = null;
    setLastVideoDate(null);
    fetchVideos(false);
  }, [fetchVideos]);

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
        () => {
          refreshVideos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchVideos, refreshVideos]);

  return {
    videos,
    loading,
    loadingMore,
    error,
    hasMore,
    refreshVideos,
    loadMore
  };
};