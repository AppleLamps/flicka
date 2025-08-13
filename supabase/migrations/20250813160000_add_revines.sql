-- Create revines (reposts) support

-- Add revines_count to videos
ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS revines_count INTEGER DEFAULT 0;

-- Create revines table
CREATE TABLE IF NOT EXISTS public.revines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Enable RLS
ALTER TABLE public.revines ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY IF NOT EXISTS "Users can view their own revines"
ON public.revines FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Video owners can view revines on their videos"
ON public.revines FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id = revines.video_id
    AND v.user_id = auth.uid()
  )
);

CREATE POLICY IF NOT EXISTS "Users can revine"
ON public.revines FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can unrevine"
ON public.revines FOR DELETE
USING (auth.uid() = user_id);

-- Maintain videos.revines_count via triggers
CREATE OR REPLACE FUNCTION public.update_revines_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos
    SET revines_count = COALESCE(revines_count, 0) + 1
    WHERE id = NEW.video_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.videos
    SET revines_count = GREATEST(COALESCE(revines_count, 0) - 1, 0)
    WHERE id = OLD.video_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_revines_count_trigger ON public.revines;
CREATE TRIGGER update_revines_count_trigger
  AFTER INSERT OR DELETE ON public.revines
  FOR EACH ROW EXECUTE FUNCTION public.update_revines_count();


