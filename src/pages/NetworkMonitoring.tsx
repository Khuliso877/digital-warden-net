import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft, Play, Pause, RefreshCw, Brain, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNetworkSimulation } from "@/hooks/useNetworkSimulation";
import NetworkStats from "@/components/network/NetworkStats";
import NetworkTimeline from "@/components/network/NetworkTimeline";
import AnomalyAlerts, { type Anomaly } from "@/components/network/AnomalyAlerts";
import EventsTable from "@/components/network/EventsTable";
import type { User } from "@supabase/supabase-js";

interface BaselineData {
  avgBytesIn: number;
  avgBytesOut: number;
  avgPacketCount: number;
  avgConnectionDuration: number;
  commonPorts: number[];
  commonProtocols: string[];
  commonDestinations: string[];
  totalEvents: number;
  hourlyPatterns: Record<number, number>;
}

const NetworkMonitoring = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [riskScore, setRiskScore] = useState(0);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [baseline, setBaseline] = useState<BaselineData | null>(null);
  const [analysisCount, setAnalysisCount] = useState(0);
  const navigate = useNavigate();

  const { events, stats, clearEvents } = useNetworkSimulation(isMonitoring, 0.08);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          navigate("/auth");
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Load existing baseline and anomalies
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      // Load baseline
      const { data: baselineData } = await supabase
        .from("network_baselines")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (baselineData?.baseline_data) {
        setBaseline(baselineData.baseline_data as unknown as BaselineData);
      }

      // Load recent anomalies
      const { data: anomalyData } = await supabase
        .from("network_anomalies")
        .select("*")
        .eq("user_id", user.id)
        .order("detected_at", { ascending: false })
        .limit(20);

      if (anomalyData) {
        setAnomalies(anomalyData.map(a => ({
          id: a.id,
          type: a.anomaly_type,
          severity: a.severity as Anomaly["severity"],
          confidence: Number(a.confidence_score),
          description: a.description,
          affected_ips: a.affected_ips || [],
          affected_ports: a.affected_ports || [],
          recommendation: a.ai_analysis || "Review and investigate this activity.",
          detected_at: a.detected_at,
          status: a.status as Anomaly["status"],
        })));
      }
    };

    loadData();
  }, [user]);

  const runAIAnalysis = useCallback(async () => {
    if (!user || events.length < 10) {
      toast.error("Need at least 10 network events to analyze");
      return;
    }

    setIsAnalyzing(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-network`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: "analyze",
            events: events.map(e => ({
              source_ip: e.source_ip,
              destination_ip: e.destination_ip,
              source_port: e.source_port,
              destination_port: e.destination_port,
              protocol: e.protocol,
              bytes_in: e.bytes_in,
              bytes_out: e.bytes_out,
              packet_count: e.packet_count,
              connection_duration_ms: e.connection_duration_ms,
              event_type: e.event_type,
              timestamp: e.timestamp,
            })),
            baseline: baseline || {},
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 429) {
          toast.error("Rate limit exceeded. Please try again later.");
          return;
        }
        if (response.status === 402) {
          toast.error("AI credits exhausted. Please add credits.");
          return;
        }
        throw new Error(error.error || "Analysis failed");
      }

      const analysis = await response.json();
      
      setRiskScore(analysis.overall_risk_score || 0);
      setAnalysisCount(prev => prev + 1);

      if (analysis.anomalies && analysis.anomalies.length > 0) {
        const newAnomalies: Anomaly[] = analysis.anomalies.map((a: any) => ({
          id: crypto.randomUUID(),
          type: a.type,
          severity: a.severity,
          confidence: a.confidence,
          description: a.description,
          affected_ips: a.affected_ips || [],
          affected_ports: a.affected_ports || [],
          recommendation: a.recommendation,
          detected_at: new Date().toISOString(),
          status: "new" as const,
        }));

        setAnomalies(prev => [...newAnomalies, ...prev]);
        toast.warning(`Detected ${newAnomalies.length} potential anomal${newAnomalies.length > 1 ? "ies" : "y"}!`);
      } else {
        toast.success(analysis.summary || "No threats detected");
      }

      // Update baseline if recommended
      if (analysis.baseline_update_recommended && events.length >= 50) {
        await updateBaseline();
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze network traffic");
    } finally {
      setIsAnalyzing(false);
    }
  }, [user, events, baseline]);

  const updateBaseline = useCallback(async () => {
    if (!user || events.length < 20) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-network`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: "update_baseline",
            events: events.map(e => ({
              bytes_in: e.bytes_in,
              bytes_out: e.bytes_out,
              packet_count: e.packet_count,
              connection_duration_ms: e.connection_duration_ms,
              destination_port: e.destination_port,
              destination_ip: e.destination_ip,
              protocol: e.protocol,
              timestamp: e.timestamp,
            })),
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        setBaseline(result.baseline);
        toast.success("Network baseline updated");
      }
    } catch (error) {
      console.error("Baseline update error:", error);
    }
  }, [user, events]);

  const handleDismissAnomaly = async (id: string) => {
    await supabase
      .from("network_anomalies")
      .update({ status: "dismissed" })
      .eq("id", id);

    setAnomalies(prev => 
      prev.map(a => a.id === id ? { ...a, status: "dismissed" as const } : a)
    );
    toast.success("Alert dismissed");
  };

  const handleResolveAnomaly = async (id: string) => {
    await supabase
      .from("network_anomalies")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", id);

    setAnomalies(prev => 
      prev.map(a => a.id === id ? { ...a, status: "resolved" as const } : a)
    );
    toast.success("Alert resolved");
  };

  const handleReset = () => {
    clearEvents();
    setRiskScore(0);
    setAnalysisCount(0);
    toast.info("Monitoring data cleared");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-primary" />
                <span className="text-lg font-bold">Network Monitoring</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={isMonitoring ? "destructive" : "default"}
                onClick={() => setIsMonitoring(!isMonitoring)}
              >
                {isMonitoring ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Stop
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={runAIAnalysis}
                disabled={isAnalyzing || events.length < 10}
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Brain className="w-4 h-4 mr-2" />
                )}
                Analyze
              </Button>
              <Button variant="ghost" size="icon" onClick={handleReset}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <NetworkStats 
          stats={stats} 
          riskScore={riskScore} 
          isMonitoring={isMonitoring} 
        />

        <NetworkTimeline events={events} anomalyScore={riskScore} />

        <div className="grid gap-6 lg:grid-cols-2">
          <AnomalyAlerts 
            anomalies={anomalies}
            onDismiss={handleDismissAnomaly}
            onResolve={handleResolveAnomaly}
          />
          <EventsTable events={events} />
        </div>

        {analysisCount > 0 && (
          <div className="text-center text-sm text-muted-foreground">
            AI analyses performed this session: {analysisCount}
          </div>
        )}
      </main>
    </div>
  );
};

export default NetworkMonitoring;
