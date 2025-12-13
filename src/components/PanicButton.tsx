import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
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
import type { User } from "@supabase/supabase-js";

interface PanicButtonProps {
  user: User | null;
  userName?: string;
}

const PanicButton = ({ user, userName }: PanicButtonProps) => {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const handlePanicAlert = async () => {
    if (!user) {
      toast.error("You must be logged in to use this feature");
      return;
    }

    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-panic-alert", {
        body: {
          userId: user.id,
          userName: userName || user.email?.split("@")[0] || "User",
          userEmail: user.email,
          message: message.trim() || undefined,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Emergency alert sent to ${data.successCount} contact(s)`);
        setMessage("");
        setDialogOpen(false);
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
