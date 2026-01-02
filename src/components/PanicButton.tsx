import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, MapPin, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import type { User } from "@supabase/supabase-js";

interface PanicButtonProps {
  user: User | null;
  userName?: string;
}

const ESCALATION_DELAY_MS = 5 * 60 * 1000; // 5 minutes per tier

const PanicButton = ({ user, userName }: PanicButtonProps) => {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [shareLocation, setShareLocation] = useState(true);
  const [locationStatus, setLocationStatus] = useState<"idle" | "fetching" | "success" | "error">("idle");
  const [escalationActive, setEscalationActive] = useState(false);
  const [currentTier, setCurrentTier] = useState(1);
  const [escalationProgress, setEscalationProgress] = useState(0);
  const escalationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const alertDataRef = useRef<{ location?: string; message?: string } | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (escalationTimerRef.current) clearTimeout(escalationTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  const getLocation = (): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (!shareLocation) {
        resolve(undefined);
        return;
      }

      if (!navigator.geolocation) {
        console.log("Geolocation not supported");
        resolve(undefined);
        return;
      }

      setLocationStatus("fetching");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
          setLocationStatus("success");
          resolve(mapsLink);
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLocationStatus("error");
          resolve(undefined);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  const sendAlertToTier = async (tier: number, location?: string, customMessage?: string) => {
    if (!user) return null;

    console.log(`Sending alert to tier ${tier}`);
    
    const { data, error } = await supabase.functions.invoke("send-panic-alert", {
      body: {
        userId: user.id,
        userName: userName || user.email?.split("@")[0] || "User",
        userEmail: user.email,
        message: customMessage || undefined,
        location,
        tier,
      },
    });

    if (error) throw error;
    return data;
  };

  const startEscalation = (tier: number) => {
    if (tier > 3) {
      // All tiers exhausted
      setEscalationActive(false);
      toast.info("All contact tiers have been notified");
      return;
    }

    setCurrentTier(tier);
    setEscalationProgress(0);

    // Start progress animation
    const startTime = Date.now();
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / ESCALATION_DELAY_MS) * 100, 100);
      setEscalationProgress(progress);
    }, 1000);

    // Schedule next tier
    escalationTimerRef.current = setTimeout(async () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      
      try {
        const data = await sendAlertToTier(
          tier + 1,
          alertDataRef.current?.location,
          alertDataRef.current?.message
        );
        
        if (data?.success && (data.emailSuccessCount > 0 || data.smsSuccessCount > 0)) {
          toast.info(`Escalated to Tier ${tier + 1}: ${data.emailSuccessCount + data.smsSuccessCount} contact(s) notified`);
        }
        
        if (data?.nextTiersAvailable) {
          startEscalation(tier + 1);
        } else {
          setEscalationActive(false);
          toast.info("All available contact tiers have been notified");
        }
      } catch (error) {
        console.error("Escalation error:", error);
        setEscalationActive(false);
      }
    }, ESCALATION_DELAY_MS);
  };

  const cancelEscalation = () => {
    if (escalationTimerRef.current) clearTimeout(escalationTimerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setEscalationActive(false);
    setCurrentTier(1);
    setEscalationProgress(0);
    alertDataRef.current = null;
    toast.success("Escalation cancelled - no further contacts will be notified");
  };

  const handlePanicAlert = async () => {
    if (!user) {
      toast.error("You must be logged in to use this feature");
      return;
    }

    setSending(true);

    try {
      const location = await getLocation();
      const trimmedMessage = message.trim() || undefined;
      
      // Store for escalation
      alertDataRef.current = { location, message: trimmedMessage };

      const data = await sendAlertToTier(1, location, trimmedMessage);

      if (data?.success) {
        const count = (data.emailSuccessCount || 0) + (data.smsSuccessCount || 0);
        
        if (count > 0) {
          toast.success(`Tier 1 alert sent to ${count} contact(s)`);
        } else {
          toast.warning("No Tier 1 contacts found");
        }
        
        // Start escalation if there are more tiers
        if (data.nextTiersAvailable) {
          setEscalationActive(true);
          startEscalation(1);
          toast.info("Escalation started - Tier 2 will be notified in 5 minutes if no response");
        }
        
        setMessage("");
        setDialogOpen(false);
        setLocationStatus("idle");
      } else {
        toast.warning(data?.message || "No contacts were notified");
      }
    } catch (error: any) {
      console.error("Error sending panic alert:", error);
      toast.error("Failed to send alert. Please try calling emergency services directly.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Escalation Status Banner */}
      {escalationActive && (
        <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-orange-500 text-white p-4 rounded-lg shadow-lg z-50 animate-in slide-in-from-bottom">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span className="font-semibold">Escalation Active</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={cancelEscalation}
              className="bg-white/20 hover:bg-white/30 text-white"
            >
              I'm Safe - Cancel
            </Button>
          </div>
          <p className="text-sm mb-2">
            Tier {currentTier} notified. Tier {Math.min(currentTier + 1, 3)} in {Math.ceil((100 - escalationProgress) / 100 * 5)} min
          </p>
          <Progress value={escalationProgress} className="h-2 bg-white/30" />
        </div>
      )}

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            size="lg"
            className="gap-2 animate-pulse hover:animate-none"
          >
            <AlertTriangle className="w-5 h-5" />
            Panic Button
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Send Emergency Alert
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-left space-y-3">
                <p>
                  This will immediately notify your <strong>Tier 1</strong> contacts. If no response, alerts will escalate to Tier 2 (after 5 min) and Tier 3 (after 10 min).
                </p>
                <div className="space-y-2">
                  <Label htmlFor="panic-message">Optional message (what's happening?)</Label>
                  <Textarea
                    id="panic-message"
                    placeholder="Add any details that might help..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="resize-none"
                    rows={3}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="share-location"
                    checked={shareLocation}
                    onCheckedChange={(checked) => setShareLocation(checked === true)}
                  />
                  <Label htmlFor="share-location" className="flex items-center gap-1 cursor-pointer">
                    <MapPin className="w-4 h-4" />
                    Share my location with contacts
                  </Label>
                </div>
                {locationStatus === "fetching" && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Getting your location...
                  </p>
                )}
                <div className="bg-muted p-3 rounded-lg text-sm">
                  <p className="font-medium mb-1">Emergency Numbers:</p>
                  <p>🇿🇦 SA Police: 10111 | GBV Hotline: 0800 150 150</p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handlePanicAlert();
              }}
              disabled={sending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Alert Now"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PanicButton;
