import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Minus, Lock, User, Coins } from "lucide-react";
import { logActivity } from "@/utils/activityLogging";
import { useAuth } from "@/contexts/AuthContext";

export default function AtmPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [pin, setPin] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [amount, setAmount] = useState("");

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("*").order("name");
      return data || [];
    },
  });

  const filtered = users?.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  const verifyPin = () => {
    if (selectedUser?.pin === pin) {
      setAuthenticated(true);
      setPin("");
    } else {
      toast({ title: "Invalid PIN", variant: "destructive" });
    }
  };

  const updatePoints = useMutation({
    mutationFn: async (delta: number) => {
      const newPoints = selectedUser.points + delta;
      if (newPoints < 0) throw new Error("Insufficient points");
      const { error } = await supabase
        .from("users")
        .update({ points: newPoints })
        .eq("id", selectedUser.id);
      if (error) throw error;

      const action = delta > 0 ? "ATM_DEPOSIT" : "ATM_WITHDRAWAL";
      const details = `${delta > 0 ? 'Added' : 'Withdrew'} ${Math.abs(delta)} points from ${selectedUser.name}`;

      await logActivity(currentUser?.id, action, details, selectedUser.id);

      return newPoints;
    },
    onSuccess: (newPoints) => {
      setSelectedUser((u: any) => ({ ...u, points: newPoints }));
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setAmount("");
      toast({ title: "Points updated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleBack = () => {
    setSelectedUser(null);
    setAuthenticated(false);
    setPin("");
    setAmount("");
  };

  if (!selectedUser) {
    return (
      <DashboardLayout title="ATM Mode">
        <div className="max-w-lg mx-auto space-y-4 animate-fade-in">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search user..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl bg-card/80 border-border/50" />
          </div>
          <div className="space-y-2">
            {filtered?.map((user, i) => (
              <div
                key={user.id}
                className="group glass-card-hover flex items-center justify-between p-4 cursor-pointer animate-fade-in"
                style={{ animationDelay: `${i * 50}ms` }}
                onClick={() => setSelectedUser(user)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center group-hover:animate-float">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.points} pts</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!authenticated) {
    return (
      <DashboardLayout title="ATM Mode">
        <div className="max-w-sm mx-auto animate-fade-in-scale">
          <Card className="glass-card border-border/50 shadow-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow animate-float">
                <Lock className="h-8 w-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-xl font-bold">{selectedUser.name}</CardTitle>
              <p className="text-sm text-muted-foreground">Enter PIN to continue</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="password"
                placeholder="Enter PIN"
                value={pin}
                onChange={e => setPin(e.target.value)}
                maxLength={6}
                className="text-center text-2xl tracking-widest rounded-xl bg-muted/30 border-border/50 h-14"
                onKeyDown={e => e.key === "Enter" && verifyPin()}
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBack} className="flex-1 rounded-xl border-border/50">Back</Button>
                <Button onClick={verifyPin} className="flex-1 rounded-xl gradient-primary text-primary-foreground font-semibold hover:scale-[1.02] transition-transform">Verify</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="ATM Mode">
      <div className="max-w-sm mx-auto animate-fade-in-scale">
        <Card className="glass-card border-border/50 shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 w-16 h-16 rounded-2xl bg-warning/15 flex items-center justify-center animate-float">
              <Coins className="h-8 w-8 text-warning" />
            </div>
            <CardTitle className="text-xl font-bold">{selectedUser.name}</CardTitle>
            <div className="stat-value text-4xl mt-2">{selectedUser.points}</div>
            <p className="text-sm text-muted-foreground">Available Points</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="font-medium">Amount</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min={1}
                className="rounded-xl bg-muted/30 border-border/50 h-12 text-lg text-center"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => updatePoints.mutate(Number(amount))}
                disabled={!amount || Number(amount) <= 0 || updatePoints.isPending}
                className="rounded-xl h-11 gradient-primary text-primary-foreground font-semibold hover:scale-[1.02] transition-transform"
              >
                <Plus className="h-4 w-4 mr-1" />Add
              </Button>
              <Button
                variant="outline"
                onClick={() => updatePoints.mutate(-Number(amount))}
                disabled={!amount || Number(amount) <= 0 || updatePoints.isPending}
                className="rounded-xl h-11 border-border/50 font-semibold hover:border-destructive/30 hover:text-destructive transition-colors"
              >
                <Minus className="h-4 w-4 mr-1" />Withdraw
              </Button>
            </div>
            <Button variant="ghost" onClick={handleBack} className="w-full rounded-xl text-muted-foreground hover:text-foreground">
              Select Another User
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}