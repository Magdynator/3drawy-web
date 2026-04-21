import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Users } from "lucide-react";
import UserCard from "@/components/UserCard";
import { Database } from "@/integrations/supabase/types";
import { logActivity } from "@/utils/activityLogging";

type AppRole = Database["public"]["Enums"]["app_role"];

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

export default function UserManagement() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", phone: "", address: "",
    birthday: "", pin: "", notes: "",
    academicYear: "",
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

  const getStartingYearFromLevel = (level: number) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 9 ? year - level + 1 : year - level;
  };

  const isSuperAdmin = currentUser?.role === "super_admin";
  const isAdmin = currentUser?.role === "admin" || isSuperAdmin;

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("users").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const saveUser = useMutation({
    mutationFn: async () => {
      const starting_year = form.academicYear ? getStartingYearFromLevel(parseInt(form.academicYear)) : null;
      if (editingUser) {
        const { error } = await supabase.from("users").update({
          name: form.name,
          phone: form.phone || null,
          address: form.address || null,
          birthday: form.birthday || null,
          pin: form.pin || null,
          notes: form.notes || null,
          starting_year,
        }).eq("id", editingUser.id);
        if (error) throw error;

        await logActivity(
          currentUser?.id,
          "UPDATE_USER",
          `Updated user: ${form.name}`,
          editingUser.id
        );
      } else {
        const barcode = `USR-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const { error } = await supabase.from("users").insert({
          name: form.name,
          phone: form.phone || null,
          address: form.address || null,
          role: "user" as any,
          birthday: form.birthday || null,
          pin: form.pin || null,
          notes: form.notes || null,
          barcode,
          starting_year,
        });
        if (error) throw error;

        await logActivity(
          currentUser?.id,
          "CREATE_USER",
          `Created new user: ${form.name}`
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users-count"] });
      setDialogOpen(false);
      setEditingUser(null);
      setForm({ name: "", phone: "", address: "", birthday: "", pin: "", notes: "", academicYear: "" });
      toast({ title: editingUser ? "User updated successfully" : "User added successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("delete_user_by_admin", {
        target_user_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users-count"] });
      setDeleteConfirmOpen(false);
      setTargetUser(null);
      toast({ title: "User deleted successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error deleting user", description: err.message, variant: "destructive" });
    }
  });

  const openEdit = (user: any) => {
    setEditingUser(user);
    const level = getLevel(user.starting_year);
    setForm({
      name: user.name,
      phone: user.phone || "",
      address: user.address || "",
      birthday: user.birthday || "",
      pin: user.pin || "",
      notes: user.notes || "",
      academicYear: level ? level.toString() : "",
    });
    setDialogOpen(true);
  };

  const filtered = users?.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.toLowerCase().includes(search.toLowerCase());

    if (filterYear === "all") return matchesSearch;

    const level = getLevel(u.starting_year);
    const matchesYear = filterYear === "5" ? (level && level >= 5) : (level && level.toString() === filterYear);

    return matchesSearch && matchesYear;
  });

  return (
    <DashboardLayout title="User Management">
      <div className="flex flex-col gap-4 mb-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 rounded-xl bg-card/80 border-border/50"
            />
          </div>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setEditingUser(null);
                setForm({ name: "", phone: "", address: "", birthday: "", pin: "", notes: "", academicYear: "" });
              }
            }}>
              <DialogTrigger asChild>
                <Button className="rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow hover:shadow-glow-lg hover:scale-[1.02] transition-all">
                  <Plus className="h-4 w-4 mr-2" />Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={e => { e.preventDefault(); saveUser.mutate(); }} className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>Academic Year</Label>
                      <Select value={form.academicYear} onValueChange={val => setForm(f => ({ ...f, academicYear: val }))}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Select Year" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1st Year</SelectItem>
                          <SelectItem value="2">2nd Year</SelectItem>
                          <SelectItem value="3">3rd Year</SelectItem>
                          <SelectItem value="4">4th Year</SelectItem>
                          <SelectItem value="5">Graduate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>Birthday</Label>
                      <Input type="date" value={form.birthday} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))} className="rounded-xl" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>PIN (for ATM mode)</Label>
                    <Input value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))} maxLength={6} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="rounded-xl" />
                  </div>
                  <Button type="submit" className="w-full rounded-xl gradient-primary text-primary-foreground font-semibold hover:scale-[1.02] transition-transform mt-2" disabled={saveUser.isPending}>
                    {saveUser.isPending ? "Saving..." : editingUser ? "Save Changes" : "Add User"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {["all", "1", "2", "3", "4", "5"].map((year) => (
            <Button
              key={year}
              variant={filterYear === year ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterYear(year)}
              className="rounded-full px-4"
            >
              {year === "all" ? "All Users" :
                year === "5" ? "Graduates" :
                  `${year}${year === "1" ? "st" : year === "2" ? "nd" : year === "3" ? "rd" : "th"} Year`}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered?.map((user, i) => (
            <div key={user.id} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
              <UserCard
                user={user}
                onEdit={isAdmin ? () => openEdit(user) : undefined}
                onDelete={isAdmin ? () => { setTargetUser(user); setDeleteConfirmOpen(true); } : undefined}
              />
            </div>
          ))}
          {filtered?.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground">No users found.</p>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{targetUser?.name}</strong> and all their associated records (attendance, points, etc.).
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => targetUser && deleteUser.mutate(targetUser.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}