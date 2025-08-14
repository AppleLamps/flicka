-- Allow anonymous viewing of public content
-- This migration fixes RLS policies to enable anonymous browsing

-- Fix profiles table policy to allow anonymous viewing of public profiles
DROP POLICY IF EXISTS "Profiles are viewable based on privacy settings" ON public.profiles;

CREATE POLICY "Public profiles viewable by everyone, private profiles require auth" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can always view their own profile (when authenticated)
  auth.uid() = user_id 
  OR 
  -- Public profiles are viewable by everyone (including anonymous users)
  is_private = false
  OR
  -- Private profiles are only viewable by followers or the owner (when authenticated)
  (is_private = true AND auth.uid() IS NOT NULL AND (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM public.follows 
      WHERE follower_id = auth.uid() 
      AND following_id = user_id
    )
  ))
);

-- Fix videos table policy to allow anonymous viewing
-- First check if there's an existing policy and drop it
DROP POLICY IF EXISTS "Videos are viewable by everyone" ON public.videos;
DROP POLICY IF EXISTS "Videos follow profile privacy" ON public.videos;
DROP POLICY IF EXISTS "Videos viewable based on privacy" ON public.videos;

CREATE POLICY "Public videos viewable by everyone" 
ON public.videos 
FOR SELECT 
USING (
  -- Own videos (when authenticated)
  user_id = auth.uid()
  OR 
  -- Videos from public profiles are viewable by everyone
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = videos.user_id 
    AND profiles.is_private = false
  )
  OR
  -- Videos from private profiles only if following (when authenticated)
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles 
    JOIN public.follows ON profiles.user_id = follows.following_id
    WHERE profiles.user_id = videos.user_id 
    AND profiles.is_private = true
    AND follows.follower_id = auth.uid()
  ))
);

-- Fix comments table policy to allow anonymous viewing
DROP POLICY IF EXISTS "Comments are viewable by authenticated users" ON public.comments;
DROP POLICY IF EXISTS "Comments follow video privacy" ON public.comments;

CREATE POLICY "Comments viewable based on video privacy" 
ON public.comments 
FOR SELECT 
USING (
  -- Comments on videos from public profiles are viewable by everyone
  EXISTS (
    SELECT 1 FROM public.videos v
    JOIN public.profiles p ON v.user_id = p.user_id
    WHERE v.id = comments.video_id 
    AND p.is_private = false
  )
  OR
  -- Comments on own videos (when authenticated)
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.videos 
    WHERE id = comments.video_id 
    AND user_id = auth.uid()
  ))
  OR
  -- Comments on videos from followed private profiles (when authenticated)
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.videos v
    JOIN public.profiles p ON v.user_id = p.user_id
    JOIN public.follows f ON p.user_id = f.following_id
    WHERE v.id = comments.video_id 
    AND p.is_private = true
    AND f.follower_id = auth.uid()
  ))
);

-- Update likes policy to allow viewing like counts (not who liked)
DROP POLICY IF EXISTS "Users can view their own likes" ON public.likes;
DROP POLICY IF EXISTS "Video owners can see who liked their videos" ON public.likes;

-- Allow users to see their own likes
CREATE POLICY "Users can view their own likes" 
ON public.likes 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Allow video owners to see who liked their videos  
CREATE POLICY "Video owners can see who liked their videos" 
ON public.likes 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.videos 
    WHERE videos.id = likes.video_id 
    AND videos.user_id = auth.uid()
  )
);

-- Add comment for future reference
COMMENT ON POLICY "Public profiles viewable by everyone, private profiles require auth" ON public.profiles IS 
'Allows anonymous users to view public profiles while protecting private profiles';

COMMENT ON POLICY "Public videos viewable by everyone" ON public.videos IS 
'Allows anonymous users to view videos from public profiles';

COMMENT ON POLICY "Comments viewable based on video privacy" ON public.comments IS 
'Allows anonymous users to view comments on videos from public profiles';
