import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NetworkEvent } from "@/hooks/useNetworkSimulation";

interface NetworkTimelineProps {
  events: NetworkEvent[];
  anomalyScore: number;
}

const NetworkTimeline = ({ events, anomalyScore }: NetworkTimelineProps) => {
  const chartData = useMemo(() => {
    // Group events by 10-second intervals
    const grouped: Record<string, { time: string; bytesIn: number; bytesOut: number; count: number }> = {};
    
    events.forEach(event => {
      const date = new Date(event.timestamp);
      const roundedSeconds = Math.floor(date.getSeconds() / 10) * 10;
      date.setSeconds(roundedSeconds, 0);
      const key = date.toISOString();
      
      if (!grouped[key]) {
        grouped[key] = {
          time: date.toLocaleTimeString(),
          bytesIn: 0,
          bytesOut: 0,
          count: 0,
        };
      }
      
      grouped[key].bytesIn += event.bytes_in;
      grouped[key].bytesOut += event.bytes_out;
      grouped[key].count++;
    });

    return Object.values(grouped)
      .sort((a, b) => a.time.localeCompare(b.time))
      .slice(-30);
  }, [events]);

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Network Traffic Timeline</CardTitle>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-muted-foreground">Inbound</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <span className="text-muted-foreground">Outbound</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="bytesInGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="bytesOutGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 12 }} 
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }} 
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatBytes(value)}
                className="text-muted-foreground"
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (!active || !payload) return null;
                  return (
                    <div className="bg-popover border rounded-lg p-3 shadow-lg">
                      <p className="font-medium mb-1">{label}</p>
                      {payload.map((entry, index) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                          {entry.name === "bytesIn" ? "Inbound" : "Outbound"}: {formatBytes(entry.value as number)}
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="bytesIn"
                stroke="hsl(var(--primary))"
                fill="url(#bytesInGradient)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="bytesOut"
                stroke="hsl(var(--destructive))"
                fill="url(#bytesOutGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default NetworkTimeline;
