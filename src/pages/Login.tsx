import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, Sparkles } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  if (session) return <Navigate to="/" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute -top-32 -left-32 w-64 h-64 rounded-full bg-primary/10 blur-3xl animate-pulse-glow" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-accent/20 blur-3xl animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-pulse-glow" style={{ animationDelay: '0.5s' }} />

      <Card className="w-full max-w-md glass-card animate-fade-in-scale border-border/50 shadow-2xl relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-6 w-28 h-28 rounded-full border-4 border-background/50 flex items-center justify-center shadow-xl animate-float overflow-hidden bg-white">
            <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain p-2" />
          </div>
          <CardTitle className="text-3xl font-extrabold">
            <span className="gradient-text">Admin Dashboard</span>
          </CardTitle>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <p className="text-sm text-muted-foreground">Sign in to access the dashboard</p>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="h-11 rounded-xl bg-muted/50 border-border/50 focus:border-primary/50 transition-colors"
                placeholder="admin@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="h-11 rounded-xl bg-muted/50 border-border/50 focus:border-primary/50 transition-colors"
                placeholder="••••••••"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow hover:shadow-glow-lg transition-all duration-300 hover:scale-[1.02]"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}