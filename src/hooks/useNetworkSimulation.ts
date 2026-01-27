import { useState, useEffect, useCallback, useRef } from "react";

export interface NetworkEvent {
  id: string;
  timestamp: string;
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
}

// Common legitimate services
const COMMON_DESTINATIONS = [
  { ip: "142.250.180.14", name: "Google", ports: [443, 80] },
  { ip: "157.240.1.35", name: "Facebook", ports: [443] },
  { ip: "52.96.165.130", name: "Microsoft 365", ports: [443] },
  { ip: "54.239.28.85", name: "AWS", ports: [443] },
  { ip: "151.101.1.140", name: "Reddit", ports: [443] },
  { ip: "104.16.249.249", name: "Cloudflare", ports: [443, 80] },
  { ip: "192.168.1.1", name: "Router", ports: [53, 80] },
  { ip: "8.8.8.8", name: "Google DNS", ports: [53] },
  { ip: "1.1.1.1", name: "Cloudflare DNS", ports: [53] },
];

// Suspicious patterns for demo
const SUSPICIOUS_DESTINATIONS = [
  { ip: "185.143.223.45", name: "Unknown (Eastern Europe)", ports: [4444, 8080] },
  { ip: "45.33.32.156", name: "Scanning Host", ports: [22, 23, 3389] },
  { ip: "103.224.182.252", name: "Unknown (Asia)", ports: [6667, 1337] },
];

const PROTOCOLS = ["TCP", "UDP", "ICMP"];
const EVENT_TYPES = ["connection", "dns_query", "http_request", "tls_handshake", "data_transfer"];

const generateRandomIP = (): string => {
  const first = Math.floor(Math.random() * 223) + 1;
  return `${first}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
};

const generateLocalIP = (): string => {
  return `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
};

export const useNetworkSimulation = (isRunning: boolean, anomalyRate: number = 0.05) => {
  const [events, setEvents] = useState<NetworkEvent[]>([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    bytesIn: 0,
    bytesOut: 0,
    uniqueDestinations: new Set<string>(),
    protocolCounts: {} as Record<string, number>,
  });
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const generateEvent = useCallback((): NetworkEvent => {
    const isAnomaly = Math.random() < anomalyRate;
    const isSuspicious = isAnomaly && Math.random() > 0.5;
    
    let destination;
    let destPort;
    
    if (isSuspicious) {
      // Generate suspicious traffic
      const suspDest = SUSPICIOUS_DESTINATIONS[Math.floor(Math.random() * SUSPICIOUS_DESTINATIONS.length)];
      destination = suspDest.ip;
      destPort = suspDest.ports[Math.floor(Math.random() * suspDest.ports.length)];
    } else {
      // Generate normal traffic
      const normalDest = COMMON_DESTINATIONS[Math.floor(Math.random() * COMMON_DESTINATIONS.length)];
      destination = normalDest.ip;
      destPort = normalDest.ports[Math.floor(Math.random() * normalDest.ports.length)];
    }

    const protocol = PROTOCOLS[Math.floor(Math.random() * PROTOCOLS.length)];
    const eventType = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
    
    // Anomalous traffic patterns
    const bytesIn = isAnomaly && Math.random() > 0.7 
      ? Math.floor(Math.random() * 10000000) // Large unusual transfer
      : Math.floor(Math.random() * 50000);
    
    const bytesOut = isAnomaly && Math.random() > 0.8
      ? Math.floor(Math.random() * 5000000) // Potential exfiltration
      : Math.floor(Math.random() * 10000);

    return {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      source_ip: generateLocalIP(),
      destination_ip: destination,
      source_port: Math.floor(Math.random() * 64511) + 1024,
      destination_port: destPort,
      protocol,
      bytes_in: bytesIn,
      bytes_out: bytesOut,
      packet_count: Math.floor(Math.random() * 100) + 1,
      connection_duration_ms: Math.floor(Math.random() * 30000),
      event_type: eventType,
    };
  }, [anomalyRate]);

  const generateBurstEvents = useCallback((count: number): NetworkEvent[] => {
    return Array.from({ length: count }, () => generateEvent());
  }, [generateEvent]);

  useEffect(() => {
    if (isRunning) {
      // Generate initial batch
      const initialEvents = generateBurstEvents(20);
      setEvents(initialEvents);
      
      // Update stats
      setStats(prev => {
        const newStats = { ...prev };
        initialEvents.forEach(event => {
          newStats.totalEvents++;
          newStats.bytesIn += event.bytes_in;
          newStats.bytesOut += event.bytes_out;
          newStats.uniqueDestinations.add(event.destination_ip);
          newStats.protocolCounts[event.protocol] = (newStats.protocolCounts[event.protocol] || 0) + 1;
        });
        return newStats;
      });

      // Generate events at random intervals
      intervalRef.current = setInterval(() => {
        const newEvents = generateBurstEvents(Math.floor(Math.random() * 3) + 1);
        
        setEvents(prev => {
          const updated = [...newEvents, ...prev].slice(0, 200); // Keep last 200 events
          return updated;
        });

        setStats(prev => {
          const newStats = { ...prev };
          newEvents.forEach(event => {
            newStats.totalEvents++;
            newStats.bytesIn += event.bytes_in;
            newStats.bytesOut += event.bytes_out;
            newStats.uniqueDestinations.add(event.destination_ip);
            newStats.protocolCounts[event.protocol] = (newStats.protocolCounts[event.protocol] || 0) + 1;
          });
          return newStats;
        });
      }, 1000 + Math.random() * 2000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, generateBurstEvents]);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setStats({
      totalEvents: 0,
      bytesIn: 0,
      bytesOut: 0,
      uniqueDestinations: new Set<string>(),
      protocolCounts: {},
    });
  }, []);

  return {
    events,
    stats: {
      ...stats,
      uniqueDestinationsCount: stats.uniqueDestinations.size,
    },
    clearEvents,
    generateBurstEvents,
  };
};
