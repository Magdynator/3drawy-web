import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Play, Plus, Trash2, Edit3, Users, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function QuizListPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { session } = useAuth();
    const queryClient = useQueryClient();
    const { currentUser } = useAuth();

    useEffect(() => {
        const cleanupOldSessions = async () => {
            try {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayISO = today.toISOString();

                // 1. Fetch old sessions
                // @ts-ignore
                const { data: oldSessions } = await supabase
                    .from("quiz_sessions")
                    .select("id")
                    .lt("created_at", todayISO);

                if (oldSessions && oldSessions.length > 0) {
                    const sessionIds = oldSessions.map((s: any) => s.id);

                    // 2. Delete players for these sessions
                    // @ts-ignore
                    await supabase
                        .from("quiz_players")
                        .delete()
                        .in("session_id", sessionIds);

                    // 3. Delete the sessions themselves
                    // @ts-ignore
                    await supabase
                        .from("quiz_sessions")
                        .delete()
                        .in("id", sessionIds);

                    console.log(`Cleaned up ${oldSessions.length} old sessions.`);
                }
            } catch (err) {
                console.error("Failed to cleanup old sessions:", err);
            }
        };

        cleanupOldSessions();
    }, []);

    // @ts-ignore
    const { data: quizzes, isLoading } = useQuery({
        queryKey: ["quizzes"],
        queryFn: async () => {
            // @ts-ignore
            const { data, error } = await supabase
                .from("quizzes")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!session?.user?.id,
    });

    const startSession = useMutation({
        mutationFn: async (quizId: string) => {
            const pin = Math.floor(100000 + Math.random() * 900000).toString();
            const formattedPin = pin.slice(0, 3) + " " + pin.slice(3);
            // @ts-ignore
            const { data, error } = await supabase
                .from("quiz_sessions")
                .insert({
                    quiz_id: quizId,
                    pin: pin,
                    status: "lobby",
                    current_question_index: -1,
                    host_id: session?.user?.id,
                })
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (data: any) => {
            navigate(`/quiz/host/${data.id}`);
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const deleteQuiz = useMutation({
        mutationFn: async (id: string) => {
            // @ts-ignore
            const { error } = await supabase.from("quizzes").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quizzes"] });
            toast({ title: "Quiz deleted" });
        },
    });

    const copyJoinLink = () => {
        const link = `${window.location.origin}/quiz/join`;
        navigator.clipboard.writeText(link);
        toast({ title: "Join link copied!", description: link });
    };

    return (
        <DashboardLayout title="Quiz Games">
            <div className="max-w-5xl mx-auto">
                {/* Actions Bar */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold">Your Quizzes</h2>
                        <p className="text-muted-foreground">Create a quiz, then start a live game session.</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={copyJoinLink} className="rounded-xl">
                            <LinkIcon className="w-4 h-4 mr-2" /> Copy Join Link
                        </Button>
                        <Button onClick={() => navigate("/quiz/create")} className="rounded-xl bg-zingoo-purple hover:bg-zingoo-purple/90 text-white">
                            <Plus className="w-4 h-4 mr-2" /> Create Quiz
                        </Button>
                    </div>
                </div>

                {/* Quiz List */}
                {isLoading ? (
                    <div className="text-center py-20 text-muted-foreground">Loading quizzes...</div>
                ) : !quizzes || quizzes.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-20"
                    >
                        <div className="w-24 h-24 bg-zingoo-purple/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Play className="w-12 h-12 text-zingoo-purple" />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-2">No quizzes yet</h3>
                        <p className="text-muted-foreground mb-6">Create your first quiz to get started!</p>
                        <Button onClick={() => navigate("/quiz/create")} className="rounded-xl bg-zingoo-purple hover:bg-zingoo-purple/90 text-white h-12 px-8 text-lg">
                            <Plus className="w-5 h-5 mr-2" /> Create Your First Quiz
                        </Button>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {quizzes.map((quiz: any, i: number) => (
                            <motion.div
                                key={quiz.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.08 }}
                                className="bg-card border border-border rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all group"
                            >
                                <div className="h-3 bg-zingoo-purple" />
                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-foreground mb-1 truncate">{quiz.title}</h3>
                                    <p className="text-sm text-muted-foreground mb-6 line-clamp-2">{quiz.description || "No description"}</p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            onClick={() => startSession.mutate(quiz.id)}
                                            disabled={startSession.isPending}
                                            className="flex-1 rounded-xl bg-zingoo-green hover:bg-zingoo-green/90 text-white font-bold h-11"
                                        >
                                            <Play className="w-4 h-4 mr-2" /> {startSession.isPending ? "Starting..." : "Start Game"}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => navigate(`/quiz/create/${quiz.id}`)}
                                            className="text-zingoo-purple hover:bg-zingoo-purple/10 rounded-xl"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => deleteQuiz.mutate(quiz.id)}
                                            className="text-destructive hover:bg-destructive/10 rounded-xl"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
