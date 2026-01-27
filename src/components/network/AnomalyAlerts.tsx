import { AlertTriangle, Shield, AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface Anomaly {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  description: string;
  affected_ips: string[];
  affected_ports: number[];
  recommendation: string;
  detected_at: string;
  status: "new" | "investigating" | "resolved" | "dismissed";
}

interface AnomalyAlertsProps {
  anomalies: Anomaly[];
  onDismiss: (id: string) => void;
  onResolve: (id: string) => void;
}

const severityConfig = {
  low: { 
    icon: AlertCircle, 
    color: "text-blue-500", 
    bg: "bg-blue-500/10", 
    border: "border-blue-500/30",
    badge: "bg-blue-500/20 text-blue-700 dark:text-blue-300"
  },
  medium: { 
    icon: AlertTriangle, 
    color: "text-yellow-500", 
    bg: "bg-yellow-500/10", 
    border: "border-yellow-500/30",
    badge: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300"
  },
  high: { 
    icon: AlertTriangle, 
    color: "text-orange-500", 
    bg: "bg-orange-500/10", 
    border: "border-orange-500/30",
    badge: "bg-orange-500/20 text-orange-700 dark:text-orange-300"
  },
  critical: { 
    icon: XCircle, 
    color: "text-red-500", 
    bg: "bg-red-500/10", 
    border: "border-red-500/30",
    badge: "bg-red-500/20 text-red-700 dark:text-red-300"
  },
};

const typeLabels: Record<string, string> = {
  port_scan: "Port Scanning",
  data_exfiltration: "Data Exfiltration",
  unusual_traffic: "Unusual Traffic",
  suspicious_connection: "Suspicious Connection",
  ddos_pattern: "DDoS Pattern",
  c2_communication: "C2 Communication",
};

const AnomalyAlerts = ({ anomalies, onDismiss, onResolve }: AnomalyAlertsProps) => {
  const activeAnomalies = anomalies.filter(a => a.status !== "resolved" && a.status !== "dismissed");

  if (activeAnomalies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-500" />
            Anomaly Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
            <p className="font-medium">No Active Threats</p>
            <p className="text-sm text-muted-foreground">Your network appears to be operating normally</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Anomaly Alerts
          </CardTitle>
          <Badge variant="destructive">{activeAnomalies.length} Active</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {activeAnomalies.map((anomaly) => {
              const config = severityConfig[anomaly.severity];
              const Icon = config.icon;
              
              return (
                <div 
                  key={anomaly.id} 
                  className={`p-4 rounded-lg border ${config.bg} ${config.border}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${config.color}`} />
                      <span className="font-medium">
                        {typeLabels[anomaly.type] || anomaly.type}
                      </span>
                    </div>
                    <Badge className={config.badge}>
                      {anomaly.severity.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2">
                    {anomaly.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-2">
                    {anomaly.affected_ips.slice(0, 3).map((ip, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {ip}
                      </Badge>
                    ))}
                    {anomaly.affected_ports.slice(0, 3).map((port, i) => (
                      <Badge key={`port-${i}`} variant="outline" className="text-xs">
                        Port {port}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(anomaly.detected_at).toLocaleString()}
                    <span className="mx-2">•</span>
                    Confidence: {(anomaly.confidence * 100).toFixed(0)}%
                  </div>
                  
                  <div className="p-2 bg-background/50 rounded text-xs mb-3">
                    <strong>Recommendation:</strong> {anomaly.recommendation}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onDismiss(anomaly.id)}
                    >
                      Dismiss
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => onResolve(anomaly.id)}
                    >
                      Mark Resolved
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default AnomalyAlerts;
