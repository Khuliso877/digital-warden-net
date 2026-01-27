-- Create network events table to store simulated/captured network traffic
CREATE TABLE public.network_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source_ip TEXT NOT NULL,
  destination_ip TEXT NOT NULL,
  source_port INTEGER,
  destination_port INTEGER,
  protocol TEXT NOT NULL DEFAULT 'TCP',
  bytes_in INTEGER DEFAULT 0,
  bytes_out INTEGER DEFAULT 0,
  packet_count INTEGER DEFAULT 1,
  connection_duration_ms INTEGER DEFAULT 0,
  event_type TEXT NOT NULL DEFAULT 'connection',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create anomaly alerts table for ML-detected anomalies
CREATE TABLE public.network_anomalies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  anomaly_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  confidence_score NUMERIC(5,4) NOT NULL DEFAULT 0.0,
  description TEXT NOT NULL,
  affected_ips TEXT[] DEFAULT '{}',
  affected_ports INTEGER[] DEFAULT '{}',
  raw_data JSONB DEFAULT '{}',
  ai_analysis TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create network baseline table to store learned "normal" patterns
CREATE TABLE public.network_baselines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  baseline_data JSONB NOT NULL DEFAULT '{}',
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  learning_period_hours INTEGER DEFAULT 24,
  total_events_analyzed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.network_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_baselines ENABLE ROW LEVEL SECURITY;

-- RLS policies for network_events
CREATE POLICY "Users can view their own network events" 
ON public.network_events 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own network events" 
ON public.network_events 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own network events" 
ON public.network_events 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for network_anomalies
CREATE POLICY "Users can view their own anomalies" 
ON public.network_anomalies 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own anomalies" 
ON public.network_anomalies 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own anomalies" 
ON public.network_anomalies 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own anomalies" 
ON public.network_anomalies 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for network_baselines
CREATE POLICY "Users can view their own baseline" 
ON public.network_baselines 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own baseline" 
ON public.network_baselines 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own baseline" 
ON public.network_baselines 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add updated_at trigger for anomalies
CREATE TRIGGER update_network_anomalies_updated_at
BEFORE UPDATE ON public.network_anomalies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create indexes for performance
CREATE INDEX idx_network_events_user_timestamp ON public.network_events(user_id, timestamp DESC);
CREATE INDEX idx_network_events_source_ip ON public.network_events(source_ip);
CREATE INDEX idx_network_anomalies_user_status ON public.network_anomalies(user_id, status);
CREATE INDEX idx_network_anomalies_severity ON public.network_anomalies(severity);