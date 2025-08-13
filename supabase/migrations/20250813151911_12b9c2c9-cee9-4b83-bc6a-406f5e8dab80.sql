-- Fix RLS policies to make follows/likes private by default
-- Drop existing policies that are too permissive
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.likes;

-- Create more secure policies for follows
CREATE POLICY "Users can view their own follows" 
ON public.follows 
FOR SELECT 
USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- Create more secure policies for likes  
CREATE POLICY "Users can view their own likes" 
ON public.likes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Video owners can see who liked their videos" 
ON public.likes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.videos 
    WHERE videos.id = likes.video_id 
    AND videos.user_id = auth.uid()
  )
);

-- Add privacy settings to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_followers BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_following BOOLEAN DEFAULT true;