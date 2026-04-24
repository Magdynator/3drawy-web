import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Music, Maximize, Share2, QrCode, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Player {
    id: string;
    nickname: string;
    avatar_url?: string | null;
}

const BADGE_COLORS = [
    "bg-zingoo-red",
    "bg-zingoo-blue",
    "bg-zingoo-yellow",
    "bg-zingoo-green",
    "bg-zingoo-purple",
];

export default function QuizHostLobbyPage() {
    const { sessionId: paramSessionId } = useParams(); // This is actually the session ID from QuizListPage
    const navigate = useNavigate();
    const { toast } = useToast();
    const [pin, setPin] = useState("...");
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [isMuted, setIsMuted] = useState(false);
    const [showQR, setShowQR] = useState(false);

    // Fetch session by ID (quizId param is actually the session ID)
    useEffect(() => {
        async function fetchSession() {
            // @ts-ignore
            const { data, error } = await supabase
                .from("quiz_sessions")
                .select("*")
                .eq("id", paramSessionId)
                .single();

            if (error || !data) {
                toast({ title: "Session not found", variant: "destructive" });
                navigate("/quiz/host/list");
                return;
            }

            setSessionId(data.id);
            const p = (data as any).pin as string;
            setPin(p.slice(0, 3) + " " + p.slice(3));
        }
        fetchSession();
    }, [paramSessionId]);

    // Fetch existing players
    useEffect(() => {
        if (!sessionId) return;

        async function fetchPlayers() {
            // @ts-ignore
            const { data } = await supabase
                .from("quiz_players")
                .select("id, nickname, avatar_url")
                .eq("session_id", sessionId);
            if (data) setPlayers(data);
        }
        fetchPlayers();
    }, [sessionId]);

    // Subscribe to new players joining and players being removed via Realtime
    useEffect(() => {
        if (!sessionId) return;

        const channel = supabase
            .channel(`lobby-${sessionId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "quiz_players",
                    filter: `session_id=eq.${sessionId}`,
                },
                (payload: any) => {
                    if (payload.eventType === "INSERT") {
                        setPlayers((prev) => {
                            // Avoid duplicates
                            if (prev.find((p) => p.id === payload.new.id)) return prev;
                            return [...prev, { id: payload.new.id, nickname: payload.new.nickname, avatar_url: payload.new.avatar_url }];
                        });
                    } else if (payload.eventType === "DELETE") {
                        setPlayers((prev) => prev.filter((p) => p.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionId]);

    const handleRemovePlayer = async (playerId: string) => {
        // Optimistic UI update: instantly remove them from the screen locally
        setPlayers((prev) => prev.filter((p) => p.id !== playerId));

        // @ts-ignore
        await supabase.from("quiz_players").delete().eq("id", playerId);
    };

    const handleStart = async () => {
        if (players.length === 0) {
            toast({
                title: "Waiting for players",
                description: "You need at least one player to start!",
                variant: "destructive",
            });
            return;
        }
        // Update session status to 'question'
        // @ts-ignore
        await supabase
            .from("quiz_sessions")
            .update({ status: "get_ready", current_question_index: 0 })
            .eq("id", sessionId);

        navigate(`/quiz/game/${sessionId}`);
    };

    const copyLink = () => {
        const rawPin = pin.replace(/\s/g, "");
        const link = `${window.location.origin}/quiz/join?pin=${rawPin}`;
        navigator.clipboard.writeText(link);
        toast({ title: "Link Copied!", description: "Share this link with your players." });
    };

    return (
        <div className="min-h-screen zingoo-purple-gradient text-white flex flex-col p-6 overflow-hidden">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-12">
                <div className="flex items-center gap-4">
                    <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-md border border-white/20">
                        <span className="text-lg font-bold uppercase tracking-widest text-purple-200 block mb-1">
                            Game PIN:
                        </span>
                        <span className="text-6xl font-black tracking-tighter tabular-nums">{pin}</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowQR(true)}
                        className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 text-white"
                        title="Show QR Code"
                    >
                        <QrCode className="w-5 h-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={copyLink}
                        className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 text-white"
                    >
                        <Share2 className="w-6 h-6" />
                    </Button>
                </div>

                <div className="flex gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsMuted(!isMuted)}
                        className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 text-white"
                    >
                        <Music className={isMuted ? "opacity-30" : "animate-pulse"} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 text-white"
                    >
                        <Maximize />
                    </Button>
                    <Button
                        onClick={handleStart}
                        className="h-14 px-10 rounded-2xl bg-white text-zingoo-purple text-xl font-black uppercase hover:bg-purple-50 transition-all shadow-xl hover:scale-105 active:scale-95"
                    >
                        Start
                    </Button>
                </div>
            </div>

            {/* Main Lobby Area */}
            <div className="flex-1 flex flex-col items-center justify-center relative">
                <AnimatePresence>
                    {players.length === 0 ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="text-center"
                        >
                            <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                                <Users className="w-16 h-16 text-white/50" />
                            </div>
                            <h2 className="text-3xl md:text-4xl font-black mb-3">Waiting for players...</h2>
                            <p className="text-purple-200 text-2xl font-medium">
                                Share the Game PIN above or click the share button
                            </p>
                            <p className="text-purple-300 text-2xl mt-6">
                                Players can join at{" "}
                                <span className="font-bold underline">
                                    {window.location.origin}/quiz/join
                                </span>
                            </p>
                        </motion.div>
                    ) : (
                        <div className="w-full h-full p-8 overflow-y-auto">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                                {players.map((p, i) => (
                                    <motion.div
                                        key={p.id}
                                        layout
                                        initial={{ scale: 0, rotate: -20 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        className="relative p-4 flex flex-col items-center justify-center text-center group cursor-default transition-all hover:scale-110"
                                    >
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleRemovePlayer(p.id); }}
                                            className="absolute top-0 right-0 w-8 h-8 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600 shadow-md transform translate-x-2 -translate-y-2 z-10"
                                            title="Remove Player"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                        <div className="text-8xl mb-4 drop-shadow-md group-hover:animate-bounce">
                                            {p.avatar_url || "👤"}
                                        </div>
                                        <span className="text-xl md:text-2xl font-black drop-shadow-sm truncate w-full">{p.nickname}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Player count */}
                <div className="absolute bottom-8 left-10 text-2xl md:text-3xl font-black flex items-center gap-3 bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/10 shadow-xl">
                    <Users className="w-8 h-8" />
                    <span>{players.length}</span>
                </div>
            </div>

            {/* Full Screen QR Overlay */}
            <AnimatePresence>
                {showQR && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
                        onClick={() => setShowQR(false)}
                    >
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white z-[110]"
                            onClick={(e) => { e.stopPropagation(); setShowQR(false); }}
                        >
                            <X className="w-6 h-6" />
                        </Button>

                        <div
                            className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 w-full max-w-[90vw] max-h-[90vh] md:max-w-md overflow-hidden relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-3xl md:text-5xl font-black text-zingoo-purple tracking-tighter shrink-0">
                                Scan to Join!
                            </h2>
                            <div className="bg-white p-3 rounded-2xl border-4 md:border-8 border-zingoo-purple shadow-inner flex shrink items-center justify-center w-full aspect-square min-h-0">
                                <QRCodeSVG
                                    value={`${window.location.origin}/quiz/join?pin=${pin.replace(/\s/g, "")}`}
                                    style={{ width: "100%", height: "100%" }}
                                    bgColor={"#ffffff"}
                                    fgColor={"#000000"}
                                    level={"H"}
                                    includeMargin={false}
                                />
                            </div>
                            <div className="text-5xl md:text-6xl font-black tracking-tighter tabular-nums text-slate-800 shrink-0">
                                {pin}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
