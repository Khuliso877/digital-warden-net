-- Add notification preference columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email_notifications boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS threat_alerts_notifications boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS weekly_digest boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS marketing_emails boolean DEFAULT false;