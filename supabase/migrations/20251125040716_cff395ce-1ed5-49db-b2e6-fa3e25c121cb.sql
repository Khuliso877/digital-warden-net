-- Create safety_filters table for user customization
CREATE TABLE public.safety_filters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_keywords TEXT[] DEFAULT '{}',
  threat_sensitivity TEXT NOT NULL DEFAULT 'medium' CHECK (threat_sensitivity IN ('low', 'medium', 'high')),
  auto_block_enabled BOOLEAN DEFAULT true,
  safe_browsing_enabled BOOLEAN DEFAULT true,
  content_filtering_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.safety_filters ENABLE ROW LEVEL SECURITY;

-- Users can view their own filters
CREATE POLICY "Users can view own filters"
ON public.safety_filters
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own filters
CREATE POLICY "Users can insert own filters"
ON public.safety_filters
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own filters
CREATE POLICY "Users can update own filters"
ON public.safety_filters
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_safety_filters_updated_at
BEFORE UPDATE ON public.safety_filters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();