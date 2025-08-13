-- Fix RLS policies to make follows/likes private by default
-- Drop existing policies that are too permissive
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.likes;

-- Create more secure policies for follows
CREATE POLICY "Users can view their own follows" 
ON public.follows 
FOR SELECT 
USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users can view who follows them" 
ON public.follows 
FOR SELECT 
USING (auth.uid() = following_id);

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

-- Insert sample data
-- Create demo users profiles (these will be created when users sign up, but we can insert some manually)
INSERT INTO public.profiles (user_id, username, display_name, bio, avatar_url, followers_count, following_count, videos_count) VALUES
(gen_random_uuid(), 'demo_user1', 'Sarah Johnson', 'Content creator & dancer 💃 Follow for daily dance videos!', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400', 1250, 89, 15),
(gen_random_uuid(), 'demo_user2', 'Mike Chen', 'Comedy & lifestyle content creator 😄', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', 856, 234, 23),
(gen_random_uuid(), 'demo_user3', 'Alex Rivera', 'Artist & creative storyteller ✨', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400', 2340, 145, 31);

-- Get the user IDs we just created for sample videos
DO $$
DECLARE
    user1_id uuid;
    user2_id uuid; 
    user3_id uuid;
    video1_id uuid;
    video2_id uuid;
    video3_id uuid;
    video4_id uuid;
    video5_id uuid;
BEGIN
    -- Get demo user IDs
    SELECT user_id INTO user1_id FROM public.profiles WHERE username = 'demo_user1';
    SELECT user_id INTO user2_id FROM public.profiles WHERE username = 'demo_user2';
    SELECT user_id INTO user3_id FROM public.profiles WHERE username = 'demo_user3';
    
    -- Insert sample videos
    INSERT INTO public.videos (id, user_id, title, description, video_url, thumbnail_url, duration, likes_count, comments_count, views_count, hashtags) VALUES
    (gen_random_uuid(), user1_id, 'Morning Dance Routine', 'Starting the day with some positive energy! 💫', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400', 15, 234, 12, 1520, ARRAY['dance', 'morning', 'energy']),
    (gen_random_uuid(), user2_id, 'Funny Pet Compilation', 'My cats being absolutely ridiculous as usual 😂', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400', 12, 189, 8, 967, ARRAY['pets', 'funny', 'cats']),
    (gen_random_uuid(), user3_id, 'Time-lapse Art Creation', 'Creating magic with watercolors ✨', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400', 18, 456, 23, 2100, ARRAY['art', 'timelapse', 'watercolor']),
    (gen_random_uuid(), user1_id, 'Quick Smoothie Recipe', 'Healthy and delicious in under 2 minutes! 🥤', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400', 8, 312, 15, 1789, ARRAY['recipe', 'healthy', 'smoothie']),
    (gen_random_uuid(), user2_id, 'City Sunset Vibes', 'Golden hour hits different in the city 🌅', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400', 10, 278, 19, 1456, ARRAY['sunset', 'city', 'vibes']);
    
    -- Get video IDs for comments
    SELECT id INTO video1_id FROM public.videos WHERE title = 'Morning Dance Routine';
    SELECT id INTO video2_id FROM public.videos WHERE title = 'Funny Pet Compilation';
    SELECT id INTO video3_id FROM public.videos WHERE title = 'Time-lapse Art Creation';
    SELECT id INTO video4_id FROM public.videos WHERE title = 'Quick Smoothie Recipe';
    SELECT id INTO video5_id FROM public.videos WHERE title = 'City Sunset Vibes';
    
    -- Insert sample comments
    INSERT INTO public.comments (user_id, video_id, content) VALUES
    (user2_id, video1_id, 'Love the energy! Definitely trying this tomorrow 💪'),
    (user3_id, video1_id, 'Your moves are so smooth! Tutorial please? 🙏'),
    (user1_id, video2_id, 'Hahaha that last clip got me! 😂 Your cats are hilarious'),
    (user3_id, video2_id, 'This made my day! More pet content please! 🐱'),
    (user1_id, video3_id, 'Incredible talent! The colors blend so beautifully ✨'),
    (user2_id, video3_id, 'Mind blown! How long did this take to create?'),
    (user2_id, video4_id, 'Definitely making this for breakfast! Looks amazing 🥤'),
    (user3_id, video5_id, 'Beautiful shot! What camera did you use? 📸');
    
    -- Insert sample follows (some relationships between demo users)
    INSERT INTO public.follows (follower_id, following_id) VALUES
    (user1_id, user2_id),
    (user1_id, user3_id),
    (user2_id, user1_id),
    (user2_id, user3_id),
    (user3_id, user1_id);
    
    -- Insert sample likes
    INSERT INTO public.likes (user_id, video_id) VALUES
    (user2_id, video1_id),
    (user3_id, video1_id),
    (user1_id, video2_id),
    (user3_id, video2_id),
    (user1_id, video3_id),
    (user2_id, video3_id),
    (user2_id, video4_id),
    (user3_id, video4_id),
    (user1_id, video5_id),
    (user3_id, video5_id);
END $$;