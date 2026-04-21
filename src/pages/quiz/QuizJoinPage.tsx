import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const AVAILABLE_AVATARS = ["🐱", "🐶", "🦊", "🐰", "🦒", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐙", "🦖", "🦄", "👽", "🤖"];

const DEVICE_KEY = (sid: string) => `zingoo_player_${sid}`;

export default function QuizJoinPage() {
    const [searchParams] = useSearchParams();
    const initialPin = searchParams.get("pin") || "";
    const [pin, setPin] = useState(initialPin);
    const [nickname, setNickname] = useState("");
    const [avatar, setAvatar] = useState(AVAILABLE_AVATARS[Math.floor(Math.random() * AVAILABLE_AVATARS.length)]);
    const [step, setStep] = useState(initialPin ? 1 : 1); // 1: PIN, 2: Nickname, 3: Waiting
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [alreadyJoined, setAlreadyJoined] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    // On mount, if the user navigates directly to /quiz/join, check if they have a recently active session
    useEffect(() => {
        if (!sessionId) {
            const lastSession = localStorage.getItem("zingoo_last_session");
            if (lastSession) {
                // If they have a last session, auto-set it so the next useEffect verifies if they are still in it
                setSessionId(lastSession);
            }
        }
    }, [sessionId]);

    // Check if this device already joined the session whenever sessionId changes
    useEffect(() => {
        if (!sessionId) return;
        const stored = localStorage.getItem(DEVICE_KEY(sessionId));
        if (stored) {
            // Verify the player still exists in DB
            (async () => {
                // @ts-ignore
                const { data } = await supabase
                    .from("quiz_players")
                    .select("id")
                    .eq("id", stored)
                    .eq("session_id", sessionId)
                    .single();
                if (data) {
                    // Player still exists — redirect straight to game
                    setAlreadyJoined(true);
                    navigate(`/quiz/play/${sessionId}?playerId=${stored}`);
                } else {
                    // Player was removed (e.g. kicked) — clear stale key
                    localStorage.removeItem(DEVICE_KEY(sessionId));
                }
            })();
        }
    }, [sessionId]);

    const handlePinSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const rawPin = pin.replace(/\s/g, "");
        if (rawPin.length < 6) {
            toast({
                title: "Invalid PIN",
                description: "Please enter a 6-digit game PIN.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            // Verify the PIN exists in Supabase
            // @ts-ignore
            const { data, error } = await supabase
                .from("quiz_sessions")
                .select("id, status")
                .eq("pin", rawPin)
                .single();

            if (error || !data) {
                toast({
                    title: "Game not found",
                    description: "No game with that PIN exists. Check your PIN and try again.",
                    variant: "destructive",
                });
                return;
            }

            if ((data as any).status === "finished") {
                toast({
                    title: "Game ended",
                    description: "This game has already finished.",
                    variant: "destructive",
                });
                return;
            }

            setSessionId((data as any).id);
            setStep(2);
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nickname.trim()) {
            toast({
                title: "Nickname required",
                description: "Please enter a cool nickname to join!",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            // Create the player record in Supabase
            // @ts-ignore
            const { data, error } = await supabase
                .from("quiz_players")
                .insert({
                    session_id: sessionId,
                    nickname: nickname.trim(),
                    avatar_url: avatar,
                    score: 0,
                })
                .select()
                .single();

            if (error) {
                if (error.message.includes("unique") || error.message.includes("duplicate")) {
                    toast({
                        title: "Nickname taken",
                        description: "Someone already has that nickname. Try another!",
                        variant: "destructive",
                    });
                } else {
                    throw error;
                }
                return;
            }

            // Save to localStorage so this device can't join again
            localStorage.setItem(DEVICE_KEY(sessionId!), data.id);
            localStorage.setItem("zingoo_last_session", sessionId!);

            setStep(3);

            // Pre-fetch questions to avoid first-round delay
            let preFetchedQuestions: any[] = [];
            (async () => {
                // @ts-ignore
                const { data: session } = await supabase.from("quiz_sessions").select("quiz_id").eq("id", sessionId).single();
                if (session) {
                    // @ts-ignore
                    const { data: qs } = await supabase
                        .from("quiz_questions")
                        .select("*")
                        .eq("quiz_id", (session as any).quiz_id)
                        .order("position", { ascending: true });
                    if (qs) preFetchedQuestions = qs;
                }
            })();

            // Subscribe to session status changes to know when game starts
            const sessionChannel = supabase
                .channel(`player-wait-${sessionId}`)
                .on(
                    "postgres_changes",
                    {
                        event: "UPDATE",
                        schema: "public",
                        table: "quiz_sessions",
                        filter: `id=eq.${sessionId}`,
                    },
                    (payload: any) => {
                        const s = payload.new.status;
                        if (s === "question" || s === "get_ready" || s === "show_question") {
                            // Game has started! Navigate to player game view
                            navigate(`/quiz/play/${sessionId}?playerId=${data.id}`, {
                                state: { questions: preFetchedQuestions }
                            });
                        }
                    }
                )
                .subscribe();

            // Subscribe to player deletion (kicked by host)
            const kickChannel = supabase
                .channel(`player-kick-${data.id}`)
                .on(
                    "postgres_changes",
                    {
                        event: "DELETE",
                        schema: "public",
                        table: "quiz_players",
                    },
                    (payload: any) => {
                        if (payload.old && payload.old.id === data.id) {
                            toast({
                                title: "Removed",
                                description: "You have been removed from the game by the host.",
                                variant: "destructive",
                            });
                            setStep(1);
                            setSessionId(null);
                            supabase.removeChannel(sessionChannel);
                            supabase.removeChannel(kickChannel);
                        }
                    }
                )
                .subscribe();
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen zingoo-purple-gradient flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-3xl p-8 shadow-2xl text-center"
                >
                    <h1 className="text-4xl font-black text-zingoo-purple mb-8 italic uppercase tracking-tighter">
                        Quiz!
                    </h1>

                    <AnimatePresence mode="wait">
                        {alreadyJoined && (
                            <motion.div
                                key="already-joined-step"
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="space-y-6 py-4"
                            >
                                <div className="w-16 h-16 mx-auto mb-4 border-4 border-zingoo-purple border-t-transparent rounded-full animate-spin" />
                                <h2 className="text-2xl font-bold text-slate-800">Reconnecting...</h2>
                                <p className="text-slate-500">You previously joined this game. Taking you back inside!</p>
                            </motion.div>
                        )}

                        {!alreadyJoined && step === 1 && (
                            <motion.form
                                key="pin-step"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                onSubmit={handlePinSubmit}
                                className="space-y-4"
                            >
                                <Input
                                    type="text"
                                    placeholder="Game PIN"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                    className="h-16 text-center text-3xl font-bold rounded-2xl border-2 border-slate-200 focus:border-zingoo-purple transition-all text-slate-800"
                                    autoFocus
                                />
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-16 text-2xl font-bold rounded-2xl bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                                >
                                    {isLoading ? "Checking..." : "Enter"}
                                </Button>
                            </motion.form>
                        )}

                        {step === 2 && (
                            <motion.form
                                key="nickname-step"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                onSubmit={handleJoin}
                                className="space-y-6"
                            >
                                <div className="space-y-2">
                                    <h3 className="text-lg font-bold text-slate-600">Choose Character</h3>
                                    <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 bg-slate-50 p-3 rounded-2xl h-44 overflow-y-auto">
                                        {AVAILABLE_AVATARS.map((a) => (
                                            <button
                                                key={a}
                                                type="button"
                                                onClick={() => setAvatar(a)}
                                                className={`text-3xl p-2 rounded-xl transition-all aspect-square flex items-center justify-center ${avatar === a
                                                    ? 'bg-zingoo-purple shadow-lg ring-2 ring-zingoo-purple ring-offset-2 scale-105 z-10'
                                                    : 'hover:bg-slate-200 hover:scale-105 opacity-70 hover:opacity-100 bg-white/50'
                                                    }`}
                                            >
                                                {a}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <Input
                                    type="text"
                                    placeholder="Your Nickname"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value.slice(0, 15))}
                                    className="h-16 text-center text-2xl font-bold rounded-2xl border-2 border-slate-200 focus:border-zingoo-purple transition-all text-slate-800"
                                    autoFocus
                                />
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-16 text-2xl font-bold rounded-2xl bg-zingoo-green text-white hover:opacity-90 transition-all shadow-lg active:scale-95"
                                >
                                    {isLoading ? "Joining..." : "OK, go!"}
                                </Button>
                            </motion.form>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="waiting-step"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="space-y-6 py-8"
                            >
                                <div className="text-2xl font-bold text-slate-800">You're in!</div>
                                <div className="text-xl font-medium text-slate-500">
                                    See your character on screen?
                                </div>
                                <div className="bg-slate-100 p-6 rounded-2xl inline-flex flex-col items-center gap-3">
                                    <span className="text-6xl animate-bounce">{avatar}</span>
                                    <span className="text-3xl font-black text-zingoo-purple">{nickname}</span>
                                </div>
                                <div className="text-slate-400 animate-pulse">
                                    Waiting for the host to start...
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
}
