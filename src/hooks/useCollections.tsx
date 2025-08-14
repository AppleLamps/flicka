import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Collection {
  id: string;
  name: string;
  description?: string;
  is_private: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export const useCollections = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const createCollection = async (data: { name: string; description?: string; is_private?: boolean }) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to create collections",
        variant: "destructive",
      });
      return null;
    }

    try {
      const { data: collection, error } = await supabase
        .from('collections')
        .insert({
          user_id: user.id,
          name: data.name,
          description: data.description,
          is_private: data.is_private ?? false,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Collection created",
        description: `Created "${data.name}" collection`,
      });

      return collection;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create collection",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateCollection = async (id: string, data: { name?: string; description?: string; is_private?: boolean }) => {
    if (!user) return null;

    try {
      const { data: collection, error } = await supabase
        .from('collections')
        .update(data)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Collection updated",
        description: "Your changes have been saved",
      });

      return collection;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update collection",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteCollection = async (id: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('collections')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Collection deleted",
        description: "Collection has been removed",
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete collection",
        variant: "destructive",
      });
      return false;
    }
  };

  const addVideoToCollection = async (collectionId: string, videoId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('collection_items')
        .insert({
          collection_id: collectionId,
          video_id: videoId,
        });

      if (error) throw error;

      toast({
        title: "Added to collection",
        description: "Video saved to collection",
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add video to collection",
        variant: "destructive",
      });
      return false;
    }
  };

  const removeVideoFromCollection = async (collectionId: string, videoId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('collection_items')
        .delete()
        .eq('collection_id', collectionId)
        .eq('video_id', videoId);

      if (error) throw error;

      toast({
        title: "Removed from collection",
        description: "Video removed from collection",
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove video from collection",
        variant: "destructive",
      });
      return false;
    }
  };

  const getUserCollections = async (userId?: string) => {
    try {
      const targetUserId = userId || user?.id;
      if (!targetUserId) return [];

      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching collections:', error);
      return [];
    }
  };

  const getCollectionVideos = async (collectionId: string) => {
    try {
      const { data: items, error } = await supabase
        .from('collection_items')
        .select('video_id')
        .eq('collection_id', collectionId)
        .order('added_at', { ascending: false });

      if (error) throw error;
      if (!items || items.length === 0) return [];

      const videoIds = items.map(item => item.video_id);
      
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
        .in('id', videoIds);

      if (videosError) throw videosError;
      return videos || [];
    } catch (error: any) {
      console.error('Error fetching collection videos:', error);
      return [];
    }
  };

  return {
    createCollection,
    updateCollection,
    deleteCollection,
    addVideoToCollection,
    removeVideoFromCollection,
    getUserCollections,
    getCollectionVideos,
  };
};