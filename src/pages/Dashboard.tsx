import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Users, ClipboardList, ScanLine, Wallet, Calendar as CalendarIcon, Plus, ChevronRight, Dices, Pencil, Trash2, Shield, Activity } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { format, isSameDay, startOfWeek, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import AttendanceLeaderboard from "@/components/AttendanceLeaderboard";
import DirectPointsDialog from "@/components/DirectPointsDialog";
import DatabaseBackupButtons from "@/components/DatabaseBackupButtons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [eventOpen, setEventOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [eventForm, setEventForm] = useState({
    name: "",
    details: "",
    start_date: "",
    start_time: "09:00",
    end_date: "",
    end_time: "17:00",
  });

  const { data: usersCount } = useQuery({
    queryKey: ["users-count"],
    queryFn: async () => {
      const { count } = await supabase.from("users").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: thisWeekAttendance } = useQuery({
    queryKey: ["this-week-attendance"],
    queryFn: async () => {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 2 });
      const weekStartStr = format(weekStart, "yyyy-MM-dd");
      const { count } = await supabase
        .from("attendance")
        .select("*", { count: "exact", head: true })
        .eq("week_start", weekStartStr);
      return count || 0;
    },
  });

  const { data: events } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("*").order("start_date", { ascending: true });
      return data || [];
    },
  });

  const createEvent = useMutation({
    mutationFn: async () => {
      const startISO = `${eventForm.start_date}T${eventForm.start_time}:00`;
      const endISO = `${eventForm.end_date || eventForm.start_date}T${eventForm.end_time}:00`;
      if (editingEvent) {
        const { error } = await supabase.from("events").update({
          name: eventForm.name,
          details: eventForm.details || null,
          start_date: startISO,
          end_date: endISO,
        }).eq("id", editingEvent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("events").insert({
          name: eventForm.name,
          details: eventForm.details || null,
          start_date: startISO,
          end_date: endISO,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({ title: editingEvent ? "Event updated!" : "Event created!" });
      closeEventDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({ title: "Event deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const closeEventDialog = () => {
    setEventOpen(false);
    setEditingEvent(null);
    setEventForm({ name: "", details: "", start_date: "", start_time: "09:00", end_date: "", end_time: "17:00" });
  };

  const openEditEvent = (event: any) => {
    const start = parseISO(event.start_date);
    const end = parseISO(event.end_date);
    setEditingEvent(event);
    setEventForm({
      name: event.name,
      details: event.details || "",
      start_date: format(start, "yyyy-MM-dd"),
      start_time: format(start, "HH:mm"),
      end_date: format(end, "yyyy-MM-dd"),
      end_time: format(end, "HH:mm"),
    });
    setEventOpen(true);
  };

  const eventDates = events?.map(e => parseISO(e.start_date)) || [];

  const isSuperAdmin = currentUser?.role === "super_admin";

  const cardColors = [
    { gradient: 'from-primary/10 to-primary/5', iconBg: 'bg-primary/15', iconColor: 'text-primary' },
    { gradient: 'from-success/10 to-success/5', iconBg: 'bg-success/15', iconColor: 'text-success' },
    { gradient: 'from-warning/10 to-warning/5', iconBg: 'bg-warning/15', iconColor: 'text-warning' },
    { gradient: 'from-info/10 to-info/5', iconBg: 'bg-info/15', iconColor: 'text-info' },
    { gradient: 'from-primary/10 to-accent/10', iconBg: 'bg-accent/30', iconColor: 'text-accent-foreground' },
    { gradient: 'from-destructive/10 to-destructive/5', iconBg: 'bg-destructive/15', iconColor: 'text-destructive' },
  ];

  const cards = [
    { title: "Users", value: usersCount ?? "—", subtitle: "Total members", icon: Users, onClick: () => navigate("/users") },
    { title: "Attendance", value: thisWeekAttendance ?? "—", subtitle: "This week records", icon: ClipboardList, onClick: () => navigate("/attendance") },
    { title: "Scanner", value: "Scan", subtitle: "Barcode scanner", icon: ScanLine, onClick: () => navigate("/scanner") },
    { title: "ATM Mode", value: "Points", subtitle: "Manage user points", icon: Wallet, onClick: () => navigate("/atm") },
    { title: "Bingo", value: "Draw", subtitle: "Weekly bingo draw", icon: Dices, onClick: () => navigate("/bingo") },
    ...(isSuperAdmin ? [{ title: "Admins", value: "Manage", subtitle: "System admins", icon: Shield, onClick: () => navigate("/admins") }] : []),
  ];

  const todayEvents = events?.filter(e => {
    if (!selectedDate) return false;
    return isSameDay(parseISO(e.start_date), selectedDate);
  }) || [];

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setEventForm(prev => ({
        ...prev,
        start_date: format(date, "yyyy-MM-dd"),
        end_date: format(date, "yyyy-MM-dd"),
      }));
    }
  };

  return (
    <DashboardLayout title="Dashboard">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
        {cards.map((card, i) => (
          <div
            key={card.title}
            className={`group relative overflow-hidden bg-gradient-to-br ${cardColors[i % cardColors.length].gradient} bg-card/80 backdrop-blur-xl rounded-2xl border border-border/50 p-5 cursor-pointer transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-1 animate-fade-in`}
            style={{ animationDelay: `${i * 80}ms` }}
            onClick={card.onClick}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${cardColors[i % cardColors.length].iconBg} flex items-center justify-center group-hover:animate-float transition-transform`}>
                <card.icon className={`h-4 w-4 ${cardColors[i % cardColors.length].iconColor}`} />
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
            </div>
            <div className="stat-value text-xl">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Calendar and Super Admin Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            {/* ... calendar content ... */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                  <CalendarIcon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Events Calendar</h2>
                  <p className="text-xs text-muted-foreground">{events?.length || 0} upcoming events</p>
                </div>
              </div>
              <Dialog open={eventOpen} onOpenChange={(open) => { if (!open) closeEventDialog(); else setEventOpen(true); }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="rounded-xl gradient-primary text-primary-foreground shadow-glow hover:shadow-glow-lg hover:scale-[1.02] transition-all">
                    <Plus className="h-4 w-4 mr-1" /> Add Event
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold">{editingEvent ? "Edit Event" : "Add New Event"}</DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      createEvent.mutate();
                    }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="event-name">Event Name *</Label>
                      <Input id="event-name" value={eventForm.name} onChange={(e) => setEventForm(prev => ({ ...prev, name: e.target.value }))} required className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event-details">Details</Label>
                      <Textarea id="event-details" value={eventForm.details} onChange={(e) => setEventForm(prev => ({ ...prev, details: e.target.value }))} rows={3} className="rounded-xl" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="event-start-date">Start Date *</Label>
                        <Input id="event-start-date" type="date" value={eventForm.start_date} onChange={(e) => setEventForm(prev => ({ ...prev, start_date: e.target.value }))} required className="rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="event-start-time">Start Time</Label>
                        <Input id="event-start-time" type="time" value={eventForm.start_time} onChange={(e) => setEventForm(prev => ({ ...prev, start_time: e.target.value }))} className="rounded-xl" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="event-end-date">End Date</Label>
                        <Input id="event-end-date" type="date" value={eventForm.end_date} onChange={(e) => setEventForm(prev => ({ ...prev, end_date: e.target.value }))} className="rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="event-end-time">End Time</Label>
                        <Input id="event-end-time" type="time" value={eventForm.end_time} onChange={(e) => setEventForm(prev => ({ ...prev, end_time: e.target.value }))} className="rounded-xl" />
                      </div>
                    </div>
                    <Button type="submit" className="w-full rounded-xl gradient-primary text-primary-foreground font-semibold hover:scale-[1.02] transition-transform" disabled={createEvent.isPending}>
                      {createEvent.isPending ? "Saving..." : editingEvent ? "Update Event" : "Create Event"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              modifiers={{ event: eventDates }}
              modifiersClassNames={{ event: "!bg-primary/20 !font-bold !text-primary ring-2 ring-primary/30 ring-offset-1 ring-offset-background" }}
              className="rounded-2xl pointer-events-auto w-full flex justify-center p-0 sm:p-3 [&_.rdp]:w-full [&_.rdp-months]:w-full [&_.rdp-month]:w-full [&_.rdp-table]:w-full [&_.rdp-table]:max-w-none [&_.rdp-head_cell]:w-auto [&_.rdp-cell]:w-auto [&_.rdp-cell]:flex-1 [&_.rdp-head_cell]:flex-1 [&_.rdp-day]:w-full [&_.rdp-day]:h-12 lg:[&_.rdp-day]:h-16 [&_.rdp-row]:flex [&_.rdp-row]:w-full [&_.rdp-head_row]:flex [&_.rdp-head_row]:w-full [&_.rdp-caption]:text-lg [&_.rdp-caption]:flex [&_.rdp-caption]:justify-between [&_.rdp-caption]:w-full [&_.rdp-caption_label]:font-extrabold [&_.rdp-nav_button]:h-9 [&_.rdp-nav_button]:w-9 [&_.rdp-head_cell]:text-xs [&_.rdp-head_cell]:font-bold [&_.rdp-head_cell]:uppercase [&_.rdp-head_cell]:tracking-wider [&_.rdp-head_cell]:text-muted-foreground/70"
            />
          </div>

          {isSuperAdmin && (
            <div className="glass-card p-6 animate-slide-up bg-destructive/5 border-destructive/10" style={{ animationDelay: '0.35s' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Super Admin Panel</h2>
                  <p className="text-xs text-muted-foreground">High-privilege system controls</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DirectPointsDialog />
                <DatabaseBackupButtons />
                <Button
                  variant="outline"
                  onClick={() => navigate("/admin/logs")}
                  className="w-full justify-start rounded-xl border-border/50 hover:bg-info/5 hover:text-info hover:border-info/30 h-10 px-4"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  View Activity Logs
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Events for selected date */}
        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <h2 className="text-lg font-bold text-foreground mb-1">
            {selectedDate ? format(selectedDate, "EEEE") : "Select a date"}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {selectedDate ? format(selectedDate, "MMMM d, yyyy") : ""}
          </p>
          {todayEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <CalendarIcon className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground text-sm">No events on this date.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayEvents.map((event, i) => (
                <div
                  key={event.id}
                  className="group/event p-4 rounded-xl bg-accent/50 border border-border/50 transition-all duration-200 hover:border-primary/30 animate-fade-in"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="flex items-start justify-between">
                    <p className="font-semibold text-foreground">{event.name}</p>
                    <div className="flex gap-1 opacity-0 group-hover/event:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => openEditEvent(event)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete event?</AlertDialogTitle>
                            <AlertDialogDescription>This will permanently delete "{event.name}".</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteEvent.mutate(event.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  {event.details && <p className="text-sm text-muted-foreground mt-1">{event.details}</p>}
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className="w-1.5 h-1.5 rounded-full gradient-primary" />
                    <p className="text-xs font-medium text-primary">
                      {format(parseISO(event.start_date), "HH:mm")} — {format(parseISO(event.end_date), "HH:mm")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AttendanceLeaderboard />
    </DashboardLayout>
  );
}
