import { useParams, useNavigate } from "react-router-dom";
import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ArrowLeft, CalendarDays, Activity, User, Phone, MapPin, Database, FileText, Barcode as BarcodeIcon, Download, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import ReactBarcode from "react-barcode";
import { downloadSvgAsPng } from "@/utils/downloadCode";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default function AdminUserDetailPage() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const qrRef = useRef<HTMLDivElement>(null);
    const barcodeRef = useRef<HTMLDivElement>(null);

    // Fetch target user details
    const { data: user, isLoading: userLoading } = useQuery({
        queryKey: ["admin-user-detail", userId],
        queryFn: async () => {
            const { data, error } = await supabase.from("users").select("*").eq("id", userId).single();
            if (error) throw error;
            return data;
        },
        enabled: !!userId,
    });

    // Fetch admins list to map performing IDs to names
    const { data: admins } = useQuery({
        queryKey: ["admins"],
        queryFn: async () => {
            // @ts-ignore
            const { data, error } = await supabase.from("admins").select("id, name, role");
            if (error) throw error;
            return data;
        },
    });

    const getAdminName = (id: string | null, recordAdmin?: any) => {
        if (!id) return "System/Unknown";
        if (recordAdmin?.name) return recordAdmin.name;

        const adminList = admins as any[] || [];
        const admin = adminList.find(a => a.id === id);
        return admin ? `${admin.name} (${admin.role.replace('_', ' ')})` : id;
    };

    // Fetch user's attendance history with admin join fallback
    const { data: attendanceHistory, isLoading: attendanceLoading } = useQuery({
        queryKey: ["user-attendance-history", userId],
        queryFn: async () => {
            // Try with join first, though FK might be missing
            const { data, error } = await supabase
                .from("attendance")
                .select("*, admin:admins(name)")
                .eq("user_id", userId)
                .order("scanned_at", { ascending: false });

            if (error) {
                const { data: fallback, error: err2 } = await supabase
                    .from("attendance")
                    .select("*")
                    .eq("user_id", userId)
                    .order("scanned_at", { ascending: false });
                if (err2) throw err2;
                return fallback;
            }
            return data;
        },
        enabled: !!userId,
    });

    // Fetch activity logs targeting this user with admin join fallback
    const { data: activityLogs, isLoading: logsLoading } = useQuery({
        queryKey: ["user-activity-logs", userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("activity_logs")
                .select("*, admin:admins!activity_logs_performed_by_fkey(name)")
                .eq("target_id", userId)
                .order("created_at", { ascending: false });

            if (error) {
                const { data: fallback, error: err2 } = await supabase
                    .from("activity_logs")
                    .select("*")
                    .eq("target_id", userId)
                    .order("created_at", { ascending: false });
                if (err2) throw err2;
                return fallback;
            }
            return data;
        },
        enabled: !!userId,
    });

    if (userLoading) {
        return (
            <DashboardLayout title="User Profile">
                <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
            </DashboardLayout>
        );
    }

    if (!user) {
        return (
            <DashboardLayout title="User Not Found">
                <div className="text-center py-20">
                    <p className="text-muted-foreground">This user does not exist or has been deleted.</p>
                    <Button variant="outline" onClick={() => navigate("/users")} className="mt-4 rounded-xl">Go Back</Button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Admin Profile View">
            <div className="max-w-5xl mx-auto animate-fade-in space-y-6">
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            {user.name} <span className="text-sm font-normal text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">Admin View</span>
                        </h2>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                            <BarcodeIcon className="h-4 w-4" /> {user.barcode}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Column: Details */}
                    <div className="md:col-span-1 space-y-6">
                        <Card className="glass-card shadow-lg border-primary/10">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <User className="h-5 w-5 text-primary" /> Contact Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg shrink-0 mt-0.5"><Phone className="h-4 w-4 text-primary" /></div>
                                    <div>
                                        <p className="text-sm font-medium">Phone Number</p>
                                        <p className="text-sm text-muted-foreground">{user.phone || "Not provided"}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg shrink-0 mt-0.5"><MapPin className="h-4 w-4 text-primary" /></div>
                                    <div>
                                        <p className="text-sm font-medium">Address</p>
                                        <p className="text-sm text-muted-foreground">{user.address || "Not provided"}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-warning/10 rounded-lg shrink-0 mt-0.5"><Database className="h-4 w-4 text-warning" /></div>
                                    <div>
                                        <p className="text-sm font-medium">Total Points</p>
                                        <p className="text-sm text-muted-foreground font-bold gradient-text">{user.points}</p>
                                    </div>
                                </div>
                                {user.birthday && (
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-info/10 rounded-lg shrink-0 mt-0.5"><CalendarDays className="h-4 w-4 text-info" /></div>
                                        <div>
                                            <p className="text-sm font-medium">Birthday</p>
                                            <p className="text-sm text-muted-foreground">{format(new Date(user.birthday), "do MMMM, yyyy")}</p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="glass-card border-border/50 shadow-md">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2 text-warning">
                                    <FileText className="h-5 w-5" /> Private Notes
                                </CardTitle>
                                <CardDescription>Visible only to administrators</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {user.notes ? (
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap p-4 bg-muted/30 rounded-xl border border-border/50 italic">
                                        {user.notes}
                                    </p>
                                ) : (
                                    <p className="text-sm text-muted-foreground/50 italic text-center py-4">No notes added for this user.</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Codes Card */}
                        <Card className="glass-card border-border/50 shadow-md">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2 text-primary">
                                    <QrCode className="h-5 w-5" /> Codes
                                </CardTitle>
                                <CardDescription>QR code & barcode for this user</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="text-center">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">QR Code (Profile Link)</p>
                                    <div ref={qrRef} className="inline-block bg-card p-3 rounded-xl border border-border/50">
                                        <QRCodeSVG value={`${window.location.origin}/user/${user.id}`} size={120} />
                                    </div>
                                    <div className="mt-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="rounded-xl text-xs gap-1.5"
                                            onClick={() => downloadSvgAsPng(qrRef.current, `${user.name.replace(/\s+/g, "-").toLowerCase()}-qrcode.png`)}
                                        >
                                            <Download className="h-3.5 w-3.5" /> Download QR
                                        </Button>
                                    </div>
                                </div>
                                {user.barcode && (
                                    <div className="text-center border-t border-border/30 pt-4">
                                        <p className="text-xs font-medium text-muted-foreground mb-2">Barcode (Attendance)</p>
                                        <div ref={barcodeRef} className="inline-block bg-card p-2 rounded-xl border border-border/50 overflow-hidden max-w-full">
                                            <ReactBarcode value={user.barcode} width={0.7} height={36} fontSize={8} margin={2} />
                                        </div>
                                        <div className="mt-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="rounded-xl text-xs gap-1.5"
                                                onClick={() => downloadSvgAsPng(barcodeRef.current, `${user.name.replace(/\s+/g, "-").toLowerCase()}-barcode.png`)}
                                            >
                                                <Download className="h-3.5 w-3.5" /> Download Barcode
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Timelines */}
                    <div className="md:col-span-2">
                        <Card className="glass-card border-border/50 shadow-xl h-full">
                            <Tabs defaultValue="attendance" className="w-full flex flex-col h-full">
                                <CardHeader className="pb-2 border-b border-border/50">
                                    <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted/50 p-1">
                                        <TabsTrigger value="attendance" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-semibold">
                                            <CalendarDays className="h-4 w-4 mr-2" /> Attendance
                                        </TabsTrigger>
                                        <TabsTrigger value="logs" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-semibold">
                                            <Activity className="h-4 w-4 mr-2" /> Activity Logs
                                        </TabsTrigger>
                                    </TabsList>
                                </CardHeader>

                                <CardContent className="pt-4 flex-1">
                                    <TabsContent value="attendance" className="m-0 focus-visible:outline-none">
                                        {attendanceLoading ? (
                                            <p className="text-center text-muted-foreground py-10">Loading attendance...</p>
                                        ) : attendanceHistory && attendanceHistory.length > 0 ? (
                                            <div className="rounded-xl overflow-hidden border border-border/50">
                                                <Table>
                                                    <TableHeader className="bg-muted/50">
                                                        <TableRow>
                                                            <TableHead>Date / Time</TableHead>
                                                            <TableHead>Week Start</TableHead>
                                                            <TableHead>Scanned By</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {attendanceHistory.map((record) => (
                                                            <TableRow key={record.id} className="hover:bg-muted/30 transition-colors">
                                                                <TableCell className="font-medium">
                                                                    {format(new Date(record.scanned_at), "MMM d, h:mm a")}
                                                                </TableCell>
                                                                <TableCell className="text-muted-foreground">
                                                                    {record.week_start}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <span className="text-xs font-mono bg-muted/80 px-2 py-1 rounded">
                                                                        {getAdminName(record.scanned_by, (record as any).admin)}
                                                                    </span>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        ) : (
                                            <div className="text-center py-16 flex flex-col items-center">
                                                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                                                    <CalendarDays className="h-8 w-8 text-muted-foreground/30" />
                                                </div>
                                                <p className="text-muted-foreground font-medium">No attendance records found.</p>
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="logs" className="m-0 focus-visible:outline-none">
                                        {logsLoading ? (
                                            <p className="text-center text-muted-foreground py-10">Loading logs...</p>
                                        ) : activityLogs && activityLogs.length > 0 ? (
                                            <div className="space-y-4">
                                                {activityLogs.map((log) => (
                                                    <div key={log.id} className="flex gap-4 p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card/80 transition-colors">
                                                        <div className="mt-1">
                                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                                <Activity className="h-4 w-4 text-primary" />
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 space-y-1">
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                                                <p className="font-semibold text-sm">
                                                                    {log.action.replace(/_/g, " ")}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {format(new Date(log.created_at), "MMM d, yyyy h:mm a")}
                                                                </p>
                                                            </div>
                                                            <p className="text-sm text-foreground/80">{log.details}</p>
                                                            <p className="text-xs text-muted-foreground pt-1">
                                                                By: {getAdminName(log.performed_by, (log as any).admin)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-16 flex flex-col items-center">
                                                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                                                    <Activity className="h-8 w-8 text-muted-foreground/30" />
                                                </div>
                                                <p className="text-muted-foreground font-medium">No activity logged for this user yet.</p>
                                            </div>
                                        )}
                                    </TabsContent>
                                </CardContent>
                            </Tabs>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
