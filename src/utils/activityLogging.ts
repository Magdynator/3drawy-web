import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export async function logActivity(
    adminId: string | undefined | null,
    action: string,
    details: string,
    targetId?: string
) {
    if (!adminId) return; // Cannot log without an admin performing the action

    try {
        // @ts-ignore
        const { error } = await supabase.rpc("log_dashboard_action", {
            _action: action,
            _details: details,
            _target_id: targetId || null
        });

        if (error) {
            console.error("Failed to log activity:", error);
            toast({
                title: "Logging Error",
                description: "Supabase Error: " + error.message,
                variant: "destructive"
            });
        }
    } catch (err: any) {
        console.error("Failed to log activity:", err);
        toast({
            title: "Logging Exception",
            description: err.message || "Unknown error occurred",
            variant: "destructive"
        });
    }
}
