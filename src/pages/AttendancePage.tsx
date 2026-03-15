import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { format, startOfWeek, addWeeks } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AttendancePage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const currentWeekStart = addWeeks(startOfWeek(new Date(), { weekStartsOn: 2 }), weekOffset);
  const weekStartStr = format(currentWeekStart, "yyyy-MM-dd");

  const { data: records, isLoading } = useQuery({
    queryKey: ["attendance", weekStartStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("*, user:users!attendance_user_id_fkey(name), scanner:users!attendance_scanned_by_fkey(name)")
        .eq("week_start", weekStartStr)
        .order("scanned_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <DashboardLayout title="Attendance">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => w - 1)} className="rounded-xl border-border/50 hover:border-primary/30">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-bold text-foreground">Week of {format(currentWeekStart, "MMM d, yyyy")}</p>
            <p className="text-xs text-muted-foreground">{records?.length || 0} records</p>
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => w + 1)} disabled={weekOffset >= 0} className="rounded-xl border-border/50 hover:border-primary/30">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="glass-card overflow-hidden animate-slide-up">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="font-bold">User</TableHead>
                <TableHead className="font-bold">Scanned At</TableHead>
                <TableHead className="font-bold">Scanned By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
                        <CalendarDays className="h-7 w-7 text-muted-foreground/50" />
                      </div>
                      No attendance records for this week.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                records?.map((record, i) => (
                  <TableRow 
                    key={record.id} 
                    className="border-border/50 animate-fade-in hover:bg-accent/30 transition-colors"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <TableCell className="font-semibold">{(record.user as any)?.name || "Unknown"}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(record.scanned_at), "EEE, MMM d HH:mm")}</TableCell>
                    <TableCell className="text-muted-foreground">{(record.scanner as any)?.name || "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </DashboardLayout>
  );
}