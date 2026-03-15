import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Award } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface LeaderboardEntry {
  user_id: string;
  name: string;
  count: number;
}

export default function AttendanceLeaderboard() {
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ["attendance-leaderboard"],
    queryFn: async () => {
      const { data: users } = await supabase.from("users").select("id, name");
      const { data: attendance } = await supabase.from("attendance").select("user_id");

      const counts: Record<string, number> = {};
      attendance?.forEach((r) => {
        counts[r.user_id] = (counts[r.user_id] || 0) + 1;
      });

      return (users || [])
        .map((u) => ({ user_id: u.id, name: u.name, count: counts[u.id] || 0 }))
        .sort((a, b) => b.count - a.count) as LeaderboardEntry[];
    },
  });

  const getRankDisplay = (index: number) => {
    if (index === 0) return <Trophy className="h-4 w-4 text-warning" />;
    if (index === 1) return <Medal className="h-4 w-4 text-muted-foreground" />;
    if (index === 2) return <Award className="h-4 w-4 text-warning/60" />;
    return <span className="text-xs font-bold text-muted-foreground">{index + 1}</span>;
  };

  return (
    <div className="glass-card overflow-hidden animate-slide-up" style={{ animationDelay: "0.5s" }}>
      <div className="flex items-center gap-2 p-6 pb-4">
        <div className="w-8 h-8 rounded-lg bg-warning/15 flex items-center justify-center">
          <Trophy className="h-4 w-4 text-warning" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Attendance Leaderboard</h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : !leaderboard?.length ? (
        <p className="text-sm text-muted-foreground text-center py-8">No users yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="font-bold w-16 text-center">#</TableHead>
              <TableHead className="font-bold">Name</TableHead>
              <TableHead className="font-bold text-right">Attendance Count</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaderboard.map((entry, i) => (
              <TableRow
                key={entry.user_id}
                className={`border-border/50 animate-fade-in hover:bg-accent/30 transition-colors ${i === 0 ? "bg-warning/5" : ""}`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <TableCell className="text-center">
                  <div className="flex items-center justify-center">{getRankDisplay(i)}</div>
                </TableCell>
                <TableCell className="font-semibold">{entry.name}</TableCell>
                <TableCell className="text-right">
                  <span className="font-bold gradient-text">{entry.count}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
