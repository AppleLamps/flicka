import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Comment {
  id: string;
  user_id: string;
  video_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  // Profile data
  profiles?: {
    username?: string;
    display_name?: string;
    avatar_url?: string;
  };
}

export const useComments = (videoId?: string) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('comments')
        .select(`
          *,
          profiles:profiles!comments_user_id_fkey (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('video_id', id)
        .order('created_at', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setComments(data || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch comments');
    } finally {
      setLoading(false);
    }
  };

  const addComment = async (videoId: string, content: string) => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          video_id: videoId,
          content: content,
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select(`
          *,
          profiles:profiles!comments_user_id_fkey (
            username,
            display_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      if (data) {
        setComments(prev => [...prev, data]);
        
        // Update comments count on the video
        await supabase
          .from('videos')
          .update({ comments_count: comments.length + 1 })
          .eq('id', videoId);
      }

      return data;
    } catch (err) {
      console.error('Error adding comment:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (videoId) {
      fetchComments(videoId);

      // Set up real-time subscription for new comments on this video
      const channel = supabase
        .channel(`comments:video_id=eq.${videoId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'comments',
            filter: `video_id=eq.${videoId}`
          },
          (payload) => {
            console.log('New comment added:', payload);
            fetchComments(videoId); // Refresh comments to get profile data
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [videoId]);

  return {
    comments,
    loading,
    error,
    addComment,
    fetchComments
  };
};