-- Create incident_reports table
CREATE TABLE public.incident_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  incident_type TEXT NOT NULL CHECK (incident_type IN ('cyberbullying', 'harassment', 'threats', 'doxxing', 'hate_speech', 'sexual_harassment', 'other')),
  description TEXT NOT NULL,
  platform TEXT,
  incident_date TIMESTAMP WITH TIME ZONE,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewing', 'resolved', 'closed')),
  evidence_files TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
ON public.incident_reports
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own reports
CREATE POLICY "Users can insert own reports"
ON public.incident_reports
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own reports
CREATE POLICY "Users can update own reports"
ON public.incident_reports
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_incident_reports_updated_at
BEFORE UPDATE ON public.incident_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create storage bucket for incident evidence
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'incident-evidence',
  'incident-evidence',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'video/mp4', 'video/quicktime']
);

-- Storage policies for incident evidence
CREATE POLICY "Users can upload their own evidence"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'incident-evidence' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own evidence"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'incident-evidence' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own evidence"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'incident-evidence' AND
  auth.uid()::text = (storage.foldername(name))[1]
);