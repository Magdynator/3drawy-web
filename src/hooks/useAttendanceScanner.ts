import { useRef, useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek } from "date-fns";
import { logActivity } from "@/utils/activityLogging";

export function useAttendanceScanner() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);
  const processingRef = useRef(false);
  const lastBarcodeRef = useRef<string | null>(null);

  const recordAttendance = useMutation({
    mutationFn: async (barcode: string) => {
      if (processingRef.current) return null;
      if (lastBarcodeRef.current === barcode) return null;
      processingRef.current = true;
      lastBarcodeRef.current = barcode;

      const { data: user, error: userErr } = await supabase
        .from("users")
        .select("id, name")
        .eq("barcode", barcode)
        .single();
      if (userErr || !user) throw new Error("User not found for this barcode");

      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 2 }), "yyyy-MM-dd");

      const { data: existing } = await supabase
        .from("attendance")
        .select("id")
        .eq("user_id", user.id)
        .eq("week_start", weekStart)
        .maybeSingle();

      if (existing) throw new Error(`${user.name} already recorded this week`);

      // Try with scanned_by first; if FK constraint fails, retry without it
      const { error } = await supabase.from("attendance").insert({
        user_id: user.id,
        scanned_by: currentUser?.id || null,
        week_start: weekStart,
      });
      if (error) {
        if (error.message?.includes("foreign key constraint")) {
          console.warn("FK constraint on scanned_by failed, retrying without it:", error.message);
          const { error: retryErr } = await supabase.from("attendance").insert({
            user_id: user.id,
            scanned_by: null,
            week_start: weekStart,
          });
          if (retryErr) throw retryErr;
        } else {
          throw error;
        }
      }

      const { error: pointsErr } = await supabase.rpc("increment_points", {
        _user_id: user.id,
        _amount: 2,
      });
      if (pointsErr) throw pointsErr;

      // Auto-assign bingo number (1-300, unique per week)
      const { data: usedNumbers } = await supabase
        .from("bingo_numbers")
        .select("bingo_number")
        .eq("week_start", weekStart);
      const used = new Set((usedNumbers || []).map((n) => n.bingo_number));
      const available: number[] = [];
      for (let i = 1; i <= 300; i++) {
        if (!used.has(i)) available.push(i);
      }
      if (available.length > 0) {
        const bingo = available[Math.floor(Math.random() * available.length)];
        await supabase.from("bingo_numbers").insert({
          user_id: user.id,
          week_start: weekStart,
          bingo_number: bingo,
        });
      }

      await logActivity(currentUser?.id, "RECORD_ATTENDANCE", `Recorded attendance for ${user.name}`, user.id);

      return user.name;
    },
    onSuccess: (name) => {
      if (!name) return;
      setLastScanned(name);
      setScanSuccess(true);
      // Vibrate on success
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Attendance recorded!", description: `${name} +2 points` });
      setTimeout(() => setScanSuccess(false), 3000);
    },
    onError: (err: any) => {
      console.error("Attendance scan error:", err);
      console.error("Payload details:", {
        adminId: currentUser?.id,
        adminName: currentUser?.name,
        errorHint: err?.hint,
        errorDetails: err?.details
      });

      if (navigator.vibrate) navigator.vibrate(300);
      toast({
        title: "Scan error",
        description: err.message || "Failed to record attendance. Check console for details.",
        variant: "destructive"
      });
    },
    onSettled: () => {
      processingRef.current = false;
      // Allow same barcode after 5s cooldown
      setTimeout(() => {
        lastBarcodeRef.current = null;
      }, 5000);
    },
  });

  const resetLastScanned = useCallback(() => {
    setLastScanned(null);
    lastBarcodeRef.current = null;
  }, []);

  return {
    recordAttendance,
    lastScanned,
    scanSuccess,
    processingRef,
    resetLastScanned,
  };
}
