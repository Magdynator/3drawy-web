import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const BUTTON_COLORS = [
    { bg: "bg-zingoo-red", shadow: "shadow-[0_6px_0_#991b1b]", active: "active:shadow-[0_2px_0_#991b1b]", icon: "▲" },
    { bg: "bg-zingoo-blue", shadow: "shadow-[0_6px_0_#1e3a5f]", active: "active:shadow-[0_2px_0_#1e3a5f]", icon: "◆" },
    { bg: "bg-zingoo-yellow", shadow: "shadow-[0_6px_0_#a16207]", active: "active:shadow-[0_2px_0_#a16207]", icon: "●" },
    { bg: "bg-zingoo-green", shadow: "shadow-[0_6px_0_#15803d]", active: "active:shadow-[0_2px_0_#15803d]", icon: "■" },
];

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
    fast_typing: { icon: "⚡", label: "Fast Typing", desc: "Type it fast!", color: "from-lime-500 to-green-500" },
};

function GetReadyCountdown({ typeInfo, isFirst }: { typeInfo: any, isFirst: boolean }) {
    const [countdown, setCountdown] = useState(isFirst ? 3 : 0);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    return (
        <div className={`min-h-screen bg-gradient-to-br ${typeInfo.color} text-white flex flex-col items-center justify-center p-6 text-center relative overflow-hidden`}>
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-32 -right-32 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
            </div>

            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }} className="relative z-10 text-[100px] mb-4">
                {typeInfo.icon}
            </motion.div>

            <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }} className="relative z-10 text-4xl md:text-5xl font-black mb-2">
                {typeInfo.label}
            </motion.h1>

            <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="relative z-10 text-xl text-white/60 font-semibold mb-8">
                {typeInfo.desc}
            </motion.p>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="relative z-10 flex flex-col items-center"
            >
                <motion.div
                    key={countdown}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1.5, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="text-7xl md:text-8xl font-black mb-6"
                >
                    {countdown > 0 ? countdown : "GO!"}
                </motion.div>

                <div className="flex gap-2">
                    {[0, 1, 2].map(i => (
                        <motion.div
                            key={i}
                            animate={{
                                scale: (3 - countdown) > i ? [1, 1.2, 1] : 1,
                                opacity: (3 - countdown) > i ? 1 : 0.3
                            }}
                            className="w-3 h-3 rounded-full bg-white"
                        />
                    ))}
                </div>
            </motion.div>
        </div>
    );
}

export default function QuizPlayerGamePage() {
    const { sessionId } = useParams();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const playerId = searchParams.get("playerId");
    const [status, setStatus] = useState<"waiting" | "get_ready" | "show_question" | "question" | "answered" | "results" | "leaderboard" | "finished">("waiting");
    const [playerInfo, setPlayerInfo] = useState<{ nickname: string, avatar_url: string } | null>(null);

    const [questions, setQuestions] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [localTimeLeft, setLocalTimeLeft] = useState(20);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [scoreEarned, setScoreEarned] = useState(0);
    const [hasAnswered, setHasAnswered] = useState(false);

    // Type-specific state
    const [textInput, setTextInput] = useState("");
    const [sliderValue, setSliderValue] = useState(50);
    const [puzzleOrder, setPuzzleOrder] = useState<string[]>([]);
    const [eliminatedIndices, setEliminatedIndices] = useState<Set<number>>(new Set());
    const [draggedItem, setDraggedItem] = useState<number | null>(null);

    // Initial Load
    useEffect(() => {
        if (!sessionId || !playerId) return;

        async function init() {
            // @ts-ignore
            const { data: session } = await supabase
                .from("quiz_sessions")
                .select("*")
                .eq("id", sessionId)
                .single();

            if (session) {
                // Fetch player's info for the waiting screen
                // @ts-ignore
                const { data: pData } = await supabase.from("quiz_players").select("nickname, avatar_url").eq("id", playerId).single();
                if (pData) setPlayerInfo(pData);

                let currentQs = [];
                // Use pre-fetched questions if available
                if (location.state?.questions && Array.isArray(location.state.questions)) {
                    currentQs = location.state.questions;
                    setQuestions(currentQs);
                } else {
                    // @ts-ignore
                    const { data: qs } = await supabase
                        .from("quiz_questions")
                        .select("*")
                        .eq("quiz_id", session.quiz_id)
                        .order("position", { ascending: true });

                    if (qs) {
                        currentQs = qs;
                        setQuestions(currentQs);
                    }
                }
                setCurrentIndex(session.current_question_index);

                if (session.status === "finished") setStatus("finished");
                else if (session.status === "leaderboard") setStatus("leaderboard");
                else if (session.status === "results") setStatus("results");
                else if (session.status === "show_question") {
                    setStatus("show_question");
                    setCurrentIndex(session.current_question_index);
                } else if (session.status === "question") {
                    setStatus("question");
                    setLocalTimeLeft(currentQs?.[session.current_question_index]?.time_limit || 20);
                    initQuestionState(currentQs?.[session.current_question_index]);
                } else if (session.status === "lobby" || session.status === "waiting") {
                    setStatus("waiting");
                } else {
                    setStatus("get_ready");
                }
            }
        }
        init();

        // Realtime Subscription
        const channel = supabase
            .channel(`player-game-${playerId}`)
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "quiz_sessions", filter: `id=eq.${sessionId}` },
                (payload: any) => {
                    const newStatus = payload.new.status;
                    const newIndex = payload.new.current_question_index;

                    if (newStatus === "finished") {
                        setStatus("finished");
                        // We will no longer redirect the player to the big screen cinematic view.
                        // Instead, we will show them their final personal rank right here on their device.
                    } else if (newStatus === "leaderboard") {
                        setStatus("leaderboard");
                    } else if (newStatus === "results") {
                        setStatus(old => {
                            if (old !== "answered") {
                                setIsCorrect(false);
                                setScoreEarned(0);
                            }
                            return "results";
                        });
                    } else if (newStatus === "show_question") {
                        setStatus("show_question");
                        setCurrentIndex(newIndex);
                        setIsCorrect(null);
                        setScoreEarned(0);
                        setHasAnswered(false);
                        setTextInput("");
                        setSliderValue(50);
                        setEliminatedIndices(new Set());
                    } else if (newStatus === "question") {
                        setStatus("question");
                        setCurrentIndex(newIndex);
                        setIsCorrect(null);
                        setScoreEarned(0);
                        setHasAnswered(false);
                        setTextInput("");
                        setSliderValue(50);
                        setEliminatedIndices(new Set());
                        setLocalTimeLeft(questions[newIndex]?.time_limit || 20);
                        initQuestionState(questions[newIndex]);
                    } else if (newStatus === "lobby" || newStatus === "waiting") {
                        setStatus("waiting");
                    } else if (newStatus === "get_ready") {
                        setStatus("get_ready");
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [sessionId, playerId, questions.length]);

    const initQuestionState = (q: any) => {
        if (!q) return;
        if (q.question_type === "slider") {
            const cfg = q.extra_config || {};
            setSliderValue(Math.round(((cfg.slider_min ?? 0) + (cfg.slider_max ?? 100)) / 2));
        }
        if (q.question_type === "puzzle") {
            const items = [...(q.extra_config?.puzzle_items || [])];
            // Shuffle
            for (let i = items.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [items[i], items[j]] = [items[j], items[i]];
            }
            setPuzzleOrder(items);
        }
    };

    // Fetch Leaderboard for Player Device intelligence
    const [allPlayers, setAllPlayers] = useState<any[]>([]);

    useEffect(() => {
        if (status === "leaderboard" || status === "finished") {
            const fetchLeaderboard = async () => {
                // @ts-ignore
                const { data } = await supabase
                    .from("quiz_players")
                    .select("id, nickname, avatar_url, score")
                    .eq("session_id", sessionId)
                    .order("score", { ascending: false });
                if (data) setAllPlayers(data as any);
            };
            fetchLeaderboard();
        }
    }, [status, sessionId]);

    // Local Timer for scoring
    useEffect(() => {
        if (status === "question" && localTimeLeft > 0 && !hasAnswered) {
            const timer = setTimeout(() => setLocalTimeLeft(t => t - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [status, localTimeLeft, hasAnswered]);

    // --- Answer handlers per type ---
    const submitAnswer = useCallback(async (answerValue: any, correct: boolean) => {
        if (status !== "question" || hasAnswered) return;
        setHasAnswered(true);
        setStatus("answered");
        setIsCorrect(correct);

        const q = questions[currentIndex];
        if (!q) return;

        let points = 0;
        if (correct) {
            const maxTime = q.time_limit || 20;
            const ratio = Math.max(0, localTimeLeft / maxTime);
            points = Math.round(500 + (500 * ratio));
        }
        setScoreEarned(points);

        try {
            // @ts-ignore
            const { data: playerData } = await supabase
                .from("quiz_players").select("score, answers").eq("id", playerId).single();

            const prevScore = playerData?.score || 0;
            const prevAnswers = playerData?.answers || {};
            const updatedAnswers = { ...prevAnswers, [q.id]: answerValue };

            // @ts-ignore
            await supabase.from("quiz_players")
                .update({ score: prevScore + points, answers: updatedAnswers })
                .eq("id", playerId);
        } catch (err) {
            console.error("Failed to update score/answers", err);
        }
    }, [status, hasAnswered, questions, currentIndex, localTimeLeft, playerId]);

    const handleChoiceAnswer = (index: number) => {
        const q = questions[currentIndex];
        if (!q) return;
        const isAnsCorrect = q.options[index]?.isCorrect;
        submitAnswer(index, isAnsCorrect);
    };

    const handleTypeAnswer = () => {
        const q = questions[currentIndex];
        if (!q) return;
        const correctAnswers = (q.extra_config?.correct_answer || "").split(",").map((s: string) => s.trim().toLowerCase());
        const isAnsCorrect = correctAnswers.includes(textInput.trim().toLowerCase());
        submitAnswer(textInput.trim(), isAnsCorrect);
    };

    const handleSliderSubmit = () => {
        const q = questions[currentIndex];
        if (!q) return;
        const correct = q.extra_config?.slider_correct ?? 50;
        const isAnsCorrect = sliderValue === correct;
        submitAnswer(sliderValue, isAnsCorrect);
    };

    const handlePuzzleSubmit = () => {
        const q = questions[currentIndex];
        if (!q) return;
        const correctOrder = q.extra_config?.puzzle_items || [];
        const isAnsCorrect = puzzleOrder.every((item, i) => item === correctOrder[i]);
        submitAnswer(puzzleOrder, isAnsCorrect);
    };

    const handleEliminateSubmit = () => {
        const q = questions[currentIndex];
        if (!q) return;
        // Check if all eliminated options are incorrect (distractors)
        const allCorrect = Array.from(eliminatedIndices).every(i => !q.options[i]?.isCorrect);
        const eliminatedAll = q.options.filter((_: any, i: number) => !eliminatedIndices.has(i)).every((o: any) => o.isCorrect);
        submitAnswer(Array.from(eliminatedIndices), allCorrect && eliminatedAll);
    };

    const handleFastTypingInput = (value: string) => {
        setTextInput(value);
        const q = questions[currentIndex];
        if (!q) return;
        const target = q.extra_config?.target_text || "";
        if (value === target) {
            submitAnswer(value, true);
        }
    };

    const handlePollVote = (index: number) => {
        submitAnswer(index, false); // Polls have no correct answer
    };

    const handleWordCloudSubmit = () => {
        if (!textInput.trim()) return;
        submitAnswer(textInput.trim(), false); // No scoring
    };

    // --- Puzzle drag and drop helpers ---
    const movePuzzleItem = (fromIdx: number, toIdx: number) => {
        const newOrder = [...puzzleOrder];
        const [removed] = newOrder.splice(fromIdx, 1);
        newOrder.splice(toIdx, 0, removed);
        setPuzzleOrder(newOrder);
    };

    const currentQ = questions[currentIndex];
    const qType = currentQ?.question_type || "quiz";
    const typeInfo = TYPE_INFO[qType] || TYPE_INFO.quiz;

    // ===== STATUS SCREENS =====

    if (status === "waiting") {
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
                            {playerInfo ? (
                                <div className="bg-slate-100 p-6 rounded-2xl inline-flex flex-col items-center gap-3 w-4/5 mx-auto">
                                    <span className="text-6xl animate-bounce">{playerInfo.avatar_url}</span>
                                    <span className="text-3xl font-black text-zingoo-purple truncate w-full px-2">{playerInfo.nickname}</span>
                                </div>
                            ) : (
                                <div className="w-16 h-16 mx-auto mb-4 border-4 border-zingoo-purple border-t-transparent rounded-full animate-spin" />
                            )}
                            <div className="text-slate-400 animate-pulse">
                                Waiting for the host to start...
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        );
    }

    if (status === "get_ready") {
        return (
            <GetReadyCountdown typeInfo={typeInfo} isFirst={currentIndex === 0} />
        );
    }

    if (status === "show_question") {
        const showQ = currentQ?.extra_config?.show_on_player_screen === true;

        return (
            <div className="min-h-screen bg-gradient-to-br from-[#46178f] via-[#5b21b6] to-[#7c3aed] text-white flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />
                    <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />
                </div>

                {showQ ? (
                    <>
                        <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 15 }} className="text-6xl mb-6 relative z-10 drop-shadow-2xl">
                            📖
                        </motion.div>
                        <motion.h1
                            initial="hidden"
                            animate="visible"
                            variants={{
                                hidden: { opacity: 0 },
                                visible: {
                                    opacity: 1,
                                    transition: { staggerChildren: 0.08, delayChildren: 0.2 }
                                }
                            }}
                            className="text-3xl md:text-5xl font-black leading-tight max-w-lg relative z-10 drop-shadow-2xl flex flex-wrap justify-center gap-x-3 gap-y-2"
                            dir="auto"
                        >
                            {currentQ?.question_text?.split(" ").map((word: string, i: number) => (
                                <motion.span
                                    key={i}
                                    variants={{
                                        hidden: { opacity: 0, y: 30, scale: 0.8 },
                                        visible: { opacity: 1, y: 0, scale: 1 }
                                    }}
                                    transition={{ type: "spring", stiffness: 250, damping: 15 }}
                                    className="inline-block"
                                >
                                    {word}
                                </motion.span>
                            ))}
                        </motion.h1>
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-8 text-lg text-white/40 animate-pulse relative z-10 font-bold tracking-widest uppercase">
                            Get ready to answer...
                        </motion.p>
                    </>
                ) : (
                    <>
                        <motion.div initial={{ scale: 0, rotate: 180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 150 }} className="text-8xl mb-6 relative z-10 drop-shadow-2xl">
                            👀
                        </motion.div>
                        <motion.h1
                            initial={{ y: 20, opacity: 0, scale: 0.9 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                            className="text-3xl md:text-5xl font-black relative z-10 drop-shadow-xl"
                        >
                            Look at the screen!
                        </motion.h1>
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-6 text-lg text-white/50 relative z-10 animate-pulse font-bold tracking-widest">
                            READ THE QUESTION CAREFULLY
                        </motion.p>
                    </>
                )}
            </div>
        );
    }

    if (status === "answered") {
        return (
            <div className="min-h-screen zingoo-purple-gradient text-white flex flex-col items-center justify-center p-6 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-8xl mb-6 animate-bounce">⏳</motion.div>
                <h1 className="text-4xl md:text-5xl font-black mb-4">Waiting for others...</h1>
                <p className="text-xl text-white/70">You answered! Hold tight!</p>
            </div>
        );
    }

    if (status === "leaderboard") {
        const myRankIndex = allPlayers.findIndex(p => p.id === playerId);
        const me = allPlayers[myRankIndex];
        const isFirst = myRankIndex === 0;
        const playerAbove = myRankIndex > 0 ? allPlayers[myRankIndex - 1] : null;

        return (
            <div className="min-h-screen bg-gradient-to-b from-indigo-900 to-purple-900 text-white flex flex-col items-center justify-center p-6 text-center">
                <motion.div initial={{ scale: 0, y: -50 }} animate={{ scale: 1, y: 0 }} transition={{ delay: 0.1 }} className="w-full max-w-sm bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/20 shadow-2xl">
                    <h2 className="text-xl text-white/70 uppercase tracking-widest font-bold mb-2">You are currently in</h2>
                    <div className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-500 drop-shadow-md mb-2">
                        {myRankIndex + 1}
                        <span className="text-3xl relative -top-6">
                            {myRankIndex === 0 ? "st" : myRankIndex === 1 ? "nd" : myRankIndex === 2 ? "rd" : "th"}
                        </span>
                    </div>
                    {me && <p className="text-2xl font-black">{me.score} pts</p>}

                    <div className="w-full h-[1px] bg-white/20 my-6" />

                    {isFirst && playerAbove === null && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-yellow-500/20 rounded-2xl border border-yellow-500/50">
                            <span className="text-4xl block mb-2">👑</span>
                            <span className="font-black text-yellow-300 text-xl">You are in the lead!</span>
                            <p className="text-sm text-yellow-100/70 mt-1">Keep it up to win!</p>
                        </motion.div>
                    )}

                    {!isFirst && playerAbove && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="p-4 bg-blue-500/20 rounded-2xl border border-blue-500/50">
                            <p className="text-white/80 font-bold mb-2 uppercase text-sm tracking-wide">You are chasing</p>
                            <div className="flex items-center justify-center gap-3 mb-2">
                                <span className="text-3xl">{playerAbove.avatar_url || "👤"}</span>
                                <span className="text-2xl font-black truncate">{playerAbove.nickname}</span>
                            </div>
                            <div className="bg-red-500/30 text-red-100 px-4 py-2 rounded-xl font-bold inline-block border border-red-500/50">
                                You need {playerAbove.score - me.score} pts to catch up!
                            </div>
                        </motion.div>
                    )}
                </motion.div>

                <p className="mt-8 text-white/50 animate-pulse">Look up at the main screen!</p>
            </div>
        );
    }

    if (status === "results") {
        return (
            <div className={`min-h-screen ${isCorrect ? 'bg-zingoo-green' : 'bg-zingoo-red'} text-white flex flex-col items-center justify-center p-6 text-center transition-colors duration-500`}>
                <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 150 }}
                    className="text-9xl mb-6"
                >
                    {isCorrect ? "✅" : "❌"}
                </motion.div>
                <motion.h1
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-5xl md:text-7xl font-black mb-4"
                >
                    {isCorrect ? "Correct!" : "Incorrect"}
                </motion.h1>
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-3xl bg-black/20 px-8 py-4 rounded-full mt-4 font-black"
                >
                    +{scoreEarned} pts
                </motion.div>
                <div className="mt-12 text-xl opacity-80 animate-pulse">
                    Waiting for next question...
                </div>
            </div>
        );
    }

    if (status === "finished") {
        const myRankIndex = allPlayers.findIndex(p => p.id === playerId);
        const me = allPlayers[myRankIndex];

        return (
            <div className="min-h-screen bg-gradient-to-br from-[#05010f] to-purple-950 text-white flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px]" />
                </div>

                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="text-7xl mb-6">🏁</motion.div>
                <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="text-4xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-b from-white to-purple-200">Game Over!</motion.h1>

                {myRankIndex !== -1 && (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, y: 50 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        transition={{ delay: 0.8, type: "spring" }}
                        className="bg-white/10 backdrop-blur-xl p-8 rounded-[2rem] border border-white/20 shadow-2xl relative z-10 w-full max-w-sm"
                    >
                        <p className="text-white/60 font-bold uppercase tracking-widest text-sm mb-2">Final Rank</p>
                        <div className="text-7xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 to-yellow-500 drop-shadow-xl mb-4">
                            #{myRankIndex + 1}
                        </div>
                        {me && <p className="text-3xl font-black bg-black/20 py-3 rounded-2xl border border-white/5">{me.score} pts</p>}
                    </motion.div>
                )}

                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.0 }} className="text-xl mt-12 text-white/50 animate-pulse">Check the big screen for the podium!</motion.p>
            </div>
        );
    }

    // ===== QUESTION STATE — TYPE-SPECIFIC ANSWER UIs =====

    const showQuestionOnPlayer = currentQ?.extra_config?.show_on_player_screen === true;

    const renderQuestionUI = () => {
        // Quiz / Multiple Choice / Blur Image
        if (qType === "quiz" || qType === "blur_image") {
            return (
                <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col p-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                        {BUTTON_COLORS.slice(0, currentQ.options?.length || 4).map((btn, i) => (
                            <motion.button
                                key={i}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleChoiceAnswer(i)}
                                className={`${btn.bg} ${btn.shadow} ${btn.active} rounded-xl flex items-center justify-center active:translate-y-1 transition-transform min-h-[44px]`}
                            >
                                <span className="text-white text-6xl md:text-8xl drop-shadow-md">{btn.icon}</span>
                            </motion.button>
                        ))}
                    </div>
                </div>
            );
        }

        // True / False
        if (qType === "true_false") {
            return (
                <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col p-4 gap-4">
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleChoiceAnswer(0)}
                        className="flex-1 bg-zingoo-blue shadow-[0_8px_0_#1e3a5f] active:shadow-[0_3px_0_#1e3a5f] rounded-2xl flex items-center justify-center active:translate-y-1 transition-transform min-h-[44px]"
                    >
                        <span className="text-white text-5xl md:text-7xl font-black drop-shadow-lg">TRUE</span>
                    </motion.button>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleChoiceAnswer(1)}
                        className="flex-1 bg-zingoo-red shadow-[0_8px_0_#991b1b] active:shadow-[0_3px_0_#991b1b] rounded-2xl flex items-center justify-center active:translate-y-1 transition-transform min-h-[44px]"
                    >
                        <span className="text-white text-5xl md:text-7xl font-black drop-shadow-lg">FALSE</span>
                    </motion.button>
                </div>
            );
        }

        // Type Answer
        if (qType === "type_answer") {
            return (
                <div className="min-h-screen zingoo-purple-gradient flex flex-col items-center justify-center p-6 gap-6">
                    <div className="text-6xl">⌨️</div>
                    <h2 className="text-white text-2xl font-black text-center">Type your answer</h2>
                    <input
                        type="text"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="Your answer..."
                        autoFocus
                        className="w-full max-w-md h-16 text-2xl text-center font-bold rounded-2xl border-4 border-white/30 bg-white/10 text-white placeholder-white/40 focus:border-white focus:outline-none"
                    />
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleTypeAnswer}
                        disabled={!textInput.trim()}
                        className="w-full max-w-md h-16 bg-zingoo-green text-white text-2xl font-black rounded-2xl shadow-xl hover:scale-105 transition-transform disabled:opacity-40"
                    >
                        Submit
                    </motion.button>
                </div>
            );
        }

        // Slider
        if (qType === "slider") {
            const cfg = currentQ.extra_config || {};
            const min = cfg.slider_min ?? 0;
            const max = cfg.slider_max ?? 100;

            let percentage = max > min ? ((sliderValue - min) / (max - min)) * 100 : 0;
            if (isNaN(percentage)) percentage = 0;

            return (
                <div className="min-h-screen bg-gradient-to-br from-amber-500 via-orange-500 to-orange-700 flex flex-col items-center justify-center p-6 gap-6 relative overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-1/4 left-0 w-96 h-96 bg-yellow-300/30 rounded-full blur-[120px]" />
                        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-red-500/20 rounded-full blur-[120px]" />
                    </div>

                    <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col items-center relative z-10">
                        <div className="text-6xl drop-shadow-md mb-2 animate-bounce">📏</div>
                        <h2 className="text-white text-3xl font-black text-center drop-shadow-md">Slide to your answer</h2>
                    </motion.div>

                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: "spring" }} className="bg-white/10 backdrop-blur-2xl border border-white/20 p-8 rounded-[2rem] w-full max-w-md shadow-2xl flex flex-col items-center relative z-10">
                        <motion.div key={sliderValue} initial={{ scale: 1.1 }} animate={{ scale: 1.0 }} className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-500 drop-shadow-[0_4px_10px_rgba(234,179,8,0.5)] mb-8 h-24 flex items-center justify-center">
                            {sliderValue}
                        </motion.div>

                        <div className="w-full relative px-2 mb-4">
                            <div className="relative h-12 flex items-center">
                                <input
                                    type="range"
                                    min={min}
                                    max={max}
                                    value={sliderValue}
                                    onChange={(e) => setSliderValue(Number(e.target.value))}
                                    className="w-full h-4 md:h-5 rounded-full appearance-none cursor-pointer outline-none shadow-inner transition-all hover:h-6 active:h-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-10 [&::-webkit-slider-thumb]:h-10 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_20px_rgba(250,204,21,0.8)] [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-yellow-400 [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:active:scale-95 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-10 [&::-moz-range-thumb]:h-10 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:shadow-[0_0_20px_rgba(250,204,21,0.8)] [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-yellow-400 [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:hover:scale-110 [&::-moz-range-thumb]:active:scale-95"
                                    style={{ background: `linear-gradient(to right, #facc15 0%, #ca8a04 ${percentage}%, rgba(255,255,255,0.1) ${percentage}%, rgba(255,255,255,0.1) 100%)` }}
                                />
                            </div>
                            <div className="flex justify-between text-white font-bold mt-4 text-lg">
                                <span className="bg-black/20 px-4 py-1.5 rounded-xl shadow-inner border border-white/5">{min}</span>
                                <span className="bg-black/20 px-4 py-1.5 rounded-xl shadow-inner border border-white/5">{max}</span>
                            </div>
                        </div>
                    </motion.div>

                    <motion.button initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} whileTap={{ scale: 0.95 }} onClick={handleSliderSubmit} className="w-full max-w-md h-20 bg-gradient-to-b from-yellow-400 to-yellow-600 text-yellow-950 text-3xl font-black rounded-[1.5rem] shadow-[0_10px_30px_rgba(234,179,8,0.4)] border-t-[3px] border-yellow-200 mt-4 relative z-10 overflow-hidden group">
                        <div className="absolute inset-0 bg-white/30 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-500 ease-in-out" />
                        <span className="relative drop-shadow-sm">Lock In!</span>
                    </motion.button>
                </div>
            );
        }

        // Puzzle (Ordering)
        if (qType === "puzzle") {
            return (
                <div className="min-h-screen zingoo-purple-gradient flex flex-col items-center p-4 gap-4 overflow-y-auto">
                    <div className="text-5xl mt-4">🧩</div>
                    <h2 className="text-white text-xl font-black text-center">Drag to reorder</h2>
                    <div className="w-full max-w-md flex flex-col gap-2">
                        {puzzleOrder.map((item, idx) => (
                            <motion.div
                                key={item}
                                layout
                                draggable
                                onDragStart={() => setDraggedItem(idx)}
                                onDragOver={(e: any) => e.preventDefault()}
                                onDrop={() => {
                                    if (draggedItem !== null && draggedItem !== idx) {
                                        movePuzzleItem(draggedItem, idx);
                                    }
                                    setDraggedItem(null);
                                }}
                                className={`flex items-center gap-3 bg-white/15 backdrop-blur-sm border-2 ${draggedItem === idx ? "border-zingoo-green scale-105" : "border-white/20"} rounded-xl p-4 cursor-grab active:cursor-grabbing transition-all`}
                            >
                                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-white font-black text-sm">{idx + 1}</div>
                                <span className="text-white text-lg font-bold flex-1">{item}</span>
                                <div className="text-white/40">≡</div>
                            </motion.div>
                        ))}
                    </div>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={handlePuzzleSubmit} className="w-full max-w-md h-14 bg-zingoo-green text-white text-xl font-black rounded-2xl shadow-xl hover:scale-105 transition-transform mt-2">
                        Submit Order
                    </motion.button>
                </div>
            );
        }

        // Poll
        if (qType === "poll") {
            return (
                <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col p-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                        {BUTTON_COLORS.slice(0, currentQ.options?.length || 4).map((btn, i) => (
                            <motion.button
                                key={i}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handlePollVote(i)}
                                className={`${btn.bg} ${btn.shadow} ${btn.active} rounded-xl flex items-center justify-center active:translate-y-1 transition-transform min-h-[44px]`}
                            >
                                <span className="text-white text-6xl md:text-8xl drop-shadow-md">{btn.icon}</span>
                            </motion.button>
                        ))}
                    </div>
                </div>
            );
        }

        // Word Cloud / Brainstorm
        if (qType === "word_cloud" || qType === "brainstorm") {
            return (
                <div className="min-h-screen zingoo-purple-gradient flex flex-col items-center justify-center p-6 gap-6">
                    <div className="text-6xl">{qType === "word_cloud" ? "☁️" : "💡"}</div>
                    <h2 className="text-white text-2xl font-black text-center">
                        {qType === "word_cloud" ? "Submit a word" : "Share your idea"}
                    </h2>
                    <input
                        type="text"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder={qType === "word_cloud" ? "Your word..." : "Your idea..."}
                        autoFocus
                        className="w-full max-w-md h-16 text-2xl text-center font-bold rounded-2xl border-4 border-white/30 bg-white/10 text-white placeholder-white/40 focus:border-white focus:outline-none"
                    />
                    <motion.button whileTap={{ scale: 0.95 }} onClick={handleWordCloudSubmit} disabled={!textInput.trim()} className="w-full max-w-md h-16 bg-zingoo-green text-white text-2xl font-black rounded-2xl shadow-xl hover:scale-105 transition-transform disabled:opacity-40">
                        Submit
                    </motion.button>
                </div>
            );
        }

        // Eliminate Wrong Answers
        if (qType === "eliminate") {
            return (
                <div className="min-h-screen zingoo-purple-gradient flex flex-col items-center p-4 gap-4">
                    <div className="text-5xl mt-4">❌</div>
                    <h2 className="text-white text-xl font-black text-center">Tap wrong answers to eliminate</h2>
                    <div className="w-full max-w-md grid grid-cols-2 gap-3">
                        {(currentQ.options || []).map((opt: any, i: number) => (
                            <motion.button
                                key={i}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                    const newSet = new Set(eliminatedIndices);
                                    if (newSet.has(i)) newSet.delete(i);
                                    else newSet.add(i);
                                    setEliminatedIndices(newSet);
                                }}
                                className={`rounded-xl p-4 md:p-6 flex items-center justify-center text-white text-lg font-bold shadow-lg transition-all min-h-[44px] relative ${BUTTON_COLORS[i % BUTTON_COLORS.length].bg} ${eliminatedIndices.has(i) ? "opacity-30 scale-95" : "opacity-100"}`}
                            >
                                {eliminatedIndices.has(i) && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-6xl text-white/80 font-black">✗</span>
                                    </div>
                                )}
                                <span className="text-4xl">{BUTTON_COLORS[i % BUTTON_COLORS.length].icon}</span>
                            </motion.button>
                        ))}
                    </div>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleEliminateSubmit}
                        disabled={eliminatedIndices.size === 0}
                        className="w-full max-w-md h-14 bg-zingoo-green text-white text-xl font-black rounded-2xl shadow-xl hover:scale-105 transition-transform disabled:opacity-40 mt-2"
                    >
                        Submit
                    </motion.button>
                </div>
            );
        }

        // Fast Typing Challenge
        if (qType === "fast_typing") {
            const target = currentQ.extra_config?.target_text || "";
            const isMatch = textInput === target;
            const charProgress = textInput.length > 0
                ? textInput.split("").map((ch, i) => ch === target[i] ? "correct" : "wrong")
                : [];

            return (
                <div className="min-h-screen zingoo-purple-gradient flex flex-col items-center justify-center p-6 gap-6">
                    <div className="text-6xl">⚡</div>
                    <h2 className="text-white text-xl font-black text-center">Type it fast & accurately!</h2>

                    <div className="w-full max-w-lg bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                        <p className="text-2xl md:text-3xl font-mono font-bold text-white tracking-wide">
                            {target.split("").map((ch: string, i: number) => (
                                <span key={i} className={i < textInput.length ? charProgress[i] === "correct" ? "text-zingoo-green" : "text-red-400 underline" : "text-white/40"}>
                                    {ch}
                                </span>
                            ))}
                        </p>
                    </div>

                    <input type="text" value={textInput} onChange={(e) => handleFastTypingInput(e.target.value)} placeholder="Start typing..." autoFocus className="w-full max-w-lg h-16 text-2xl text-center font-mono font-bold rounded-2xl border-4 border-white/30 bg-white/10 text-white placeholder-white/40 focus:border-white focus:outline-none" />

                    <div className="w-full max-w-lg bg-white/10 rounded-full h-3 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-200 ${isMatch ? "bg-zingoo-green" : "bg-zingoo-blue"}`} style={{ width: `${Math.min(100, (textInput.length / Math.max(target.length, 1)) * 100)}%` }} />
                    </div>
                </div>
            );
        }

        // Fallback (unknown type uses quiz layout)
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col p-2">
                <div className="flex-1 grid grid-cols-2 gap-2">
                    {BUTTON_COLORS.map((btn, i) => (
                        <motion.button key={i} whileTap={{ scale: 0.95 }} onClick={() => handleChoiceAnswer(i)} className={`${btn.bg} ${btn.shadow} ${btn.active} rounded-xl flex items-center justify-center active:translate-y-1 transition-transform`}>
                            <span className="text-white text-6xl md:text-8xl drop-shadow-md">{btn.icon}</span>
                        </motion.button>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="relative min-h-screen">
            {/* Darken/disable the background UI without removing it */}
            <div className={`w-full transition-all duration-500 min-h-screen ${hasAnswered ? "pointer-events-none brightness-[0.4] saturate-50" : ""}`}>
                {/* Optional: show question text on player screen when enabled */}
                {showQuestionOnPlayer && currentQ?.question_text && (
                    <div className="bg-gradient-to-b from-[#46178f] to-transparent px-4 py-3 text-center">
                        <p className="text-white text-lg md:text-xl font-black drop-shadow-md max-w-lg mx-auto leading-snug" dir="auto">
                            {currentQ.question_text}
                        </p>
                    </div>
                )}
                {renderQuestionUI()}
            </div>

            {/* Float a satisfying Locked-in overlay over the frozen screen */}
            {hasAnswered && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pointer-events-none pb-20 pt-16">
                    <motion.div
                        initial={{ opacity: 0, y: -50, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="bg-black/60 backdrop-blur-xl px-8 py-5 rounded-full border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex items-center gap-4"
                    >
                        <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 4, ease: "linear" }} className="text-4xl filter drop-shadow-md">⏳</motion.span>
                        <div className="flex flex-col items-start pr-4">
                            <span className="text-2xl md:text-3xl font-black text-white whitespace-nowrap tracking-wider">LOCKED IN</span>
                            <span className="text-sm font-bold text-white/50 uppercase tracking-widest">Waiting for others</span>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
