import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Shield, ArrowLeft, Plus, X, Save } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

type SafetyFiltersData = {
  id?: string;
  blocked_keywords: string[];
  threat_sensitivity: 'low' | 'medium' | 'high';
  auto_block_enabled: boolean;
  safe_browsing_enabled: boolean;
  content_filtering_enabled: boolean;
};

const SafetyFilters = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const navigate = useNavigate();
  
  const [filters, setFilters] = useState<SafetyFiltersData>({
    blocked_keywords: [],
    threat_sensitivity: 'medium',
    auto_block_enabled: true,
    safe_browsing_enabled: true,
    content_filtering_enabled: true,
  });

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
      } else {
        loadFilters(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadFilters = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('safety_filters')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFilters({
          id: data.id,
          blocked_keywords: data.blocked_keywords || [],
          threat_sensitivity: data.threat_sensitivity as 'low' | 'medium' | 'high',
          auto_block_enabled: data.auto_block_enabled,
          safe_browsing_enabled: data.safe_browsing_enabled,
          content_filtering_enabled: data.content_filtering_enabled,
        });
      }
    } catch (error: any) {
      console.error('Error loading filters:', error);
      toast.error('Failed to load safety filters');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('safety_filters')
        .upsert({
          user_id: user.id,
          blocked_keywords: filters.blocked_keywords,
          threat_sensitivity: filters.threat_sensitivity,
          auto_block_enabled: filters.auto_block_enabled,
          safe_browsing_enabled: filters.safe_browsing_enabled,
          content_filtering_enabled: filters.content_filtering_enabled,
        });

      if (error) throw error;

      toast.success('Safety filters saved successfully');
    } catch (error: any) {
      console.error('Error saving filters:', error);
      toast.error('Failed to save safety filters');
    } finally {
      setSaving(false);
    }
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !filters.blocked_keywords.includes(newKeyword.trim())) {
      setFilters({
        ...filters,
        blocked_keywords: [...filters.blocked_keywords, newKeyword.trim()]
      });
      setNewKeyword("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setFilters({
      ...filters,
      blocked_keywords: filters.blocked_keywords.filter(k => k !== keyword)
    });
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
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                onClick={() => navigate("/dashboard")}
                variant="ghost"
                size="sm"
                className="px-2 sm:px-3"
              >
                <ArrowLeft className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                <span className="text-base sm:text-xl font-bold">Safety Filters</span>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} size="sm" className="sm:size-default">
              <Save className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save Changes'}</span>
              <span className="sm:hidden">{saving ? '...' : 'Save'}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Configure Safety Filters</h1>
          <p className="text-muted-foreground">
            Customize your protection settings to create a safer digital experience
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Threat Sensitivity Level</CardTitle>
              <CardDescription>
                Adjust how aggressively GuardianNet AI detects potential threats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => setFilters({ ...filters, threat_sensitivity: 'low' })}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      filters.threat_sensitivity === 'low'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="font-semibold">Low</div>
                    <div className="text-sm text-muted-foreground">Minimal filtering</div>
                  </button>
                  <button
                    onClick={() => setFilters({ ...filters, threat_sensitivity: 'medium' })}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      filters.threat_sensitivity === 'medium'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="font-semibold">Medium</div>
                    <div className="text-sm text-muted-foreground">Balanced protection</div>
                  </button>
                  <button
                    onClick={() => setFilters({ ...filters, threat_sensitivity: 'high' })}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      filters.threat_sensitivity === 'high'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="font-semibold">High</div>
                    <div className="text-sm text-muted-foreground">Maximum security</div>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Protection Features</CardTitle>
              <CardDescription>
                Enable or disable specific safety features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Block Threats</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically block detected threats before you see them
                  </p>
                </div>
                <Switch
                  checked={filters.auto_block_enabled}
                  onCheckedChange={(checked) =>
                    setFilters({ ...filters, auto_block_enabled: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Safe Browsing</Label>
                  <p className="text-sm text-muted-foreground">
                    Protect against malicious links and websites
                  </p>
                </div>
                <Switch
                  checked={filters.safe_browsing_enabled}
                  onCheckedChange={(checked) =>
                    setFilters({ ...filters, safe_browsing_enabled: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Content Filtering</Label>
                  <p className="text-sm text-muted-foreground">
                    Filter harmful or inappropriate content
                  </p>
                </div>
                <Switch
                  checked={filters.content_filtering_enabled}
                  onCheckedChange={(checked) =>
                    setFilters({ ...filters, content_filtering_enabled: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Blocked Keywords</CardTitle>
              <CardDescription>
                Add specific words or phrases to block from your content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter keyword to block..."
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addKeyword();
                    }
                  }}
                />
                <Button onClick={addKeyword} size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {filters.blocked_keywords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No keywords added yet. Add keywords to enhance your protection.
                  </p>
                ) : (
                  filters.blocked_keywords.map((keyword) => (
                    <div
                      key={keyword}
                      className="flex items-center gap-2 px-3 py-1 bg-muted rounded-md"
                    >
                      <span className="text-sm">{keyword}</span>
                      <button
                        onClick={() => removeKeyword(keyword)}
                        className="hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default SafetyFilters;