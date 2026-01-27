import { Activity, ArrowDownToLine, ArrowUpFromLine, Globe, Wifi, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface NetworkStatsProps {
  stats: {
    totalEvents: number;
    bytesIn: number;
    bytesOut: number;
    uniqueDestinationsCount: number;
    protocolCounts: Record<string, number>;
  };
  riskScore: number;
  isMonitoring: boolean;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const getRiskColor = (score: number): string => {
  if (score < 25) return "text-green-500";
  if (score < 50) return "text-yellow-500";
  if (score < 75) return "text-orange-500";
  return "text-red-500";
};

const getRiskLabel = (score: number): string => {
  if (score < 25) return "Low Risk";
  if (score < 50) return "Moderate";
  if (score < 75) return "Elevated";
  return "High Risk";
};

const NetworkStats = ({ stats, riskScore, isMonitoring }: NetworkStatsProps) => {
  const statCards = [
    {
      title: "Total Events",
      value: stats.totalEvents.toLocaleString(),
      icon: Activity,
      color: "text-primary",
    },
    {
      title: "Data Received",
      value: formatBytes(stats.bytesIn),
      icon: ArrowDownToLine,
      color: "text-green-500",
    },
    {
      title: "Data Sent",
      value: formatBytes(stats.bytesOut),
      icon: ArrowUpFromLine,
      color: "text-blue-500",
    },
    {
      title: "Unique Destinations",
      value: stats.uniqueDestinationsCount.toString(),
      icon: Globe,
      color: "text-purple-500",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
              <stat.icon className={`w-8 h-8 ${stat.color} opacity-80`} />
            </div>
          </CardContent>
        </Card>
      ))}
      
      <Card className="relative overflow-hidden">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm text-muted-foreground">Risk Score</p>
              <p className={`text-2xl font-bold ${getRiskColor(riskScore)}`}>
                {riskScore}%
              </p>
            </div>
            <div className="flex flex-col items-end">
              <Zap className={`w-8 h-8 ${getRiskColor(riskScore)} opacity-80`} />
              <span className={`text-xs ${getRiskColor(riskScore)}`}>
                {getRiskLabel(riskScore)}
              </span>
            </div>
          </div>
          <Progress 
            value={riskScore} 
            className="h-2"
          />
          {isMonitoring && (
            <div className="absolute top-2 right-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NetworkStats;
