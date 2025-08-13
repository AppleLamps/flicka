-- Update profiles table RLS policy to respect privacy settings
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Create new policy that respects privacy settings and requires authentication
CREATE POLICY "Profiles are viewable based on privacy settings" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can always view their own profile
  auth.uid() = user_id 
  OR 
  -- Public profiles are viewable by authenticated users only
  (is_private = false AND auth.uid() IS NOT NULL)
  OR
  -- Private profiles are only viewable by followers or the owner
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

-- Update comments table RLS policy to require authentication
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;

CREATE POLICY "Comments are viewable by authenticated users" 
ON public.comments 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Add policy to respect video privacy (comments inherit video privacy)
CREATE POLICY "Comments follow video privacy" 
ON public.comments 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND 
  EXISTS (
    SELECT 1 FROM public.videos v
    JOIN public.profiles p ON v.user_id = p.user_id
    WHERE v.id = video_id 
    AND (
      -- Own videos
      v.user_id = auth.uid()
      OR 
      -- Public profile videos
      p.is_private = false
      OR
      -- Private profile videos only if following
      (p.is_private = true AND EXISTS (
        SELECT 1 FROM public.follows 
        WHERE follower_id = auth.uid() 
        AND following_id = v.user_id
      ))
    )
  )
);