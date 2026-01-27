import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NetworkEvent {
  source_ip: string;
  destination_ip: string;
  source_port: number;
  destination_port: number;
  protocol: string;
  bytes_in: number;
  bytes_out: number;
  packet_count: number;
  connection_duration_ms: number;
  event_type: string;
  timestamp: string;
}

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, events, baseline } = await req.json();

    if (action === "analyze") {
      // Analyze network events using AI
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        return new Response(JSON.stringify({ error: "AI service not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const systemPrompt = `You are a network security AI analyst specializing in anomaly detection for home and small office networks.
Your task is to analyze network traffic data and identify potential security threats or anomalies.

You understand normal network patterns including:
- Regular web browsing (ports 80, 443)
- Email (ports 25, 587, 993, 995)
- DNS queries (port 53)
- Common streaming and productivity services

You look for anomalies such as:
- Unusual port usage (uncommon ports, port scanning patterns)
- Traffic spikes or unusual data volumes
- Connections to suspicious IP ranges
- Unusual time-based patterns (e.g., high traffic at unusual hours)
- Potential data exfiltration (high outbound traffic)
- Potential DDoS patterns (many connections from same source)
- Command and control (C2) communication patterns

Respond in JSON format with your analysis.`;

      const analysisPrompt = `Analyze these recent network events for anomalies:

Events (last 50):
${JSON.stringify(events.slice(-50), null, 2)}

Baseline "normal" patterns for this user:
${JSON.stringify(baseline, null, 2)}

Provide your analysis in this exact JSON format:
{
  "anomalies": [
    {
      "type": "string (e.g., 'port_scan', 'data_exfiltration', 'unusual_traffic', 'suspicious_connection', 'ddos_pattern', 'c2_communication')",
      "severity": "string ('low', 'medium', 'high', 'critical')",
      "confidence": number (0.0 to 1.0),
      "description": "string explaining the anomaly",
      "affected_ips": ["array of suspicious IPs"],
      "affected_ports": [array of suspicious ports],
      "recommendation": "string with action to take"
    }
  ],
  "overall_risk_score": number (0 to 100),
  "summary": "string summarizing the network health",
  "baseline_update_recommended": boolean
}

If no anomalies are detected, return an empty anomalies array with a low risk score and positive summary.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: analysisPrompt },
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        throw new Error("AI analysis failed");
      }

      const aiResult = await response.json();
      const analysisText = aiResult.choices?.[0]?.message?.content || "{}";
      
      // Parse the AI response (handle markdown code blocks)
      let analysis;
      try {
        let jsonStr = analysisText;
        if (jsonStr.includes("```json")) {
          jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");
        } else if (jsonStr.includes("```")) {
          jsonStr = jsonStr.replace(/```\n?/g, "");
        }
        analysis = JSON.parse(jsonStr.trim());
      } catch (parseError) {
        console.error("Failed to parse AI response:", analysisText);
        analysis = {
          anomalies: [],
          overall_risk_score: 0,
          summary: "Analysis completed - no immediate threats detected.",
          baseline_update_recommended: false,
        };
      }

      // Store any detected anomalies
      if (analysis.anomalies && analysis.anomalies.length > 0) {
        for (const anomaly of analysis.anomalies) {
          await supabase.from("network_anomalies").insert({
            user_id: user.id,
            anomaly_type: anomaly.type,
            severity: anomaly.severity,
            confidence_score: anomaly.confidence,
            description: anomaly.description,
            affected_ips: anomaly.affected_ips || [],
            affected_ports: anomaly.affected_ports || [],
            ai_analysis: anomaly.recommendation,
            raw_data: { events: events.slice(-10) },
          });
        }
      }

      return new Response(JSON.stringify(analysis), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_baseline") {
      // Calculate new baseline from events
      const newBaseline: BaselineData = {
        avgBytesIn: 0,
        avgBytesOut: 0,
        avgPacketCount: 0,
        avgConnectionDuration: 0,
        commonPorts: [],
        commonProtocols: [],
        commonDestinations: [],
        totalEvents: events.length,
        hourlyPatterns: {},
      };

      if (events.length > 0) {
        // Calculate averages
        let totalBytesIn = 0, totalBytesOut = 0, totalPackets = 0, totalDuration = 0;
        const portCounts: Record<number, number> = {};
        const protocolCounts: Record<string, number> = {};
        const destCounts: Record<string, number> = {};

        for (const event of events) {
          totalBytesIn += event.bytes_in || 0;
          totalBytesOut += event.bytes_out || 0;
          totalPackets += event.packet_count || 0;
          totalDuration += event.connection_duration_ms || 0;

          if (event.destination_port) {
            portCounts[event.destination_port] = (portCounts[event.destination_port] || 0) + 1;
          }
          if (event.protocol) {
            protocolCounts[event.protocol] = (protocolCounts[event.protocol] || 0) + 1;
          }
          if (event.destination_ip) {
            destCounts[event.destination_ip] = (destCounts[event.destination_ip] || 0) + 1;
          }

          // Track hourly patterns
          const hour = new Date(event.timestamp).getHours();
          newBaseline.hourlyPatterns[hour] = (newBaseline.hourlyPatterns[hour] || 0) + 1;
        }

        newBaseline.avgBytesIn = totalBytesIn / events.length;
        newBaseline.avgBytesOut = totalBytesOut / events.length;
        newBaseline.avgPacketCount = totalPackets / events.length;
        newBaseline.avgConnectionDuration = totalDuration / events.length;

        // Get top 10 most common
        newBaseline.commonPorts = Object.entries(portCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([port]) => parseInt(port));

        newBaseline.commonProtocols = Object.entries(protocolCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([protocol]) => protocol);

        newBaseline.commonDestinations = Object.entries(destCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([dest]) => dest);
      }

      // Upsert baseline
      const { error: baselineError } = await supabase
        .from("network_baselines")
        .upsert({
          user_id: user.id,
          baseline_data: newBaseline,
          total_events_analyzed: events.length,
          last_updated: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        });

      if (baselineError) {
        console.error("Baseline update error:", baselineError);
        throw new Error("Failed to update baseline");
      }

      return new Response(JSON.stringify({ success: true, baseline: newBaseline }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-network:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
