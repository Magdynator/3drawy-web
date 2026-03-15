import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, AppAdmin } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Shield, ShieldAlert, Mail, User, Pencil, Trash2 } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdminManagement() {
    const { currentUser } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [targetAdmin, setTargetAdmin] = useState<AppAdmin | null>(null);
    const [editingAdmin, setEditingAdmin] = useState<AppAdmin | null>(null);
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        role: "admin" as "admin" | "super_admin",
    });

    const isSuperAdmin = currentUser?.role === "super_admin";

    const { data: admins, isLoading } = useQuery({
        queryKey: ["admins"],
        queryFn: async () => {
            // @ts-ignore
            const { data, error } = await supabase.from("admins").select("*").order("name");
            if (error) throw error;
            return data as unknown as AppAdmin[];
        },
        enabled: isSuperAdmin,
    });

    const addAdmin = useMutation({
        mutationFn: async () => {
            if (!isSuperAdmin) throw new Error("Only super admins can manage accounts");

            if (editingAdmin) {
                // @ts-ignore
                const { error } = await supabase.rpc("update_admin_user", {
                    target_auth_id: editingAdmin.auth_id,
                    new_email: form.email,
                    new_password: form.password || null,
                    new_name: form.name,
                    new_role: form.role,
                });
                if (error) throw error;
            } else {
                // @ts-ignore
                const { error } = await supabase.rpc("create_new_admin", {
                    new_email: form.email,
                    new_password: form.password,
                    new_name: form.name,
                    new_role: form.role,
                });
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admins"] });
            setDialogOpen(false);
            setEditingAdmin(null);
            setForm({ name: "", email: "", password: "", role: "admin" });
            toast({ title: editingAdmin ? "Admin updated" : "Admin created" });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const deleteAdmin = useMutation({
        mutationFn: async (authId: string) => {
            // @ts-ignore
            const { error } = await supabase.rpc("delete_admin_user", {
                target_auth_id: authId
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admins"] });
            toast({ title: "Admin deleted" });
            setDeleteConfirmOpen(false);
            setTargetAdmin(null);
        },
        onError: (err: Error) => {
            toast({ title: "Error deleting admin", description: err.message, variant: "destructive" });
        }
    });

    const openEdit = (admin: AppAdmin) => {
        setEditingAdmin(admin);
        setForm({
            name: admin.name,
            email: admin.email,
            password: "",
            role: admin.role as any,
        });
        setDialogOpen(true);
    };

    if (!isSuperAdmin) {
        return (
            <DashboardLayout title="Access Denied">
                <div className="flex flex-col items-center justify-center py-20">
                    <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
                    <h2 className="text-2xl font-bold">Super Admin Access Required</h2>
                    <p className="text-muted-foreground mt-2">You do not have permission to view this page.</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Admin Management">
            <div className="flex justify-between items-center mb-6 animate-fade-in">
                <div>
                    <h2 className="text-xl font-bold">Dashboard Administrators</h2>
                    <p className="text-sm text-muted-foreground">Manage users with dashboard login access</p>
                </div>

                <Dialog open={dialogOpen} onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) {
                        setEditingAdmin(null);
                        setForm({ name: "", email: "", password: "", role: "admin" });
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button className="rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow hover:shadow-glow-lg hover:scale-[1.02] transition-all">
                            <Plus className="h-4 w-4 mr-2" />Add Admin
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold">{editingAdmin ? "Edit Administrator" : "Add New Administrator"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={e => { e.preventDefault(); addAdmin.mutate(); }} className="space-y-4 pt-2">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label>Password {editingAdmin && "(Leave blank to keep current)"}</Label>
                                <Input type="password" required={!editingAdmin} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} minLength={6} className="rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as "admin" | "super_admin" }))}>
                                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="super_admin">Super Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button type="submit" className="w-full rounded-xl gradient-primary text-primary-foreground font-semibold hover:scale-[1.02] transition-transform mt-4" disabled={addAdmin.isPending}>
                                {addAdmin.isPending ? "Saving..." : editingAdmin ? "Save Changes" : "Create Administrator"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {admins?.map((admin, i) => (
                        <div key={admin.id} className="group dashboard-card relative overflow-hidden animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                            <div className="relative p-5">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                        <Shield className="h-5 w-5" />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase h-fit ${admin.role === 'super_admin' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                                            }`}>
                                            {admin.role.replace('_', ' ')}
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => openEdit(admin)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                                                disabled={admin.auth_id === currentUser?.id}
                                                onClick={() => {
                                                    setTargetAdmin(admin);
                                                    setDeleteConfirmOpen(true);
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <h3 className="font-bold text-lg mb-1">{admin.name}</h3>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                                    <Mail className="h-3.5 w-3.5" />
                                    {admin.email}
                                </div>
                            </div>
                        </div>
                    ))}
                    {admins?.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-16">
                            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                                <User className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                            <p className="text-muted-foreground">No administrators found.</p>
                        </div>
                    )}
                </div>
            )}

            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Administrator?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the admin account for <strong>{targetAdmin?.name}</strong>.
                            They will no longer be able to log in to the dashboard.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => targetAdmin && deleteAdmin.mutate(targetAdmin.auth_id)}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </DashboardLayout>
    );
}
