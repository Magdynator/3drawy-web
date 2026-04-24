import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trophy, SkipForward } from "lucide-react";

interface QuizQuestion {
    id: string;
    question_text: string;
    question_type?: string;
    options: { text: string; isCorrect: boolean }[];
    time_limit: number;
    position: number;
    image_url?: string | null;
    extra_config?: any;
}

const OPTION_STYLES = [
    { color: "quiz-button-red", icon: "▲" },
    { color: "quiz-button-blue", icon: "◆" },
    { color: "quiz-button-yellow", icon: "●" },
    { color: "quiz-button-green", icon: "■" },
];

const BAR_COLORS = ["bg-zingoo-red", "bg-zingoo-blue", "bg-zingoo-yellow", "bg-zingoo-green"];

const TYPE_INFO: Record<string, { icon: string; label: string; desc: string; color: string }> = {
    quiz: { icon: "🎯", label: "Quiz", desc: "Pick the correct answer", color: "from-purple-600 to-indigo-600" },
    true_false: { icon: "✅", label: "True or False", desc: "Is it true or false?", color: "from-blue-600 to-cyan-600" },
    type_answer: { icon: "⌨️", label: "Type Answer", desc: "Type the correct answer", color: "from-emerald-600 to-teal-600" },
    slider: { icon: "📏", label: "Slider", desc: "Slide to the correct value", color: "from-amber-600 to-orange-600" },
    puzzle: { icon: "🧩", label: "Puzzle", desc: "Put items in order", color: "from-pink-600 to-rose-600" },
    poll: { icon: "📊", label: "Poll", desc: "Share your opinion", color: "from-violet-600 to-purple-600" },
    word_cloud: { icon: "☁️", label: "Word Cloud", desc: "Submit a word", color: "from-sky-600 to-blue-600" },
    brainstorm: { icon: "💡", label: "Brainstorm", desc: "Share your ideas", color: "from-yellow-500 to-amber-500" },
    blur_image: { icon: "🔍", label: "Blur Image", desc: "Guess as the image reveals", color: "from-fuchsia-600 to-pink-600" },
    eliminate: { icon: "❌", label: "Eliminate", desc: "Remove the wrong answers", color: "from-red-600 to-rose-600" },
    fast_typing: { icon: "⚡", label: "Fast Typing", desc: "Type it fast & accurately", color: "from-lime-500 to-green-500" },
};

// --- Circular Timer ---
function CircularTimer({ timeLeft, totalTime }: { timeLeft: number; totalTime: number }) {
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const progress = totalTime > 0 ? timeLeft / totalTime : 0;
    const dashOffset = circumference * (1 - progress);
    const isCritical = timeLeft <= 5 && timeLeft > 0;
    const r = Math.round(38 + (235 - 38) * (1 - progress));
    const g = Math.round(137 - 137 * (1 - progress));
    const b = Math.round(12 + (39 - 12) * (1 - progress));
    const strokeColor = `rgb(${r}, ${g}, ${b})`;

    return (
        <div className={`relative w-24 h-24 md:w-28 md:h-28 shrink-0 ${isCritical ? "animate-pulse" : ""}`}>
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90 drop-shadow-2xl">
                <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                <circle
                    cx="60" cy="60" r={radius}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    style={{ transition: "stroke-dashoffset 1s linear, stroke 1s linear" }}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-4xl md:text-6xl font-black text-white drop-shadow-lg ${isCritical ? "text-red-300" : ""}`}>
                    {timeLeft}
                </span>
            </div>
        </div>
    );
}

// --- "Get Ready" Intro Screen ---
function GetReadyScreen({ questionNum, totalQuestions, qType, onReady }: {
    questionNum: number; totalQuestions: number; qType: string; onReady: () => void;
}) {
    const info = TYPE_INFO[qType] || TYPE_INFO.quiz;
    const isFirst = questionNum === 1;
    const [countdown, setCountdown] = useState(isFirst ? 3 : 0);

    // Auto-advance faster if not first question
    useEffect(() => {
        if (!isFirst) {
            const timer = setTimeout(onReady, 2000);
            return () => clearTimeout(timer);
        }
    }, [isFirst, onReady]);

    // Countdown logic
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            onReady();
        }
    }, [countdown, onReady]);

    return (
        <div className={`min-h-screen bg-gradient-to-br ${info.color} flex flex-col items-center justify-center p-6 text-white text-center relative overflow-hidden`}>
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
            </div>

            <motion.div
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="relative z-10"
            >
                <div className="bg-white/10 backdrop-blur-sm rounded-full px-8 py-2 mb-8 inline-block border border-white/20">
                    <span className="font-black text-lg tracking-wider uppercase">
                        Question {questionNum} of {totalQuestions}
                    </span>
                </div>
            </motion.div>

            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.15 }}
                className="relative z-10 text-[120px] md:text-[160px] leading-none drop-shadow-2xl mb-4"
            >
                {info.icon}
            </motion.div>

            <motion.h1
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="relative z-10 text-5xl md:text-7xl font-black tracking-tight mb-3"
            >
                {info.label}
            </motion.h1>

            <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="relative z-10 text-xl md:text-2xl text-white/70 font-semibold"
            >
                {info.desc}
            </motion.p>

            {/* Animated countdown dots and Big Number */}
            {isFirst && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="relative z-10 flex flex-col items-center mt-12"
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={countdown}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1.5, opacity: 1 }}
                            exit={{ scale: 2, opacity: 0 }}
                            transition={{ duration: 0.5 }}
                            className="text-8xl md:text-9xl font-black mb-8"
                        >
                            {countdown > 0 ? countdown : "GO!"}
                        </motion.div>
                    </AnimatePresence>

                    <div className="flex gap-3">
                        {[0, 1, 2].map(i => (
                            <motion.div
                                key={i}
                                animate={{
                                    scale: (3 - countdown) > i ? [1, 1.2, 1] : 1,
                                    opacity: (3 - countdown) > i ? 1 : 0.3
                                }}
                                className="w-4 h-4 rounded-full bg-white"
                            />
                        ))}
                    </div>
                </motion.div>
            )}

            {!isFirst && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="relative z-10 flex gap-3 mt-12"
                >
                    {[0, 1, 2].map(i => (
                        <motion.div
                            key={i}
                            initial={{ scale: 0 }}
                            animate={{ scale: [1, 1.2, 1] }}
                            className="w-4 h-4 rounded-full bg-white/60"
                        />
                    ))}
                </motion.div>
            )}
        </div>
    );
}

export default function QuizHostGamePage() {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(20);
    const [totalTime, setTotalTime] = useState(20);
    const [gameState, setGameState] = useState<"get_ready" | "show_question" | "question" | "results" | "leaderboard">("get_ready");
    const [questionPreviewTime, setQuestionPreviewTime] = useState(5);
    const [topPlayers, setTopPlayers] = useState<any[]>([]);
    const [playerCount, setPlayerCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [answersCount, setAnswersCount] = useState(0);
    const [optionCounts, setOptionCounts] = useState<number[]>([0, 0, 0, 0]);
    const [unansweredCount, setUnansweredCount] = useState(0);
    const [blurLevel, setBlurLevel] = useState(30);
    const [textEntries, setTextEntries] = useState<string[]>([]);

    // Fetch session and questions
    useEffect(() => {
        async function load() {
            try {
                // @ts-ignore
                const { data: session } = await supabase
                    .from("quiz_sessions")
                    .select("quiz_id, current_question_index, status")
                    .eq("id", sessionId)
                    .single();

                if (!session) {
                    toast({ title: "Session not found", variant: "destructive" });
                    navigate("/quiz/host/list");
                    return;
                }

                if ((session as any).status === "finished") {
                    navigate(`/quiz/leaderboard/${sessionId}`);
                    return;
                }

                // @ts-ignore
                const { data: qs } = await supabase
                    .from("quiz_questions")
                    .select("*")
                    .eq("quiz_id", (session as any).quiz_id)
                    .order("position", { ascending: true });

                if (qs && qs.length > 0) {
                    setQuestions(qs as any);
                    setCurrentIndex((session as any).current_question_index || 0);
                    const tl = (qs as any)[0]?.time_limit || 20;
                    setTimeLeft(tl);
                    setTotalTime(tl);
                    setGameState("get_ready"); // Start with intro screen
                } else {
                    toast({ title: "No questions found", variant: "destructive" });
                    navigate("/quiz/host/list");
                    return;
                }

                // @ts-ignore
                const { count } = await supabase
                    .from("quiz_players")
                    .select("*", { count: "exact", head: true })
                    .eq("session_id", sessionId);
                setPlayerCount(count || 0);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [sessionId]);

    // Track answers for current question
    useEffect(() => {
        if (!sessionId || !questions[currentIndex]) return;
        setAnswersCount(0);
        const qId = questions[currentIndex].id;
        const answeredPlayerIds = new Set<string>();

        async function fetchInitialAnswers() {
            // @ts-ignore
            const { data } = await supabase.from("quiz_players").select("id, answers").eq("session_id", sessionId);
            if (data) {
                data.forEach((p: any) => {
                    if (p.answers && p.answers[qId] !== undefined) answeredPlayerIds.add(p.id);
                });
                setAnswersCount(answeredPlayerIds.size);
            }
        }
        fetchInitialAnswers();

        const channel = supabase
            .channel(`host-answers-${currentIndex}-${Date.now()}`)
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "quiz_players", filter: `session_id=eq.${sessionId}` },
                (payload) => {
                    const pId = payload.new.id;
                    const answers = payload.new.answers || {};
                    if (answers[qId] !== undefined && !answeredPlayerIds.has(pId)) {
                        answeredPlayerIds.add(pId);
                        setAnswersCount(answeredPlayerIds.size);
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [sessionId, currentIndex, questions]);

    // Auto-skip when everyone answered
    useEffect(() => {
        if (gameState === "question" && playerCount > 0 && answersCount >= playerCount) {
            setTimeLeft(0);
        }
    }, [answersCount, playerCount, gameState]);

    // Timer countdown + blur
    useEffect(() => {
        if (loading || gameState !== "question") return;
        if (timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            const q = questions[currentIndex];
            if (q?.question_type === "blur_image") {
                const t = q.time_limit || 20;
                setBlurLevel(Math.round(30 * (timeLeft / t)));
            }
            return () => clearTimeout(timer);
        } else {
            setGameState("results");
            // @ts-ignore
            supabase.from("quiz_sessions").update({ status: "results" }).eq("id", sessionId).then();
            fetchAnswerDistribution();
        }
    }, [timeLeft, loading, gameState, sessionId]);

    const fetchAnswerDistribution = async () => {
        if (!sessionId || !questions[currentIndex]) return;
        const qId = questions[currentIndex].id;
        // @ts-ignore
        const { data } = await supabase.from("quiz_players").select("answers").eq("session_id", sessionId);
        if (data) {
            const counts = [0, 0, 0, 0, 0, 0];
            let unanswered = 0;
            const entries: string[] = [];
            data.forEach((p: any) => {
                if (p.answers && p.answers[qId] !== undefined) {
                    const chosen = p.answers[qId];
                    if (typeof chosen === "number" && chosen >= 0 && chosen < 6) counts[chosen]++;
                    if (typeof chosen === "string") entries.push(chosen);
                } else {
                    unanswered++;
                }
            });
            setOptionCounts(counts);
            setUnansweredCount(unanswered);
            setTextEntries(entries);
        }
    };

    // Fetch Top 5 Players for leaderboard
    useEffect(() => {
        if (gameState === "leaderboard") {
            supabase
                .from("quiz_players")
                .select("id, nickname, avatar_url, score")
                .eq("session_id", sessionId)
                .order("score", { ascending: false })
                .limit(5)
                .then(({ data }) => {
                    if (data) setTopPlayers(data as any);
                });
        }
    }, [gameState, sessionId]);

    const handleGetReadyDone = () => {
        setQuestionPreviewTime(5);
        setGameState("show_question");
        // @ts-ignore – update status so players see it too
        supabase.from("quiz_sessions").update({ status: "show_question", current_question_index: currentIndex }).eq("id", sessionId).then();
    };

    // 10-second "show question only" countdown
    useEffect(() => {
        if (gameState !== "show_question") return;
        if (questionPreviewTime > 0) {
            const timer = setTimeout(() => setQuestionPreviewTime(t => t - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setGameState("question");
            // @ts-ignore
            supabase.from("quiz_sessions").update({ status: "question" }).eq("id", sessionId).then();
        }
    }, [gameState, questionPreviewTime, sessionId]);

    const handleNext = async () => {
        if (gameState === "question") {
            setTimeLeft(0);
        } else if (gameState === "results") {
            const nextIndex = currentIndex + 1;
            if (nextIndex >= questions.length) {
                // @ts-ignore
                await supabase.from("quiz_sessions").update({ status: "finished" }).eq("id", sessionId);
                // @ts-ignore
                const { data: finalPlayers } = await supabase
                    .from("quiz_players")
                    .select("id, nickname, avatar_url, score")
                    .eq("session_id", sessionId)
                    .order("score", { ascending: false });
                // Persist session for leaderboard and results
                // await supabase.from("quiz_players").delete().eq("session_id", sessionId);
                // await supabase.from("quiz_sessions").delete().eq("id", sessionId);
                navigate(`/quiz/leaderboard/${sessionId}`, { state: { players: finalPlayers || [] } });
            } else {
                setGameState("leaderboard");
                // @ts-ignore
                await supabase.from("quiz_sessions").update({ status: "leaderboard" }).eq("id", sessionId);
            }
        } else if (gameState === "leaderboard") {
            const nextIndex = currentIndex + 1;
            if (nextIndex < questions.length) {
                setAnswersCount(0);
                setCurrentIndex(nextIndex);
                const tl = questions[nextIndex].time_limit || 20;
                setTimeLeft(tl);
                setTotalTime(tl);
                setBlurLevel(30);
                setGameState("get_ready"); // Show intro before next question
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#46178f] via-[#5b21b6] to-[#7c3aed] flex items-center justify-center">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                    <div className="text-6xl mb-6 animate-bounce">🎮</div>
                    <div className="text-white text-3xl font-bold animate-pulse">Loading game...</div>
                </motion.div>
            </div>
        );
    }

    const currentQ = questions[currentIndex];
    if (!currentQ) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#46178f] to-[#7c3aed] flex items-center justify-center">
                <div className="text-white text-3xl font-bold">No questions available</div>
            </div>
        );
    }

    const qType = currentQ.question_type || "quiz";
    const typeInfo = TYPE_INFO[qType] || TYPE_INFO.quiz;

    // ===== GET READY / INTRO SCREEN =====
    if (gameState === "get_ready") {
        return (
            <GetReadyScreen
                questionNum={currentIndex + 1}
                totalQuestions={questions.length}
                qType={qType}
                onReady={handleGetReadyDone}
            />
        );
    }

    // ===== SHOW QUESTION ONLY (10s preview) =====
    if (gameState === "show_question") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#46178f] via-[#5b21b6] to-[#7c3aed] flex flex-col items-center justify-center p-6 text-white text-center relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />
                    <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />
                </div>

                {/* Top bar */}
                <div className="absolute top-0 left-0 right-0 bg-white/10 backdrop-blur-md p-4 flex items-center justify-between border-b border-white/10 z-20">
                    <div className="flex items-center gap-3">
                        <span className="bg-white/15 px-3 py-1 rounded-lg text-sm font-black">Q{currentIndex + 1}/{questions.length}</span>
                        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-white/70">
                            <span>{typeInfo.icon}</span> {typeInfo.label}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-white/50">Read the question</span>
                        <Button onClick={() => { setQuestionPreviewTime(0); }} className="bg-white text-[#46178f] hover:bg-white/90 font-black h-10 px-6 rounded-xl shadow-lg transition-transform hover:scale-105">
                            <SkipForward className="w-4 h-4 mr-2" /> Skip
                        </Button>
                    </div>
                </div>

                {/* Countdown ring */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="absolute top-24 right-8 z-20"
                >
                    <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl">
                        <span className="text-3xl font-black text-white">{questionPreviewTime}</span>
                    </div>
                </motion.div>

                {/* Question image */}
                {currentQ.image_url && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, rotateX: 20 }}
                        animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 100, damping: 15 }}
                        className="mb-8 relative z-10 perspective-1000"
                    >
                        <img
                            src={currentQ.image_url}
                            alt="Question"
                            className="max-h-[35vh] max-w-[70vw] object-contain rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-white/20"
                        />
                    </motion.div>
                )}

                {/* Question text — big, centered, revealing word by word */}
                <motion.h1
                    initial="hidden"
                    animate="visible"
                    variants={{
                        hidden: { opacity: 0 },
                        visible: {
                            opacity: 1,
                            transition: {
                                staggerChildren: 0.1,
                                delayChildren: 0.3
                            }
                        }
                    }}
                    className="text-3xl md:text-6xl lg:text-7xl font-black leading-tight max-w-7xl mx-auto drop-shadow-2xl relative z-10 flex flex-wrap justify-center gap-x-6 gap-y-4"
                    dir="auto"
                >
                    {currentQ.question_text.split(" ").map((word: string, i: number) => (
                        <motion.span
                            key={i}
                            variants={{
                                hidden: { opacity: 0, y: 50, rotateX: -90 },
                                visible: { opacity: 1, y: 0, rotateX: 0 }
                            }}
                            transition={{ type: "spring", stiffness: 200, damping: 12 }}
                            className="inline-block"
                        >
                            {word}
                        </motion.span>
                    ))}
                </motion.h1>

                {/* Pulsing hint */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-12 text-xl text-white/40 animate-pulse relative z-10 font-bold tracking-widest uppercase"
                >
                    Answers coming in {questionPreviewTime}s...
                </motion.p>
            </div>
        );
    }

    // ===== LEADERBOARD VIEW =====
    if (gameState === "leaderboard") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#46178f] via-[#5b21b6] to-[#7c3aed] text-white flex flex-col p-6 overflow-hidden relative">
                {/* Background orbs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-20 right-20 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-20 left-20 w-64 h-64 bg-purple-400/10 rounded-full blur-3xl" />
                </div>

                <div className="relative z-10 bg-white/10 backdrop-blur-md p-4 flex items-center justify-between rounded-2xl mb-8 border border-white/10">
                    <div className="flex items-center gap-3">
                        <Trophy className="w-6 h-6 text-yellow-400" />
                        <span className="text-xl font-black">Leaderboard</span>
                    </div>
                    <Button onClick={handleNext} className="bg-white text-[#46178f] hover:bg-white/90 font-black h-12 px-8 text-lg rounded-xl shadow-lg transition-transform hover:scale-105">
                        {currentIndex + 1 >= questions.length ? "Finish 🏁" : "Next →"}
                    </Button>
                </div>

                <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-5 w-full">
                    {topPlayers.map((p, i) => {
                        const isTop3 = i < 3;
                        // Determine delay so they reveal from lowest rank to highest
                        const delay = (topPlayers.length - 1 - i) * 0.5;

                        return (
                            <motion.div
                                key={p.id}
                                initial={{ y: 200, opacity: 0, scale: 0.5 }}
                                animate={{ y: 0, opacity: 1, scale: 1 }}
                                transition={{ delay, type: "spring", stiffness: 100, mass: 1.2, damping: 12 }}
                                className={`w-full max-w-2xl ${isTop3 ? "z-20" : "z-10"}`}
                            >
                                <div className={`relative bg-white/10 backdrop-blur-md rounded-3xl p-5 flex items-center gap-5 border border-white/10 transition-all overflow-hidden ${i === 0 ? "ring-4 ring-yellow-400 bg-yellow-400/20 shadow-[0_0_60px_rgba(250,204,21,0.5)] transform hover:scale-105"
                                    : i === 1 ? "ring-2 ring-slate-300 bg-slate-300/10 shadow-[0_0_30px_rgba(203,213,225,0.2)] transform hover:scale-105"
                                        : i === 2 ? "ring-2 ring-amber-600 bg-amber-600/10 shadow-[0_0_30px_rgba(217,119,6,0.2)] transform hover:scale-105"
                                            : "opacity-80 scale-95"
                                    }`}>
                                    {/* Shimmer effect for 1st place */}
                                    {i === 0 && (
                                        <motion.div
                                            initial={{ x: "-100%" }}
                                            animate={{ x: "200%" }}
                                            transition={{ delay: delay + 0.8, duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                                            className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 z-0"
                                        />
                                    )}

                                    {/* Rank Badge */}
                                    <motion.div
                                        initial={{ rotate: -180, scale: 0 }}
                                        animate={{ rotate: 0, scale: 1 }}
                                        transition={{ delay: delay + 0.5, type: "spring", stiffness: 200 }}
                                        className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-3xl shadow-2xl relative z-10 ${i === 0 ? "bg-gradient-to-br from-yellow-300 to-yellow-600 text-yellow-950"
                                            : i === 1 ? "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800"
                                                : i === 2 ? "bg-gradient-to-br from-amber-500 to-orange-700 text-orange-50"
                                                    : "bg-white/10 text-white/50"
                                            }`}>
                                        {i + 1}
                                    </motion.div>

                                    {/* Avatar */}
                                    <motion.span
                                        initial={{ scale: 0, rotate: -20 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ delay: delay + 0.3, type: "spring", stiffness: 200 }}
                                        className={`drop-shadow-xl relative z-10 ${i === 0 ? "text-7xl" : "text-6xl"}`}
                                    >
                                        {p.avatar_url || "👤"}
                                    </motion.span>

                                    {/* Name */}
                                    <div className="flex-1 overflow-hidden relative z-10">
                                        <div className={`font-black truncate ${i === 0 ? "text-4xl text-yellow-300 drop-shadow-md" : isTop3 ? "text-3xl" : "text-2xl"}`}>
                                            {p.nickname}
                                        </div>
                                    </div>

                                    {/* Score */}
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: delay + 0.7, type: "spring", stiffness: 200 }}
                                        className={`backdrop-blur-sm rounded-xl px-6 py-3 relative z-10 flex items-baseline gap-2 ${i === 0 ? "bg-yellow-400 text-yellow-950 shadow-lg" : "bg-white/15 text-white"
                                            }`}
                                    >
                                        <span className={`font-black ${i === 0 ? "text-5xl" : "text-3xl"}`}>{p.score}</span>
                                        <span className={`font-bold uppercase tracking-widest ${i === 0 ? "text-yellow-900/60 text-sm" : "text-white/60 text-xs"}`}>pts</span>
                                    </motion.div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ===== RESULTS VIEW =====
    if (gameState === "results") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#46178f] via-[#5b21b6] to-[#7c3aed] flex flex-col items-stretch overflow-y-auto text-white relative">
                {/* Top bar */}
                <div className="bg-white/10 backdrop-blur-md p-4 flex items-center justify-between border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <span className="bg-white/15 px-3 py-1 rounded-lg text-sm font-black">Q{currentIndex + 1}/{questions.length}</span>
                        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-white/70">
                            <span>{typeInfo.icon}</span> {typeInfo.label}
                        </span>
                    </div>
                    <span className="text-sm font-bold text-white/50">Results</span>
                </div>

                {/* Question Text */}
                <div className="p-8 text-center shrink-0">
                    <h1 className="text-4xl md:text-6xl font-black leading-tight max-w-6xl mx-auto drop-shadow-md" dir="auto">
                        {currentQ.question_text}
                    </h1>
                </div>

                <div className="flex-1 w-full max-w-5xl mx-auto flex flex-col items-center justify-center p-6 gap-6 overflow-hidden">
                    {/* Choice-based bar chart results */}
                    {(qType === "quiz" || qType === "true_false" || qType === "blur_image" || qType === "eliminate") && (
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="w-full bg-white/10 backdrop-blur-md rounded-3xl p-6 md:p-10 border border-white/10 shadow-2xl"
                        >
                            <div className="flex items-end gap-3 md:gap-5 justify-center h-[250px] md:h-[350px]">
                                {currentQ.options.map((opt, i) => {
                                    const count = optionCounts[i] || 0;
                                    const maxCount = Math.max(...optionCounts.slice(0, currentQ.options.length), 1);
                                    const barPercent = Math.max(8, (count / maxCount) * 100);
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ delay: 0.3 + i * 0.1, type: "spring" }}
                                                className="text-4xl font-black mb-2"
                                            >
                                                {count}
                                            </motion.div>
                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: `${barPercent}%` }}
                                                transition={{ delay: 0.2 + i * 0.1, duration: 0.6 }}
                                                className={`${BAR_COLORS[i % BAR_COLORS.length]} w-full rounded-2xl shadow-lg ${opt.isCorrect ? 'ring-4 ring-white ring-offset-4 ring-offset-transparent' : 'opacity-40'}`}
                                            />
                                            <div className={`${BAR_COLORS[i % BAR_COLORS.length]} w-full h-12 md:h-16 rounded-2xl flex items-center justify-center text-white font-bold gap-2 shadow-md text-lg md:text-xl`}>
                                                <span className="text-2xl md:text-3xl">{OPTION_STYLES[i % OPTION_STYLES.length]?.icon}</span>
                                                {opt.isCorrect && <span className="text-2xl">✓</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}

                    {(qType === "type_answer" || qType === "fast_typing") && (
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-3xl bg-white/10 backdrop-blur-md rounded-3xl p-12 text-center border border-white/10 shadow-xl">
                            <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Correct Answer</p>
                            <p className="text-5xl md:text-7xl font-black text-green-400 drop-shadow-md">
                                {qType === "type_answer" ? currentQ.extra_config?.correct_answer || "—" : currentQ.extra_config?.target_text || "—"}
                            </p>
                        </motion.div>
                    )}

                    {qType === "slider" && (
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-3xl bg-white/10 backdrop-blur-md rounded-3xl p-12 text-center border border-white/10 shadow-xl">
                            <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Correct Value</p>
                            <p className="text-7xl md:text-8xl font-black text-green-400 drop-shadow-md">{currentQ.extra_config?.slider_correct ?? "—"}</p>
                            <p className="text-xl text-white/40 mt-4 font-bold">Range: {currentQ.extra_config?.slider_min ?? 0} — {currentQ.extra_config?.slider_max ?? 100}</p>
                        </motion.div>
                    )}

                    {qType === "puzzle" && (
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-2xl bg-white/10 backdrop-blur-md rounded-3xl p-10 border border-white/10 shadow-xl">
                            <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-6 text-center">Correct Order</p>
                            <div className="flex flex-col gap-4">
                                {(currentQ.extra_config?.puzzle_items || []).map((item: string, i: number) => (
                                    <div key={i} className="flex items-center gap-5 bg-green-500/10 border border-green-400/20 rounded-2xl p-5">
                                        <span className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-black text-xl">{i + 1}</span>
                                        <span className="font-black text-2xl">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {(qType === "word_cloud" || qType === "brainstorm" || qType === "poll") && textEntries.length > 0 && (
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-5xl bg-white/10 backdrop-blur-md rounded-3xl p-10 border border-white/10 shadow-xl">
                            <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-6 text-center">Responses ({textEntries.length})</p>
                            <div className="flex flex-wrap gap-4 justify-center">
                                {textEntries.map((entry, i) => (
                                    <span key={i} className="bg-white/10 px-6 py-3 rounded-2xl font-black text-2xl border border-white/10 shadow-sm">
                                        {entry}
                                    </span>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Next Button */}
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
                        <Button
                            onClick={handleNext}
                            className="h-16 px-16 rounded-3xl bg-white text-[#46178f] text-2xl font-black hover:bg-white/90 hover:scale-105 shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all uppercase tracking-wider"
                        >
                            Next Question →
                        </Button>
                    </motion.div>
                </div>

                {/* Answer grid overlay for choice types */}
                {(qType === "quiz" || qType === "true_false" || qType === "blur_image" || qType === "eliminate") && (
                    <div className="p-4 grid grid-cols-2 gap-3 shrink-0">
                        {currentQ.options.map((opt, i) => (
                            <motion.div
                                key={i}
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: i * 0.1 }}
                                className={`${OPTION_STYLES[i % OPTION_STYLES.length]?.color} rounded-2xl p-3 md:p-4 flex items-center gap-3 text-white shadow-lg relative overflow-hidden`}
                            >
                                <div className="text-xl md:text-3xl font-black opacity-40">{OPTION_STYLES[i % OPTION_STYLES.length]?.icon}</div>
                                <span className="text-xl md:text-3xl font-black leading-tight flex-1">{opt.text}</span>
                                {opt.isCorrect && (
                                    <div className="bg-white text-green-500 rounded-full p-1.5 shadow-lg z-20">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    </div>
                                )}
                                <span className="bg-white/20 backdrop-blur-sm rounded-full px-5 py-1 text-2xl font-black z-20">
                                    {optionCounts[i] || 0}
                                </span>
                                {!opt.isCorrect && <div className="absolute inset-0 bg-black/40 z-10" />}
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ===== QUESTION VIEW =====
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#46178f] via-[#5b21b6] to-[#7c3aed] flex flex-col items-stretch overflow-y-auto text-white relative">
            {/* Background orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -right-32 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -left-32 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
            </div>

            {/* Waiting Counter (Floating on the left) */}
            <AnimatePresence>
                {(playerCount - answersCount) > 0 && (
                    <motion.div
                        initial={{ x: -200, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -200, opacity: 0 }}
                        className="fixed left-8 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center"
                    >
                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[30px] p-5 flex flex-col items-center gap-2.5 shadow-2xl min-w-[160px]">
                            <div className="w-12 h-12 bg-white text-zingoo-purple rounded-full flex items-center justify-center font-black text-xl shadow-lg animate-pulse">
                                {playerCount - answersCount}
                            </div>
                            <div className="text-center">
                                <div className="text-white font-black text-base uppercase tracking-tighter">Waiting for</div>
                                <div className="text-white/60 font-bold text-[10px] uppercase tracking-widest mt-0.5">Players...</div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Top bar */}
            <div className="relative z-10 bg-black/20 backdrop-blur-md p-3 px-5 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-3">
                    <span className="bg-white/15 px-3 py-1 rounded-lg text-sm font-black">Q{currentIndex + 1}/{questions.length}</span>
                    <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-lg text-sm font-bold">
                        <span>{typeInfo.icon}</span> {typeInfo.label}
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-2xl font-black text-white bg-white/20 px-4 py-1 rounded-xl">
                        {answersCount}/{playerCount}
                    </span>
                    <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-green-400 rounded-full transition-all duration-300"
                            style={{ width: `${playerCount > 0 ? (answersCount / playerCount) * 100 : 0}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Question Text */}
            <div className="relative z-10 p-8 md:p-12 text-center shrink-0">
                <h1 className="text-2xl md:text-5xl font-black leading-tight max-w-7xl mx-auto drop-shadow-lg" dir="auto">
                    {currentQ.question_text}
                </h1>
            </div>

            {/* Main Content Area */}
            <div className="relative z-10 flex-1 flex flex-col md:flex-row p-4 gap-6 items-center justify-center min-h-0">
                {/* Timer */}
                <CircularTimer timeLeft={timeLeft} totalTime={totalTime} />

                {/* Media / Type-specific content */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full max-w-2xl flex-1 bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl border border-white/15 overflow-hidden flex items-center justify-center min-h-[150px] md:min-h-[250px]"
                >
                    {qType === "blur_image" && currentQ.image_url ? (
                        <img
                            src={currentQ.image_url}
                            alt="Guess"
                            className="w-full h-full object-contain max-h-[300px] p-4 transition-all duration-1000"
                            style={{ filter: `blur(${blurLevel}px)` }}
                        />
                    ) : currentQ.image_url ? (
                        <img src={currentQ.image_url} alt="Question" className="w-full h-full object-contain max-h-[300px] p-4" />
                    ) : qType === "slider" ? (
                        <div className="text-center p-6">
                            <p className="text-5xl md:text-6xl font-black">{currentQ.extra_config?.slider_min ?? 0} — {currentQ.extra_config?.slider_max ?? 100}</p>
                            <p className="text-lg mt-3 text-white/50">Players are sliding to guess...</p>
                        </div>
                    ) : qType === "fast_typing" ? (
                        <div className="text-center p-6">
                            <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-3">Type this:</p>
                            <p className="text-2xl md:text-3xl font-black font-mono">{currentQ.extra_config?.target_text || "..."}</p>
                        </div>
                    ) : qType === "type_answer" ? (
                        <div className="text-center p-6">
                            <p className="text-7xl opacity-20">⌨️</p>
                            <p className="text-lg mt-3 text-white/50">Players are typing...</p>
                        </div>
                    ) : qType === "puzzle" ? (
                        <div className="text-center p-6">
                            <p className="text-7xl opacity-20">🧩</p>
                            <p className="text-lg mt-3 text-white/50">Players are ordering items...</p>
                        </div>
                    ) : qType === "word_cloud" || qType === "brainstorm" ? (
                        <div className="text-center p-6">
                            <p className="text-7xl opacity-20">{qType === "word_cloud" ? "☁️" : "💡"}</p>
                            <p className="text-lg mt-3 text-white/50">Players are submitting...</p>
                        </div>
                    ) : (
                        <div className="text-7xl font-black text-white/10">?</div>
                    )}
                </motion.div>

                {/* Skip Button */}
                <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                    <Button
                        onClick={handleNext}
                        className="h-12 px-6 rounded-xl bg-white/10 hover:bg-white/20 text-white text-base font-black border border-white/15 shadow-lg transition-all hover:scale-105"
                    >
                        <SkipForward className="w-4 h-4 mr-2" />
                        Skip
                    </Button>
                </motion.div>
            </div>

            {/* Answer Options Grid */}
            {(qType === "quiz" || qType === "blur_image" || qType === "eliminate") && (
                <div className="relative z-10 p-4 grid grid-cols-2 gap-3 shrink-0">
                    {currentQ.options.map((opt, i) => (
                        <motion.div
                            key={i}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: i * 0.08 }}
                            className={`${OPTION_STYLES[i % OPTION_STYLES.length]?.color} rounded-2xl p-3 md:p-4 flex items-center gap-3 text-white shadow-lg`}
                        >
                            <div className="text-xl md:text-4xl font-black opacity-40">{OPTION_STYLES[i % OPTION_STYLES.length]?.icon}</div>
                            <span className="text-2xl md:text-5xl font-black leading-tight flex-1">{opt.text}</span>
                        </motion.div>
                    ))}
                </div>
            )}

            {qType === "true_false" && (
                <div className="relative z-10 p-4 grid grid-cols-2 gap-6 shrink-0 flex-1">
                    <div className="quiz-button-blue rounded-3xl p-6 md:p-10 flex items-center justify-center text-white shadow-xl">
                        <span className="text-4xl md:text-7xl font-black">TRUE</span>
                    </div>
                    <div className="quiz-button-red rounded-3xl p-6 md:p-10 flex items-center justify-center text-white shadow-xl">
                        <span className="text-4xl md:text-7xl font-black">FALSE</span>
                    </div>
                </div>
            )}

            {qType === "poll" && (
                <div className="relative z-10 p-4 grid grid-cols-2 gap-3 shrink-0">
                    {currentQ.options.map((opt, i) => (
                        <motion.div
                            key={i}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: i * 0.08 }}
                            className={`${OPTION_STYLES[i % OPTION_STYLES.length]?.color} rounded-2xl p-3 md:p-4 flex items-center gap-3 text-white shadow-lg`}
                        >
                            <div className="text-xl md:text-4xl font-black opacity-40">{OPTION_STYLES[i % OPTION_STYLES.length]?.icon}</div>
                            <span className="text-2xl md:text-5xl font-black leading-tight flex-1">{opt.text}</span>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
