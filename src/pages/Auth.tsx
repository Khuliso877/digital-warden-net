import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Turnstile } from "@/components/Turnstile";
import { PasswordStrength, generateStrongPassword, getStrength } from "@/components/PasswordStrength";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const navigate = useNavigate();

  const verifyTurnstile = async (token: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("verify-turnstile", {
        body: { token },
      });
      
      if (error) {
        console.error("Turnstile verification error:", error);
        return false;
      }
      
      return data?.success === true;
    } catch (error) {
      console.error("Turnstile verification failed:", error);
      return false;
    }
  };

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const handleTurnstileError = useCallback(() => {
    setTurnstileToken(null);
    toast.error("Security verification failed. Please try again.");
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken(null);
  }, []);

  const handleGeneratePassword = () => {
    const newPassword = generateStrongPassword();
    setPassword(newPassword);
    toast.success("Strong password generated! Make sure to save it.");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only require verification when Turnstile is actually configured.
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      toast.error("Please complete the security verification");
      return;
    }
    
    setLoading(true);

    try {
      // Verify Turnstile token
      const isValid = await verifyTurnstile(turnstileToken);
      if (!isValid) {
        toast.error("Security verification failed. Please try again.");
        setTurnstileToken(null);
        return;
      }

      const { error } = await supabase.functions.invoke("send-password-reset", {
        body: {
          email,
          redirectTo: `${window.location.origin}/auth?reset=true`,
        },
      });
      
      if (error) throw error;
      toast.success("Password reset email sent! Check your inbox.");
      setIsForgotPassword(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only require verification when Turnstile is actually configured.
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      toast.error("Please complete the security verification");
      return;
    }
    
    // Check password strength for signup
    if (!isLogin) {
      const strength = getStrength(password);
      if (strength.score < 3) {
        toast.error("Please use a stronger password for better security");
        return;
      }
    }
    
    setLoading(true);

    try {
      // Verify Turnstile token
      const isValid = await verifyTurnstile(turnstileToken);
      if (!isValid) {
        toast.error("Security verification failed. Please try again.");
        setTurnstileToken(null);
        return;
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              full_name: fullName,
            },
          },
        });
        if (error) throw error;
        toast.success("Account created! Redirecting...");
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            {isForgotPassword ? "Reset Password" : isLogin ? "Welcome Back" : "Join GuardianNet AI"}
          </CardTitle>
          <CardDescription className="text-center">
            {isForgotPassword
              ? "Enter your email to receive a password reset link"
              : isLogin
              ? "Sign in to access your safety dashboard"
              : "Create an account to start protecting yourself online"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              {TURNSTILE_SITE_KEY && (
                <Turnstile
                  siteKey={TURNSTILE_SITE_KEY}
                  onVerify={handleTurnstileVerify}
                  onError={handleTurnstileError}
                  onExpire={handleTurnstileExpire}
                />
              )}
              
              <Button type="submit" className="w-full" disabled={loading || (!turnstileToken && !!TURNSTILE_SITE_KEY)}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setTurnstileToken(null);
                  }}
                  className="text-primary hover:underline"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          ) : (
            <>
              <form onSubmit={handleAuth} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Jane Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required={!isLogin}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {!isLogin && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto py-0 px-2 text-xs text-muted-foreground hover:text-primary"
                        onClick={handleGeneratePassword}
                      >
                        <Wand2 className="w-3 h-3 mr-1" />
                        Generate strong password
                      </Button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  {!isLogin && <PasswordStrength password={password} />}
                </div>
                {isLogin && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setTurnstileToken(null);
                      }}
                      className="text-sm text-muted-foreground hover:text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
                
                {TURNSTILE_SITE_KEY && (
                  <Turnstile
                    siteKey={TURNSTILE_SITE_KEY}
                    onVerify={handleTurnstileVerify}
                    onError={handleTurnstileError}
                    onExpire={handleTurnstileExpire}
                  />
                )}
                
                <Button type="submit" className="w-full" disabled={loading || (!turnstileToken && !!TURNSTILE_SITE_KEY)}>
                  {loading ? "Loading..." : isLogin ? "Sign In" : "Create Account"}
                </Button>
              </form>
              <div className="mt-4 text-center text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setTurnstileToken(null);
                  }}
                  className="text-primary hover:underline"
                >
                  {isLogin
                    ? "Don't have an account? Sign up"
                    : "Already have an account? Sign in"}
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
