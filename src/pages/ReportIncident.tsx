import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, ArrowLeft, Upload, X, Phone, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

type IncidentType = 'cyberbullying' | 'harassment' | 'threats' | 'doxxing' | 'hate_speech' | 'sexual_harassment' | 'other';
type Severity = 'low' | 'medium' | 'high' | 'critical';

const SAFETY_NUMBERS = [
  {
    name: "GBV Command Centre",
    number: "0800 428 428",
    description: "24/7 Gender-Based Violence helpline",
    type: "emergency"
  },
  {
    name: "Police Emergency",
    number: "10111",
    description: "South African Police Service",
    type: "emergency"
  },
  {
    name: "Childline South Africa",
    number: "116",
    description: "Free 24/7 counselling for children",
    type: "support"
  },
  {
    name: "Lifeline South Africa",
    number: "0861 322 322",
    description: "24/7 crisis counselling",
    type: "support"
  },
  {
    name: "Rape Crisis",
    number: "021 447 9762",
    description: "Support for rape survivors",
    type: "support"
  },
  {
    name: "People Opposing Women Abuse (POWA)",
    number: "083 765 1235",
    description: "Women abuse support and counselling",
    type: "support"
  }
];

const ReportIncident = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    incident_type: '' as IncidentType | '',
    description: '',
    platform: '',
    incident_date: '',
    severity: 'medium' as Severity,
  });

  const [files, setFiles] = useState<File[]>([]);
  const [uploadedFilePaths, setUploadedFilePaths] = useState<string[]>([]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          navigate("/auth");
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const totalFiles = files.length + newFiles.length;
      
      if (totalFiles > 5) {
        toast.error("Maximum 5 files allowed");
        return;
      }

      // Check file sizes (10MB max per file)
      const oversizedFiles = newFiles.filter(f => f.size > 10485760);
      if (oversizedFiles.length > 0) {
        toast.error("Files must be under 10MB");
        return;
      }

      setFiles([...files, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<string[]> => {
    if (files.length === 0 || !user) return [];

    setUploadingFiles(true);
    const uploadedPaths: string[] = [];

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('incident-evidence')
          .upload(fileName, file);

        if (uploadError) throw uploadError;
        uploadedPaths.push(fileName);
      }

      return uploadedPaths;
    } catch (error: any) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload some files');
      return uploadedPaths;
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !formData.incident_type || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);

    try {
      // Upload files first
      const filePaths = await uploadFiles();
      setUploadedFilePaths(filePaths);

      // Submit incident report
      const { error } = await supabase
        .from('incident_reports')
        .insert({
          user_id: user.id,
          incident_type: formData.incident_type,
          description: formData.description,
          platform: formData.platform || null,
          incident_date: formData.incident_date ? new Date(formData.incident_date).toISOString() : null,
          severity: formData.severity,
          evidence_files: filePaths,
        });

      if (error) throw error;

      toast.success("Incident report submitted successfully");
      navigate("/dashboard");
    } catch (error: any) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit incident report');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
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
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate("/dashboard")}
              variant="ghost"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-primary" />
              <span className="text-xl font-bold">Report Incident</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Report a Safety Incident</CardTitle>
                <CardDescription>
                  Provide details about harassment, threats, or other safety concerns you've encountered
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="incident_type">Incident Type *</Label>
                    <Select
                      value={formData.incident_type}
                      onValueChange={(value) => setFormData({ ...formData, incident_type: value as IncidentType })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select incident type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cyberbullying">Cyberbullying</SelectItem>
                        <SelectItem value="harassment">Harassment</SelectItem>
                        <SelectItem value="threats">Threats</SelectItem>
                        <SelectItem value="doxxing">Doxxing</SelectItem>
                        <SelectItem value="hate_speech">Hate Speech</SelectItem>
                        <SelectItem value="sexual_harassment">Sexual Harassment</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="severity">Severity Level *</Label>
                    <Select
                      value={formData.severity}
                      onValueChange={(value) => setFormData({ ...formData, severity: value as Severity })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low - Minor concern</SelectItem>
                        <SelectItem value="medium">Medium - Moderate threat</SelectItem>
                        <SelectItem value="high">High - Serious threat</SelectItem>
                        <SelectItem value="critical">Critical - Immediate danger</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="platform">Platform (Optional)</Label>
                    <Input
                      id="platform"
                      placeholder="e.g., Facebook, Twitter, WhatsApp"
                      value={formData.platform}
                      onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="incident_date">When did this happen? (Optional)</Label>
                    <Input
                      id="incident_date"
                      type="datetime-local"
                      value={formData.incident_date}
                      onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe what happened in detail. Include usernames, links, or any other relevant information."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={6}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Evidence (Screenshots, Photos, Videos)</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Upload up to 5 files (10MB max each). Supported: JPG, PNG, GIF, WEBP, PDF, MP4, MOV
                    </p>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('file-upload')?.click()}
                        disabled={files.length >= 5}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Add Files
                      </Button>
                      <input
                        id="file-upload"
                        type="file"
                        multiple
                        accept="image/*,application/pdf,video/mp4,video/quicktime"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>

                    {files.length > 0 && (
                      <div className="space-y-2 mt-3">
                        {files.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                            <span className="text-sm truncate">{file.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={submitting || uploadingFiles}
                  >
                    {submitting ? 'Submitting...' : uploadingFiles ? 'Uploading files...' : 'Submit Report'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="w-5 h-5" />
                  Emergency?
                </CardTitle>
                <CardDescription>
                  If you're in immediate danger, contact emergency services
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {SAFETY_NUMBERS.filter(n => n.type === 'emergency').map((num) => (
                  <div key={num.number} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{num.name}</span>
                      <a
                        href={`tel:${num.number.replace(/\s/g, '')}`}
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <Phone className="w-4 h-4" />
                        <span className="font-mono">{num.number}</span>
                      </a>
                    </div>
                    <p className="text-xs text-muted-foreground">{num.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Support Services
                </CardTitle>
                <CardDescription>
                  Free counselling and support available
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {SAFETY_NUMBERS.filter(n => n.type === 'support').map((num) => (
                  <div key={num.number} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{num.name}</span>
                      <a
                        href={`tel:${num.number.replace(/\s/g, '')}`}
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <Phone className="w-4 h-4" />
                        <span className="font-mono text-xs">{num.number}</span>
                      </a>
                    </div>
                    <p className="text-xs text-muted-foreground">{num.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReportIncident;