import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Download, Upload, AlertTriangle } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const TABLES = ["users", "events", "bingo_numbers", "attendance", "activity_logs"] as const;

export default function DatabaseBackupButtons() {
    const { toast } = useToast();
    const [isDownloading, setIsDownloading] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const backupData: Record<string, any[]> = {};

            for (const table of TABLES) {
                const { data, error } = await supabase.from(table).select("*");
                if (error) throw error;
                backupData[table] = data || [];
            }

            const blob = new Blob([JSON.stringify({
                version: "1.0",
                timestamp: new Date().toISOString(),
                data: backupData
            }, null, 2)], { type: "application/json" });

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `adrawya_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast({
                title: "Backup Complete",
                description: "Your database backup has been downloaded."
            });
        } catch (error: any) {
            console.error("Backup failed:", error);
            toast({
                title: "Backup Failed",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsDownloading(false);
        }
    };

    const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsRestoring(true);
        try {
            const text = await file.text();
            const backup = JSON.parse(text);

            if (!backup.data || typeof backup.data !== "object") {
                throw new Error("Invalid backup file format");
            }

            // Delete in reverse order of dependencies
            const deleteOrder = [...TABLES].reverse();
            for (const table of deleteOrder) {
                const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
                if (error) throw error;
            }

            // Insert in dependency order
            for (const table of TABLES) {
                const data = backup.data[table];
                if (data && data.length > 0) {
                    const { error } = await supabase.from(table).insert(data);
                    if (error) throw error;
                }
            }

            toast({
                title: "Restore Successful",
                description: "All data has been restored from the backup file."
            });

            // Reload page to reflect changes
            setTimeout(() => window.location.reload(), 1500);

        } catch (error: any) {
            console.error("Restore failed:", error);
            toast({
                title: "Restore Failed",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsRestoring(false);
            // Reset the input so the same file can be selected again
            event.target.value = "";
        }
    };

    return (
        <>
            <Button
                variant="outline"
                onClick={handleDownload}
                disabled={isDownloading || isRestoring}
                className="w-full justify-start rounded-xl border-border/50 hover:bg-primary/5 hover:text-primary hover:border-primary/30 h-10 px-4"
            >
                <Download className="h-4 w-4 mr-2" />
                {isDownloading ? "Exporting..." : "Download Backup"}
            </Button>

            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button
                        variant="outline"
                        disabled={isDownloading || isRestoring}
                        className="w-full justify-start rounded-xl border-border/50 hover:bg-destructive/5 hover:text-destructive hover:border-destructive/30 h-10 px-4"
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        {isRestoring ? "Restoring..." : "Restore Backup"}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Danger: Restore Data
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This action will **permanently delete** all current data and replace it with the data from your backup file. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                        <div className="relative">
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleRestore}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                id="restore-upload"
                            />
                            <AlertDialogAction asChild>
                                <Button variant="destructive" className="rounded-xl w-full">
                                    I understand, upload file
                                </Button>
                            </AlertDialogAction>
                        </div>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
