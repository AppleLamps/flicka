import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Comment {
  id: string;
  user_id: string;
  video_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  parent_id?: string | null;
  likes_count?: number;
  liked_by_me?: boolean;
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
  const { user } = useAuth();

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

      const all = (data || []) as Comment[];

      // Mark liked_by_me (temporarily disabled until types are updated)
      if (user && all.length > 0) {
        // TODO: Re-enable when comment_likes table is added to types
        // For now, set all as not liked
        all.forEach(c => { (c as Comment).liked_by_me = false; });
      }

      setComments(all);
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch comments');
    } finally {
      setLoading(false);
    }
  };

  const addComment = async (videoId: string, content: string, parentId?: string) => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          video_id: videoId,
          content: content,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          parent_id: parentId || null
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

  const toggleLike = async (commentId: string) => {
    try {
      const currentUser = (await supabase.auth.getUser()).data.user;
      if (!currentUser) return;

      // TODO: Re-enable when comment_likes table is added to types
      console.log('Comment like feature temporarily disabled');
      
      // For now, just update the UI optimistically
      setComments(prev => prev.map(c => c.id === commentId 
        ? { ...c, likes_count: (c.likes_count || 0) + 1, liked_by_me: true } 
        : c));
    } catch (err) {
      console.error('Error toggling comment like:', err);
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
    fetchComments,
    toggleLike,
  };
};