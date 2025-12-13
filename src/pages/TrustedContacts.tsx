import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Shield, ArrowLeft, Plus, Trash2, Users, Phone, Mail, UserCheck } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { User } from "@supabase/supabase-js";

interface TrustedContact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  relationship: string | null;
  notify_on_high_threat: boolean;
  notify_on_incident: boolean;
}

const TrustedContacts = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newContact, setNewContact] = useState({
    name: "",
    phone: "",
    email: "",
    relationship: "",
    notify_on_high_threat: true,
    notify_on_incident: true,
  });
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          navigate("/auth");
        }
      }
    );

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
      fetchContacts();
    }
  }, [user]);

  const fetchContacts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("trusted_contacts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load contacts");
    } else {
      setContacts(data || []);
    }
    setLoading(false);
  };

  const handleAddContact = async () => {
    if (!newContact.name.trim()) {
      toast.error("Please enter a contact name");
      return;
    }

    if (!newContact.phone && !newContact.email) {
      toast.error("Please enter at least a phone number or email");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("trusted_contacts").insert({
      user_id: user?.id,
      name: newContact.name.trim(),
      phone: newContact.phone.trim() || null,
      email: newContact.email.trim() || null,
      relationship: newContact.relationship || null,
      notify_on_high_threat: newContact.notify_on_high_threat,
      notify_on_incident: newContact.notify_on_incident,
    });

    if (error) {
      toast.error("Failed to add contact");
    } else {
      toast.success("Contact added successfully");
      setNewContact({
        name: "",
        phone: "",
        email: "",
        relationship: "",
        notify_on_high_threat: true,
        notify_on_incident: true,
      });
      setDialogOpen(false);
      fetchContacts();
    }
    setSaving(false);
  };

  const handleDeleteContact = async (id: string) => {
    const { error } = await supabase
      .from("trusted_contacts")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete contact");
    } else {
      toast.success("Contact removed");
      fetchContacts();
    }
  };

  const handleToggleNotification = async (
    id: string,
    field: "notify_on_high_threat" | "notify_on_incident",
    value: boolean
  ) => {
    const { error } = await supabase
      .from("trusted_contacts")
      .update({ [field]: value })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update notification setting");
    } else {
      setContacts((prev) =>
        prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
      );
    }
  };

  if (loading && !contacts.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold">GuardianNet AI</span>
          </div>
          <Button onClick={() => navigate("/dashboard")} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Users className="w-8 h-8 text-primary" />
            Trusted Contacts
          </h1>
          <p className="text-muted-foreground">
            Add emergency contacts who will be notified during safety alerts
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Emergency Contacts</CardTitle>
                <CardDescription>
                  These contacts will receive alerts based on your notification preferences
                </CardDescription>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Contact
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Trusted Contact</DialogTitle>
                    <DialogDescription>
                      Add someone you trust to receive safety alerts on your behalf
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        placeholder="Contact name"
                        value={newContact.name}
                        onChange={(e) =>
                          setNewContact({ ...newContact, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        placeholder="+27 XX XXX XXXX"
                        value={newContact.phone}
                        onChange={(e) =>
                          setNewContact({ ...newContact, phone: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="contact@example.com"
                        value={newContact.email}
                        onChange={(e) =>
                          setNewContact({ ...newContact, email: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="relationship">Relationship</Label>
                      <Select
                        value={newContact.relationship}
                        onValueChange={(value) =>
                          setNewContact({ ...newContact, relationship: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select relationship" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="family">Family Member</SelectItem>
                          <SelectItem value="friend">Friend</SelectItem>
                          <SelectItem value="partner">Partner</SelectItem>
                          <SelectItem value="colleague">Colleague</SelectItem>
                          <SelectItem value="counselor">Counselor</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="notify_threat">Notify on high-severity threats</Label>
                        <Switch
                          id="notify_threat"
                          checked={newContact.notify_on_high_threat}
                          onCheckedChange={(checked) =>
                            setNewContact({ ...newContact, notify_on_high_threat: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="notify_incident">Notify on incident reports</Label>
                        <Switch
                          id="notify_incident"
                          checked={newContact.notify_on_incident}
                          onCheckedChange={(checked) =>
                            setNewContact({ ...newContact, notify_on_incident: checked })
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddContact} disabled={saving}>
                      {saving ? "Adding..." : "Add Contact"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UserCheck className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No trusted contacts yet</p>
                <p className="text-sm">
                  Add emergency contacts who can be notified during safety incidents
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{contact.name}</h3>
                        {contact.relationship && (
                          <span className="text-sm text-muted-foreground capitalize">
                            {contact.relationship}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteContact(contact.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {contact.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {contact.phone}
                        </span>
                      )}
                      {contact.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {contact.email}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-6 pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`threat-${contact.id}`}
                          checked={contact.notify_on_high_threat}
                          onCheckedChange={(checked) =>
                            handleToggleNotification(
                              contact.id,
                              "notify_on_high_threat",
                              checked
                            )
                          }
                        />
                        <Label htmlFor={`threat-${contact.id}`} className="text-sm">
                          High threat alerts
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`incident-${contact.id}`}
                          checked={contact.notify_on_incident}
                          onCheckedChange={(checked) =>
                            handleToggleNotification(
                              contact.id,
                              "notify_on_incident",
                              checked
                            )
                          }
                        />
                        <Label htmlFor={`incident-${contact.id}`} className="text-sm">
                          Incident reports
                        </Label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Emergency Hotlines</CardTitle>
            <CardDescription>
              Important safety numbers across Africa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="font-medium">South Africa GBV Hotline</p>
                <p className="text-sm text-muted-foreground">24/7 Support</p>
              </div>
              <a href="tel:0800150150" className="text-primary font-bold">
                0800 150 150
              </a>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="font-medium">South Africa Police</p>
                <p className="text-sm text-muted-foreground">Emergency Services</p>
              </div>
              <a href="tel:10111" className="text-primary font-bold">
                10111
              </a>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Kenya GBV Hotline</p>
                <p className="text-sm text-muted-foreground">24/7 Support</p>
              </div>
              <a href="tel:1195" className="text-primary font-bold">
                1195
              </a>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Nigeria NAPTIP</p>
                <p className="text-sm text-muted-foreground">Anti-Trafficking</p>
              </div>
              <a href="tel:08007888001" className="text-primary font-bold">
                0800 788 8001
              </a>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TrustedContacts;
