import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, LogOut, Sparkles, Shield } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import PageTransition from "@/components/PageTransition";

export default function DashboardLayout({ children, title }: { children: React.ReactNode; title: string }) {
  const { currentUser, signOut } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = currentUser?.role === "super_admin";

  return (
    <div className="min-h-screen bg-background">
      {/* Gradient mesh background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl animate-pulse-glow" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-accent/30 blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
      </div>

      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="rounded-xl hover:bg-accent transition-colors overflow-hidden"
              title="Dashboard"
            >
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </Button>
            {isSuperAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/admins")}
                className="rounded-xl hover:bg-accent hover:text-primary transition-colors"
                title="Admin Management"
              >
                <Shield className="h-5 w-5" />
              </Button>
            )}
            <div className="flex items-center gap-2 ml-1">
              <h1 className="text-xl font-bold text-foreground tracking-tight">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/50 border border-border/50">
              <div className="w-2 h-2 rounded-full gradient-primary animate-pulse-glow" />
              <span className="text-sm font-medium text-foreground">
                {currentUser?.name}
              </span>
              <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded-md bg-muted/50">
                {currentUser?.role?.replace("_", " ")}
              </span>
            </div>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <PageTransition>
          {children}
        </PageTransition>
      </main>
    </div>
  );
}
