import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Play, PlusCircle, Users, Trophy, Lightbulb } from "lucide-react";

export default function QuizLandingPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen zingoo-purple-gradient text-white flex flex-col items-center justify-center p-6 text-center">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-3xl w-full"
            >
                <div className="mb-8 inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-md border border-white/20">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                    <span className="font-semibold text-sm uppercase tracking-wider">The Ultimate Quiz Experience</span>
                </div>

                <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
                    Make Learning <br />
                    <span className="text-yellow-400">Awesome!</span>
                </h1>

                <p className="text-xl md:text-2xl text-purple-100 mb-12 max-w-2xl mx-auto leading-relaxed">
                    The interactive real-time quiz platform that brings engagement and fun to everyone, everywhere!
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
                    <Button
                        size="lg"
                        onClick={() => navigate("/quiz/join")}
                        className="w-full sm:w-auto h-16 px-10 text-xl font-bold rounded-2xl bg-white text-zingoo-purple hover:bg-purple-50 transition-all shadow-xl hover:scale-105"
                    >
                        Enter Game PIN
                    </Button>
                    <Button
                        size="lg"
                        variant="outline"
                        onClick={() => navigate("/")}
                        className="w-full sm:w-auto h-16 px-10 text-xl font-bold rounded-2xl border-2 border-white bg-transparent text-white hover:bg-white/10 transition-all hover:scale-105"
                    >
                        Create Your Own
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm">
                        <div className="w-12 h-12 rounded-xl bg-zingoo-red/20 flex items-center justify-center mb-4">
                            <Users className="w-6 h-6 text-pink-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Connect</h3>
                        <p className="text-purple-200">Play together with friends, students, or colleagues in real-time.</p>
                    </div>

                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm">
                        <div className="w-12 h-12 rounded-xl bg-zingoo-blue/20 flex items-center justify-center mb-4">
                            <Lightbulb className="w-6 h-6 text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Learn</h3>
                        <p className="text-purple-200">Interactive questions that make knowledge stick in a fun way.</p>
                    </div>

                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm">
                        <div className="w-12 h-12 rounded-xl bg-zingoo-green/20 flex items-center justify-center mb-4">
                            <Trophy className="w-6 h-6 text-green-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Compete</h3>
                        <p className="text-purple-200">Climb the leaderboard and become the ultimate quiz champion.</p>
                    </div>
                </div>
            </motion.div>

            <div className="mt-20 opacity-50 text-sm">
                &copy; 2026 Zingoo! Clone. All rights reserved.
            </div>
        </div>
    );
}

function Sparkles(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" />
            <path d="M19 17v4" />
            <path d="M3 5h4" />
            <path d="M17 19h4" />
        </svg>
    );
}
