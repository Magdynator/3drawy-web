import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, User as UserIcon, Coins } from "lucide-react";

export default function DirectPointsDialog() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [amount, setAmount] = useState(1);
    const [reason, setReason] = useState("");

    const { data: users, isLoading: usersLoading } = useQuery({
        queryKey: ["users-search", search],
        queryFn: async () => {
            if (!search.trim()) return [];
            const { data, error } = await supabase
                .from("users")
                .select("id, name, points, barcode")
                .or(`name.ilike.%${search}%,barcode.ilike.%${search}%`)
                .limit(5);
            if (error) throw error;
            return data;
        },
        enabled: search.length > 2,
    });

    const addPoints = useMutation({
        mutationFn: async () => {
            if (!selectedUser) throw new Error("Please select a user");
            // @ts-ignore
            const { error } = await supabase.rpc("add_points_super_admin", {
                _user_id: selectedUser.id,
                _amount: amount,
                _reason: reason || "Direct addition by super admin",
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
            toast({
                title: "Points added successfully",
                description: `Added ${amount} points to ${selectedUser.name}`
            });
            setOpen(false);
            resetForm();
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const resetForm = () => {
        setSelectedUser(null);
        setSearch("");
        setAmount(1);
        setReason("");
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-start rounded-xl border-border/50 hover:bg-success/5 hover:text-success hover:border-success/30 h-10 px-4">
                    <Coins className="h-4 w-4 mr-2" />
                    Add Points (Secure)
                </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Coins className="h-5 w-5 text-success" />
                        Direct Points Allocation
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                    {!selectedUser ? (
                        <div className="space-y-3">
                            <Label>Search User (Min 3 chars)</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name or barcode..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9 rounded-xl"
                                />
                            </div>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                                {usersLoading && <p className="text-xs text-muted-foreground p-2">Searching...</p>}
                                {users?.map((u: any) => (
                                    <button
                                        key={u.id}
                                        onClick={() => setSelectedUser(u)}
                                        className="w-full text-left p-3 rounded-xl hover:bg-accent transition-colors flex items-center justify-between group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <UserIcon className="h-4 w-4 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm">{u.name}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase">{u.barcode}</p>
                                            </div>
                                        </div>
                                        <Plus className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                ))}
                                {search.length > 2 && users?.length === 0 && (
                                    <p className="text-xs text-muted-foreground p-2 text-center">No users found</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10">
                                <div className="flex items-center gap-2">
                                    <UserIcon className="h-4 w-4 text-primary" />
                                    <span className="font-bold">{selectedUser.name}</span>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)} className="h-7 text-xs">Change</Button>
                            </div>

                            <div className="space-y-2">
                                <Label>Point Amount</Label>
                                <Input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                                    className="rounded-xl"
                                    min="1"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Reason (Optional)</Label>
                                <Input
                                    placeholder="e.g. Activity bonus, Manual adjustment"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>

                            <Button
                                onClick={() => addPoints.mutate()}
                                className="w-full rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow"
                                disabled={addPoints.isPending || amount < 1}
                            >
                                {addPoints.isPending ? "Allocating..." : "Confirm Allocation"}
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
