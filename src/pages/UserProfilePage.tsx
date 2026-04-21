import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Phone, MapPin, Calendar, Star, ClipboardList, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function UserProfilePage() {
  const { userId } = useParams();

  const { data: user, isLoading } = useQuery({
    queryKey: ["user", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("users").select("*").eq("id", userId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const getLevel = (startingYear: number | null) => {
    if (!startingYear) return null;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    let level = year - startingYear;
    if (month >= 9) level++;
    if (level < 1) level = 1;
    return level;
  };

  const getLevelName = (level: number | null) => {
    if (level === null) return null;
    if (level === 1) return "1st Year";
    if (level === 2) return "2nd Year";
    if (level === 3) return "3rd Year";
    if (level === 4) return "4th Year";
    return "Graduate";
  };

  const level = getLevel(user?.starting_year);
  const levelName = getLevelName(level);

  const { data: closestEvent } = useQuery({
    queryKey: ["closest-event"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .gte("start_date", new Date().toISOString())
        .order("start_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: attendanceCount } = useQuery({
    queryKey: ["user-attendance-count", userId],
    queryFn: async () => {
      const { count } = await supabase
        .from("attendance")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId!);
      return count || 0;
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">User not found.</p>
      </div>
    );
  }

  const profileUrl = `${window.location.origin}/user/${user.id}`;

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-primary/10 blur-3xl animate-pulse-glow" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-accent/20 blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />

      <Card className="w-full max-w-md glass-card border-border/50 shadow-2xl animate-fade-in-scale relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center shadow-glow animate-float">
            <User className="h-10 w-10 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-extrabold">
            <span className="gradient-text">{user.name}</span>
          </CardTitle>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            <Badge variant="outline" className="rounded-full px-3 border-primary/20 bg-primary/5 text-primary font-medium">
              {user.role.replace("_", " ")}
            </Badge>
            {levelName && (
              <Badge variant="secondary" className="rounded-full px-3 bg-secondary/50 text-secondary-foreground font-medium">
                {levelName}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {user.phone && (
              <div className="flex items-center gap-2 text-muted-foreground p-2.5 rounded-xl bg-muted/30">
                <Phone className="h-4 w-4 text-primary" /> {user.phone}
              </div>
            )}
            {user.birthday && (
              <div className="flex items-center gap-2 text-muted-foreground p-2.5 rounded-xl bg-muted/30">
                <Calendar className="h-4 w-4 text-primary" /> {format(parseISO(user.birthday), "MMM d, yyyy")}
              </div>
            )}
            {user.address && (
              <div className="flex items-center gap-2 text-muted-foreground col-span-2 p-2.5 rounded-xl bg-muted/30">
                <MapPin className="h-4 w-4 text-primary" /> {user.address}
              </div>
            )}
            <div className="flex items-center gap-2 col-span-2 p-3 rounded-xl bg-accent/50 border border-primary/10">
              <Star className="h-5 w-5 text-warning" />
              <span className="font-extrabold gradient-text text-lg">{user.points}</span>
              <span className="text-sm text-muted-foreground">points</span>
            </div>
            <div className="flex items-center gap-2 col-span-2 p-3 rounded-xl bg-success/10 border border-success/10">
              <ClipboardList className="h-5 w-5 text-success" />
              <span className="font-extrabold gradient-text text-lg">{attendanceCount ?? 0}</span>
              <span className="text-sm text-muted-foreground">total attendance</span>
            </div>
            {closestEvent && (
              <div className="flex flex-col gap-1 col-span-2 p-3 rounded-xl bg-info/10 border border-info/10">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-info" />
                  <span className="font-bold text-info">Closest Event</span>
                </div>
                <div className="pl-7">
                  <p className="font-semibold text-foreground text-base capitalize">{closestEvent.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(closestEvent.start_date), "EEEE, MMMM d, yyyy")} at {format(parseISO(closestEvent.start_date), "h:mm a")}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border/50 pt-5 space-y-5">
            <div className="text-center">
              <p className="text-xs font-medium text-muted-foreground mb-3">QR Code (Profile Link)</p>
              <div className="inline-block bg-card p-4 rounded-2xl border border-border/50 shadow-sm">
                <QRCodeSVG value={profileUrl} size={140} />
              </div>
            </div>
            {user.barcode && (
              <div className="text-center">
                <p className="text-xs font-medium text-muted-foreground mb-3">Barcode (Attendance)</p>
                <div className="inline-block bg-card p-3 rounded-2xl border border-border/50 shadow-sm overflow-hidden max-w-full">
                  <Barcode value={user.barcode} width={0.8} height={40} fontSize={8} margin={2} />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}