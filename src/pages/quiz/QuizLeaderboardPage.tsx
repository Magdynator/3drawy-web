import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, Home, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Player {
    id: string;
    nickname: string;
    avatar_url?: string;
    score: number;
}

export default function QuizLeaderboardPage() {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchParams] = useSearchParams();
    const isPlayerView = searchParams.get("isPlayer") === "true";
    const [isHost, setIsHost] = useState(false);

    useEffect(() => {
        async function fetchIsHost() {
            if (isPlayerView) return;
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                // @ts-ignore
                const { data } = await supabase.from("quiz_sessions").select("host_id").eq("id", sessionId).single();
                if (data && data.host_id === session.user.id) {
                    setIsHost(true);
                }
            }
        }
        fetchIsHost();
    }, [sessionId]);

    useEffect(() => {
        // Try to get players from router state first (passed from game page after cleanup)
        const stateData = (location.state as any)?.players;
        if (stateData && stateData.length > 0) {
            setPlayers(stateData);
            setLoading(false);
            return;
        }

        // Fallback: fetch from DB (in case page was loaded directly)
        async function fetchPlayers() {
            try {
                // @ts-ignore
                const { data } = await supabase
                    .from("quiz_players")
                    .select("id, nickname, avatar_url, score")
                    .eq("session_id", sessionId)
                    .order("score", { ascending: false });

                if (data) setPlayers(data as any);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchPlayers();
    }, [sessionId, location.state]);

    const [cameraStage, setCameraStage] = useState<"suspense" | "intro" | "third" | "second" | "first" | "full">("suspense");

    useEffect(() => {
        if (players.length === 0) return;

        // Video-style Panning Timeline with Suspense Delay
        const t0 = setTimeout(() => setCameraStage("intro"), 4000); // 4 seconds of suspense
        const t1 = setTimeout(() => setCameraStage("third"), 4500); // snap to 3rd
        const t2 = setTimeout(() => setCameraStage("second"), 8500); // pan to 2nd
        const t3 = setTimeout(() => setCameraStage("first"), 12500); // pan to 1st
        const t4 = setTimeout(() => setCameraStage("full"), 18000); // full view

        return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
    }, [players.length]);

    if (loading) {
        return (
            <div className="min-h-screen zingoo-purple-gradient flex items-center justify-center">
                <div className="text-white text-3xl font-bold animate-pulse">Loading results...</div>
            </div>
        );
    }

    const podium = players.slice(0, 3);
    const rest = players.slice(3);

    // Compute virtual camera pan/zoom/orbit
    const getCameraTransform = () => {
        // Adjust x to pan left/right, and rotateY to create a 3D curved orbit effect
        switch (cameraStage) {
            case "suspense": return { x: 0, scale: 0.5, opacity: 0, y: 300, rotateY: 0 };
            case "intro": return { x: 0, scale: 0.8, opacity: 0, y: 100, rotateY: 0 };
            case "third": return { x: "28%", scale: 1.3, opacity: 1, y: 30, rotateY: 15 }; // Orbit left, looking slightly right
            case "second": return { x: "-28%", scale: 1.3, opacity: 1, y: 30, rotateY: -15 }; // Orbit right, looking slightly left
            case "first": return { x: "0%", scale: 1.5, opacity: 1, y: 60, rotateY: 0 }; // Dead center
            case "full": return { x: 0, scale: 1, opacity: 1, y: 0, rotateY: 0 };
            default: return { x: 0, scale: 1, opacity: 1, y: 0, rotateY: 0 };
        }
    };

    return (
        <div className="min-h-screen bg-[#05010f] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/40 via-[#05010f] to-[#05010f] text-white flex flex-col items-center justify-start p-6 overflow-hidden relative">
            {/* Suspense Overlay */}
            {cameraStage === "suspense" && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-3xl bg-[#05010f]/80"
                >
                    <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    >
                        <Trophy className="w-24 h-24 text-yellow-500/50 mb-8 mx-auto drop-shadow-[0_0_30px_rgba(234,179,8,0.5)]" />
                    </motion.div>
                    <h2 className="text-4xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 animate-pulse tracking-[0.2em] text-center uppercase drop-shadow-[0_0_40px_rgba(236,72,153,0.6)]">
                        The Moment<br />Of Truth
                    </h2>
                    <motion.p
                        animate={{ y: [0, -10, 0] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        className="mt-8 text-purple-300 text-lg md:text-2xl font-black tracking-[0.4em] uppercase"
                    >
                        Calculating Scores...
                    </motion.p>
                </motion.div>
            )}

            {/* Massive Cinematic Lighting Orbs in Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-purple-600/20 rounded-full blur-[120px]" />
                <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-yellow-500/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px]" />
            </div>

            <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={(cameraStage === "full" || cameraStage === "first") ? { y: 0, opacity: 1 } : { y: -50, opacity: 0 }} // Hide Final Results Title until the end
                transition={{ duration: 1, type: "spring" }}
                className="text-center mb-8 relative z-20 mt-4 h-24"
            >
                <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-2 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]" />
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 to-yellow-500 drop-shadow-xl">Final Results</h1>
            </motion.div>

            {players.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12 relative z-20"
                >
                    <p className="text-2xl text-purple-200">No results available for this game.</p>
                </motion.div>
            ) : (
                <div className="flex-1 w-full max-w-5xl flex flex-col items-center justify-end md:justify-center relative z-20 [perspective:1200px]">
                    {/* Podium Area - Acts as moving 3D Camera stage */}
                    <motion.div
                        animate={getCameraTransform()}
                        transition={{ type: "spring", stiffness: 45, damping: 15, mass: 1 }}
                        style={{ transformStyle: "preserve-3d", transformOrigin: "bottom center" }}
                        className="flex items-end justify-center w-full h-[400px] md:h-[450px] mb-8 gap-2 md:gap-4 px-2"
                    >
                        {/* 3rd Place - Bronze */}
                        {podium[2] && (
                            <motion.div
                                initial={{ x: "-100%", opacity: 0, skewX: -15, rotateY: 20 }}
                                animate={{ x: 0, opacity: 1, skewX: 0, rotateY: 10 }}
                                transition={{ delay: 4.5, type: "spring", stiffness: 200, damping: 25 }}
                                className="flex-1 flex flex-col items-center relative z-10"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 4.8, type: "spring", stiffness: 300, bounce: 0.6 }}
                                    className="text-5xl md:text-6xl drop-shadow-xl mb-2"
                                >
                                    {podium[2].avatar_url || "👤"}
                                </motion.div>
                                <div className="font-bold text-center mb-4 truncate max-w-full drop-shadow-md text-orange-100 text-base md:text-xl px-1">{podium[2].nickname}</div>

                                {/* 3rd Glass Pillar */}
                                <div className="w-[105%] h-[120px] md:h-[160px] bg-white/[0.03] backdrop-blur-3xl rounded-t-xl shadow-[0_0_30px_rgba(234,88,12,0.2)] flex flex-col items-center justify-start pt-3 md:pt-4 border-t border-l border-white/20 relative overflow-hidden ring-1 ring-orange-500/30">
                                    <div className="absolute inset-0 bg-gradient-to-t from-orange-600/60 via-orange-500/10 to-transparent mix-blend-plus-lighter" />
                                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-orange-500/40 to-transparent blur-md" />
                                    <div className="absolute inset-0 shadow-[inset_0_4px_20px_rgba(255,255,255,0.15)] rounded-t-xl z-0" />

                                    <span className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-100 to-orange-400 drop-shadow-lg relative z-10">3</span>
                                    <span className="font-black text-orange-200/80 text-xs md:text-sm mt-1 relative z-10">{podium[2].score} pts</span>
                                </div>
                            </motion.div>
                        )}

                        {/* 1st Place - Gold Champion */}
                        {podium[0] && (
                            <motion.div
                                initial={{ scale: 0.2, y: 150, opacity: 0, rotateY: 0 }}
                                animate={{ scale: 1, y: 0, opacity: 1, rotateY: 0 }}
                                transition={{ delay: 12.5, type: "spring", stiffness: 120, damping: 15, mass: 1 }}
                                className="flex-1 flex flex-col items-center relative z-30"
                            >
                                {/* CROWN */}
                                <motion.div
                                    initial={{ scale: 5, opacity: 0, y: -100 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    transition={{ delay: 13.1, type: "spring", stiffness: 350, damping: 12 }}
                                    className="text-5xl md:text-7xl absolute -top-12 md:-top-16 z-40 drop-shadow-[0_0_30px_rgba(250,204,21,0.9)]"
                                >
                                    👑
                                </motion.div>
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: [0, 1.3, 1] }}
                                    transition={{ delay: 12.8, duration: 0.5 }}
                                    className="text-7xl md:text-8xl drop-shadow-[0_0_20px_rgba(250,204,21,0.5)] mb-3 relative"
                                >
                                    {podium[0].avatar_url || "👤"}
                                </motion.div>
                                <div className="font-black text-center mb-4 truncate max-w-full text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 to-yellow-400 text-xl md:text-3xl drop-shadow-[0_0_15px_rgba(250,204,21,0.6)] px-1">{podium[0].nickname}</div>

                                {/* 1st Glass Pillar */}
                                <div className="w-[115%] h-[200px] md:h-[260px] bg-white/[0.05] backdrop-blur-3xl rounded-t-2xl shadow-[0_0_60px_rgba(250,204,21,0.4)] flex flex-col items-center justify-start pt-4 md:pt-6 border-t-[2px] border-l border-white/40 border-r-white/10 relative overflow-hidden ring-2 ring-yellow-400/50">
                                    <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/80 via-yellow-400/20 to-transparent mix-blend-plus-lighter" />
                                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-yellow-500/50 to-transparent blur-xl" />
                                    <div className="absolute inset-0 shadow-[inset_0_10px_30px_rgba(255,255,255,0.3)] rounded-t-2xl z-0" />

                                    {/* Shimmer sweep */}
                                    <motion.div
                                        initial={{ x: "-100%" }}
                                        animate={{ x: "200%" }}
                                        transition={{ delay: 12.7, duration: 2.0, repeat: Infinity, ease: "easeInOut" }}
                                        className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-12 z-0 mix-blend-overlay"
                                    />

                                    <span className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-yellow-300 to-yellow-600 drop-shadow-lg z-10 relative">1</span>
                                    <span className="font-black text-yellow-100 text-lg md:text-2xl z-10 relative mt-1 md:mt-2 drop-shadow-md">{podium[0].score} pts</span>
                                </div>
                            </motion.div>
                        )}

                        {/* 2nd Place - Silver */}
                        {podium[1] && (
                            <motion.div
                                initial={{ x: "100%", opacity: 0, skewX: 15, rotateY: -20 }}
                                animate={{ x: 0, opacity: 1, skewX: 0, rotateY: -10 }}
                                transition={{ delay: 8.5, type: "spring", stiffness: 200, damping: 25 }}
                                className="flex-1 flex flex-col items-center relative z-20"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 8.8, type: "spring", stiffness: 300, bounce: 0.6 }}
                                    className="text-6xl md:text-7xl drop-shadow-xl mb-2"
                                >
                                    {podium[1].avatar_url || "👤"}
                                </motion.div>
                                <div className="font-bold text-center mb-4 truncate max-w-full drop-shadow-md text-slate-100 text-base md:text-2xl px-1">{podium[1].nickname}</div>

                                {/* 2nd Glass Pillar */}
                                <div className="w-[105%] h-[160px] md:h-[210px] bg-white/[0.04] backdrop-blur-3xl rounded-t-xl shadow-[0_0_40px_rgba(148,163,184,0.3)] flex flex-col items-center justify-start pt-4 border-t border-l border-white/30 relative overflow-hidden ring-1 ring-slate-400/40">
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-500/70 via-slate-400/10 to-transparent mix-blend-plus-lighter" />
                                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-400/40 to-transparent blur-md" />
                                    <div className="absolute inset-0 shadow-[inset_0_4px_25px_rgba(255,255,255,0.2)] rounded-t-xl z-0" />

                                    <span className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-slate-100 to-slate-400 drop-shadow-lg relative z-10">2</span>
                                    <span className="font-black text-slate-200/80 text-xs md:text-sm mt-1 relative z-10">{podium[1].score} pts</span>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>

                    {/* Rest of the players - Rapid Sequential Pop */}
                    {rest.length > 0 && (
                        <div className="w-full max-w-3xl space-y-3 mb-10 overflow-y-auto max-h-[30vh] px-2 tailwind-scrollbar-hide rounded-2xl">
                            {rest.map((p, i) => (
                                <motion.div
                                    key={p.id}
                                    initial={{ scale: 0.8, opacity: 0, x: -50 }}
                                    animate={{ scale: 1, opacity: 1, x: 0 }}
                                    transition={{ delay: 18.0 + i * 0.1, type: "spring", stiffness: 300 }}
                                    className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-lg"
                                >
                                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center font-black text-xl text-white/50">
                                        {i + 4}
                                    </div>
                                    <span className="text-4xl drop-shadow-md">{p.avatar_url || "👤"}</span>
                                    <span className="flex-1 font-black text-xl md:text-2xl truncate">{p.nickname}</span>
                                    <div className="bg-white/15 px-4 py-1.5 rounded-lg flex items-baseline gap-1">
                                        <span className="font-black text-xl text-white">{p.score}</span>
                                        <span className="text-xs font-bold text-white/50 uppercase tracking-widest">pts</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}

                    {/* Bottom Actions - Drop from Top */}
                    {isHost && (
                        <motion.div
                            initial={{ y: -50, opacity: 0, scale: 0.9 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            transition={{ delay: 19.0, type: "spring", stiffness: 200 }}
                            className="flex flex-wrap items-center justify-center gap-4 relative z-50 mb-4 mt-auto pt-4"
                        >
                            <Button
                                onClick={() => navigate("/")}
                                className="h-14 px-8 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-lg font-black border border-white/20 shadow-lg"
                            >
                                <Home className="w-5 h-5 mr-2" /> Finish Game
                            </Button>
                            <Button
                                onClick={() => navigate("/quiz/host/list")}
                                className="h-14 px-8 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-yellow-950 text-xl font-black shadow-[0_0_20px_rgba(250,204,21,0.4)] hover:scale-105 transition-all"
                            >
                                <RotateCcw className="w-5 h-5 mr-2" /> Play Again
                            </Button>
                        </motion.div>
                    )}

                    {/* Confetti Explosion timed exactly with 1st place impact */}
                    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                        {Array.from({ length: 150 }).map((_, i) => {
                            // Randomize confetti properties
                            const isCircle = Math.random() > 0.5;
                            const colors = ["#facc15", "#ef4444", "#3b82f6", "#22c55e", "#d946ef"];
                            const color = colors[Math.floor(Math.random() * colors.length)];
                            const size = 5 + Math.random() * 10;

                            return (
                                <div
                                    key={i}
                                    className={`absolute animate-confetti opacity-0 blur-[0.5px]`}
                                    style={{
                                        left: `${Math.random() * 100}%`,
                                        width: `${size}px`,
                                        height: `${isCircle ? size : size * 2}px`,
                                        borderRadius: isCircle ? "50%" : "2px",
                                        backgroundColor: color,
                                        // delay 12.5s for 1st place + slight random variance
                                        animationDelay: `${12.5 + Math.random() * 3}s`,
                                        animationDuration: `${2.5 + Math.random() * 3}s`,
                                        transform: `rotate(${Math.random() * 360}deg)`,
                                    }}
                                />
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
