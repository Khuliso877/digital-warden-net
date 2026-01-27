import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NetworkEvent } from "@/hooks/useNetworkSimulation";

interface EventsTableProps {
  events: NetworkEvent[];
  maxEvents?: number;
}

const SUSPICIOUS_PORTS = [4444, 8080, 6667, 1337, 22, 23, 3389, 5900];
const SUSPICIOUS_IP_PREFIXES = ["185.143", "45.33", "103.224"];

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isSuspicious = (event: NetworkEvent): boolean => {
  if (SUSPICIOUS_PORTS.includes(event.destination_port)) return true;
  if (SUSPICIOUS_IP_PREFIXES.some(prefix => event.destination_ip.startsWith(prefix))) return true;
  if (event.bytes_out > 1000000) return true; // Large outbound transfer
  return false;
};

const EventsTable = ({ events, maxEvents = 50 }: EventsTableProps) => {
  const displayEvents = events.slice(0, maxEvents);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Recent Network Events</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Time</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Protocol</TableHead>
                <TableHead className="text-right">In</TableHead>
                <TableHead className="text-right">Out</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayEvents.map((event) => {
                const suspicious = isSuspicious(event);
                return (
                  <TableRow 
                    key={event.id} 
                    className={suspicious ? "bg-destructive/5" : ""}
                  >
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {event.source_ip}:{event.source_port}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <span className={suspicious ? "text-destructive font-medium" : ""}>
                        {event.destination_ip}:{event.destination_port}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {event.protocol}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-green-600 dark:text-green-400">
                      {formatBytes(event.bytes_in)}
                    </TableCell>
                    <TableCell className={`text-right text-xs ${event.bytes_out > 500000 ? "text-destructive font-medium" : "text-blue-600 dark:text-blue-400"}`}>
                      {formatBytes(event.bytes_out)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={suspicious ? "destructive" : "secondary"} 
                        className="text-xs"
                      >
                        {event.event_type.replace("_", " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default EventsTable;
