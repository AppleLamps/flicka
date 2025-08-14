import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const useSocialFeatures = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const toggleLike = async (videoId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to like videos",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if already liked
      const { data: existingLike } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .maybeSingle();

      if (existingLike) {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('video_id', videoId);
        
        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from('likes')
          .insert({ user_id: user.id, video_id: videoId });
        
        if (error) throw error;
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update like",
        variant: "destructive",
      });
    }
  };

  const toggleFollow = async (targetUserId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to follow users",
        variant: "destructive",
      });
      return;
    }

    if (user.id === targetUserId) {
      toast({
        title: "Invalid action",
        description: "You cannot follow yourself",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if already following
      const { data: existingFollow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .maybeSingle();

      if (existingFollow) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);
        
        if (error) throw error;
        
        toast({
          title: "Unfollowed",
          description: "You are no longer following this user",
        });
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: targetUserId });
        
        if (error) throw error;
        
        toast({
          title: "Following",
          description: "You are now following this user",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update follow status",
        variant: "destructive",
      });
    }
  };

  const toggleRevine = async (videoId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to repost",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if already revined
      const { data: existing } = await supabase
        .from('revines')
        .select('id')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .maybeSingle();

      if (existing) {
        // Undo revine
        const { error } = await supabase
          .from('revines')
          .delete()
          .eq('user_id', user.id)
          .eq('video_id', videoId);
        if (error) throw error;
        toast({ title: 'Repost removed' });
      } else {
        // Create revine record
        const { error } = await supabase
          .from('revines')
          .insert({ user_id: user.id, video_id: videoId });
        if (error) throw error;
        toast({ title: 'Reposted', description: 'Shared to your profile' });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to repost',
        variant: 'destructive',
      });
    }
  };

  const toggleSave = async (videoId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to save videos",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { data: existing } = await supabase
        .from('saved_videos')
        .select('id')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('saved_videos')
          .delete()
          .eq('user_id', user.id)
          .eq('video_id', videoId);
        if (error) throw error;
        toast({ title: 'Removed from saved' });
        return false;
      } else {
        const { error } = await supabase
          .from('saved_videos')
          .insert({ user_id: user.id, video_id: videoId });
        if (error) throw error;
        toast({ title: 'Saved', description: 'Added to your saved videos' });
        return true;
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update saved videos',
        variant: 'destructive',
      });
      return false;
    }
  };

  const postVideo = async (videoData: {
    title?: string;
    description?: string;
    video_url: string;
    thumbnail_url?: string;
    duration?: number;
    hashtags?: string[];
    audio_title?: string;
  }) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to post videos",
        variant: "destructive",
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('videos')
        .insert({
          user_id: user.id,
          ...videoData,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Video posted!",
        description: "Your video has been shared successfully",
      });

      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to post video",
        variant: "destructive",
      });
      return null;
    }
  };

  const recordShare = async (videoId: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to share videos',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { data: existing } = await supabase
        .from('shares')
        .select('id')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .maybeSingle();

      if (!existing) {
        const { error } = await supabase
          .from('shares')
          .insert({ user_id: user.id, video_id: videoId });
        if (error) throw error;
      }
      return true;
    } catch (error: unknown) {
      console.error('Share record failed', error);
      return false;
    }
  };

  const uploadVideo = async (file: File) => {
    if (!user) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload video",
        variant: "destructive",
      });
      return null;
    }
  };

  const uploadThumbnail = async (blob: Blob) => {
    if (!user) return null;

    try {
      const fileName = `${user.id}/thumbnails/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload thumbnail",
        variant: "destructive",
      });
      return null;
    }
  };

  const addComment = async (videoId: string, content: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to comment",
        variant: "destructive",
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          user_id: user.id,
          video_id: videoId,
          content,
        })
        .select(`
          *,
          profiles:user_id (
            username,
            display_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive",
      });
      return null;
    }
  };

  return {
    toggleLike,
    toggleFollow,
    toggleRevine,
    toggleSave,
    postVideo,
    uploadVideo,
    uploadThumbnail,
    addComment,
    recordShare,
  };
};