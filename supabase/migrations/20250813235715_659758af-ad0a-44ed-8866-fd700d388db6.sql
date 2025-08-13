-- Add missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS show_followers boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_following boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS banner_url text,
ADD COLUMN IF NOT EXISTS website_url text,
ADD COLUMN IF NOT EXISTS links jsonb;

-- Add missing column to videos table
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS revines_count integer DEFAULT 0;

-- Create revines table
CREATE TABLE IF NOT EXISTS public.revines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  video_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Enable RLS on revines table
ALTER TABLE public.revines ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for revines
CREATE POLICY "Users can create revines" 
ON public.revines 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own revines" 
ON public.revines 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view revines" 
ON public.revines 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Create saved_videos table
CREATE TABLE IF NOT EXISTS public.saved_videos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  video_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Enable RLS on saved_videos table
ALTER TABLE public.saved_videos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for saved_videos
CREATE POLICY "Users can save videos" 
ON public.saved_videos 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave videos" 
ON public.saved_videos 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their saved videos" 
ON public.saved_videos 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create collections table
CREATE TABLE IF NOT EXISTS public.collections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  is_private boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on collections table
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for collections
CREATE POLICY "Users can create collections" 
ON public.collections 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections" 
ON public.collections 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections" 
ON public.collections 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view collections based on privacy" 
ON public.collections 
FOR SELECT 
USING ((auth.uid() = user_id) OR (is_private = false));

-- Create collection_items table
CREATE TABLE IF NOT EXISTS public.collection_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id uuid NOT NULL,
  video_id uuid NOT NULL,
  added_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(collection_id, video_id)
);

-- Enable RLS on collection_items table
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for collection_items
CREATE POLICY "Users can add items to their collections" 
ON public.collection_items 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM collections 
  WHERE collections.id = collection_items.collection_id 
  AND collections.user_id = auth.uid()
));

CREATE POLICY "Users can remove items from their collections" 
ON public.collection_items 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM collections 
  WHERE collections.id = collection_items.collection_id 
  AND collections.user_id = auth.uid()
));

CREATE POLICY "Users can view collection items based on collection privacy" 
ON public.collection_items 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM collections 
  WHERE collections.id = collection_items.collection_id 
  AND (collections.user_id = auth.uid() OR collections.is_private = false)
));

-- Create trigger for collections updated_at
CREATE TRIGGER update_collections_updated_at
BEFORE UPDATE ON public.collections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for revines count updates
CREATE TRIGGER update_revines_count_trigger
AFTER INSERT OR DELETE ON public.revines
FOR EACH ROW
EXECUTE FUNCTION public.update_revines_count();