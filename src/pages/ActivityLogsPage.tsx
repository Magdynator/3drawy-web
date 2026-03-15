import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { format } from "date-fns";
import { Shield, ListRestart, User as UserIcon, Activity } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

export default function ActivityLogsPage() {
    const { currentUser } = useAuth();
    const isSuperAdmin = currentUser?.role === "super_admin";

    const { data: logs, isLoading } = useQuery({
        queryKey: ["activity-logs"],
        queryFn: async () => {
            // Try with admin join first
            const { data, error } = await supabase
                .from("activity_logs")
                .select("*, admin:admins!activity_logs_performed_by_fkey(name)")
                .order("created_at", { ascending: false })
                .limit(100);
            // If join fails (FK might not exist yet), fall back to simple select
            if (error) {
                const { data: fallback, error: fbErr } = await supabase
                    .from("activity_logs")
                    .select("*")
                    .order("created_at", { ascending: false })
                    .limit(100);
                if (fbErr) throw fbErr;
                return fallback;
            }
            return data;
        },
        enabled: isSuperAdmin,
    });

    if (!isSuperAdmin) {
        return <Navigate to="/" replace />;
    }

    return (
        <DashboardLayout title="System Activity Logs">
            <div className="flex items-center gap-3 mb-6 animate-fade-in">
                <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-destructive" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-foreground">Audit Trail</h2>
                    <p className="text-sm text-muted-foreground">Showing the last 100 high-priority system actions</p>
                </div>
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
                                <TableHead className="font-bold">Timestamp</TableHead>
                                <TableHead className="font-bold">Admin</TableHead>
                                <TableHead className="font-bold">Action</TableHead>
                                <TableHead className="font-bold">Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
                                                <Activity className="h-7 w-7 text-muted-foreground/50" />
                                            </div>
                                            No activity logs found.
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs?.map((log, i) => (
                                    <TableRow
                                        key={log.id}
                                        className="border-border/50 animate-fade-in hover:bg-accent/30 transition-colors"
                                        style={{ animationDelay: `${i * 20}ms` }}
                                    >
                                        <TableCell className="text-sm opacity-70">
                                            {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <UserIcon className="h-3 w-3 text-muted-foreground" />
                                                <span className="font-medium">{(log as any)?.admin?.name || "System"}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${log.action === 'ADD_POINTS' ? 'bg-success/10 text-success border border-success/20' :
                                                log.action === 'DELETE_USER' ? 'bg-destructive/10 text-destructive border border-destructive/20' :
                                                    'bg-info/10 text-info border border-info/20'
                                                }`}>
                                                {log.action.replace('_', ' ')}
                                            </span>
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate text-sm">
                                            {log.details || "—"}
                                        </TableCell>
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
