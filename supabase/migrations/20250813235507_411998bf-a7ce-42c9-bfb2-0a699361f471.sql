-- Add missing columns to existing tables
ALTER TABLE public.profiles 
ADD COLUMN banner_url TEXT,
ADD COLUMN website_url TEXT,
ADD COLUMN links JSONB;

ALTER TABLE public.videos 
ADD COLUMN revines_count INTEGER DEFAULT 0;

-- Create revines table for video reposts
CREATE TABLE public.revines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Enable RLS on revines
ALTER TABLE public.revines ENABLE ROW LEVEL SECURITY;

-- RLS policies for revines
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
CREATE TABLE public.saved_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Enable RLS on saved_videos
ALTER TABLE public.saved_videos ENABLE ROW LEVEL SECURITY;

-- RLS policies for saved_videos
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
CREATE TABLE public.collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on collections
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- RLS policies for collections
CREATE POLICY "Users can create collections" 
ON public.collections 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view collections based on privacy" 
ON public.collections 
FOR SELECT 
USING (auth.uid() = user_id OR is_private = false);

CREATE POLICY "Users can update their own collections" 
ON public.collections 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections" 
ON public.collections 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create collection_items table
CREATE TABLE public.collection_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL,
  video_id UUID NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(collection_id, video_id)
);

-- Enable RLS on collection_items
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for collection_items
CREATE POLICY "Users can add items to their collections" 
ON public.collection_items 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.collections 
    WHERE id = collection_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can view collection items based on collection privacy" 
ON public.collection_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.collections 
    WHERE id = collection_id 
    AND (user_id = auth.uid() OR is_private = false)
  )
);

CREATE POLICY "Users can remove items from their collections" 
ON public.collection_items 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.collections 
    WHERE id = collection_id AND user_id = auth.uid()
  )
);

-- Create function to update revines count
CREATE OR REPLACE FUNCTION public.update_revines_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos 
    SET revines_count = revines_count + 1 
    WHERE id = NEW.video_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.videos 
    SET revines_count = revines_count - 1 
    WHERE id = OLD.video_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Create trigger for revines count
CREATE TRIGGER update_revines_count_trigger
  AFTER INSERT OR DELETE ON public.revines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_revines_count();

-- Add trigger for collections updated_at
CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();