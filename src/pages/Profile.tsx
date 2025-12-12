import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { User, Settings, Activity, ArrowLeft, Save, Loader2 } from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  email_notifications: boolean;
  threat_alerts_notifications: boolean;
  weekly_digest: boolean;
  marketing_emails: boolean;
  created_at: string | null;
  updated_at: string | null;
}

interface IncidentReport {
  id: string;
  incident_type: string;
  severity: string;
  status: string;
  created_at: string;
}

interface ThreatAlert {
  id: string;
  threat_type: string;
  severity: string;
  status: string;
  created_at: string | null;
}

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [alerts, setAlerts] = useState<ThreatAlert[]>([]);

  // Form state
  const [fullName, setFullName] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [threatAlertsNotifications, setThreatAlertsNotifications] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchActivityHistory();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data as Profile);
        setFullName(data.full_name || "");
        setEmailNotifications(data.email_notifications ?? true);
        setThreatAlertsNotifications(data.threat_alerts_notifications ?? true);
        setWeeklyDigest(data.weekly_digest ?? false);
        setMarketingEmails(data.marketing_emails ?? false);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityHistory = async () => {
    if (!user) return;

    try {
      const [incidentsResult, alertsResult] = await Promise.all([
        supabase
          .from("incident_reports")
          .select("id, incident_type, severity, status, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("threat_alerts")
          .select("id, threat_type, severity, status, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (incidentsResult.data) setIncidents(incidentsResult.data);
      if (alertsResult.data) setAlerts(alertsResult.data);
    } catch (error) {
      console.error("Error fetching activity:", error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          email_notifications: emailNotifications,
          threat_alerts_notifications: threatAlertsNotifications,
          weekly_digest: weeklyDigest,
          marketing_emails: marketingEmails,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });

      fetchProfile();
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "high":
      case "critical":
        return "text-red-500";
      case "medium":
        return "text-yellow-500";
      case "low":
        return "text-green-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "submitted":
        return "bg-blue-500/20 text-blue-500";
      case "resolved":
        return "bg-green-500/20 text-green-500";
      case "dismissed":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Profile Settings</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="account" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Account
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          {/* Account Tab */}
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  View and update your account details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Member Since:</span>
                    <p className="font-medium">{formatDate(profile?.created_at || null)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Updated:</span>
                    <p className="font-medium">{formatDate(profile?.updated_at || null)}</p>
                  </div>
                </div>

                <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Manage how you receive notifications and updates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive important updates via email
                    </p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Threat Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about detected threats
                    </p>
                  </div>
                  <Switch
                    checked={threatAlertsNotifications}
                    onCheckedChange={setThreatAlertsNotifications}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Weekly Digest</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive a weekly summary of your activity
                    </p>
                  </div>
                  <Switch
                    checked={weeklyDigest}
                    onCheckedChange={setWeeklyDigest}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Marketing Emails</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive tips and product updates
                    </p>
                  </div>
                  <Switch
                    checked={marketingEmails}
                    onCheckedChange={setMarketingEmails}
                  />
                </div>

                <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Preferences
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <div className="space-y-6">
              {/* Incident Reports */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Incident Reports</CardTitle>
                  <CardDescription>
                    Your submitted incident reports
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {incidents.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No incident reports yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {incidents.map((incident) => (
                        <div
                          key={incident.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div>
                            <p className="font-medium capitalize">
                              {incident.incident_type.replace(/_/g, " ")}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(incident.created_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${getSeverityColor(incident.severity)}`}>
                              {incident.severity}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(incident.status)}`}>
                              {incident.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Threat Alerts */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Threat Alerts</CardTitle>
                  <CardDescription>
                    Detected threats and their status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {alerts.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No threat alerts yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {alerts.map((alert) => (
                        <div
                          key={alert.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div>
                            <p className="font-medium capitalize">
                              {alert.threat_type.replace(/_/g, " ")}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(alert.created_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${getSeverityColor(alert.severity)}`}>
                              {alert.severity}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(alert.status)}`}>
                              {alert.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Profile;
