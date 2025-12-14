import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, MapPin } from "lucide-react";
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
import type { User } from "@supabase/supabase-js";

interface PanicButtonProps {
  user: User | null;
  userName?: string;
}

const PanicButton = ({ user, userName }: PanicButtonProps) => {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [shareLocation, setShareLocation] = useState(true);
  const [locationStatus, setLocationStatus] = useState<"idle" | "fetching" | "success" | "error">("idle");

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

  const handlePanicAlert = async () => {
    if (!user) {
      toast.error("You must be logged in to use this feature");
      return;
    }

    setSending(true);

    try {
      const location = await getLocation();

      const { data, error } = await supabase.functions.invoke("send-panic-alert", {
        body: {
          userId: user.id,
          userName: userName || user.email?.split("@")[0] || "User",
          userEmail: user.email,
          message: message.trim() || undefined,
          location,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Emergency alert sent to ${data.successCount} contact(s)`);
        setMessage("");
        setDialogOpen(false);
        setLocationStatus("idle");
      } else {
        toast.warning(data.message || "No contacts were notified");
      }
    } catch (error: any) {
      console.error("Error sending panic alert:", error);
      toast.error("Failed to send alert. Please try calling emergency services directly.");
    } finally {
      setSending(false);
    }
  };

  return (
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
          <AlertDialogDescription className="text-left space-y-3">
            <p>
              This will immediately notify all your trusted contacts that you may need help.
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
  );
};

export default PanicButton;
