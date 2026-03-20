import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { format, startOfWeek } from "date-fns";
import { Dices, Trophy, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function BingoDrawPage() {
  const [drawnNumber, setDrawnNumber] = useState<number | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 2 }), "yyyy-MM-dd");

  const { data: bingoEntries } = useQuery({
    queryKey: ["bingo-entries", weekStart],
    queryFn: async () => {
      const { data } = await supabase
        .from("bingo_numbers")
        .select("bingo_number, user:users!bingo_numbers_user_id_fkey(name)")
        .eq("week_start", weekStart);
      return data || [];
    },
  });

  const drawNumber = () => {
    if (!bingoEntries || bingoEntries.length === 0) return;
    setIsDrawing(true);
    setWinner(null);
    setDrawnNumber(null);

    const numbers = bingoEntries.map(e => e.bingo_number);
    let iterations = 0;
    const maxIterations = 20;
    const interval = setInterval(() => {
      setDrawnNumber(numbers[Math.floor(Math.random() * numbers.length)]);
      iterations++;
      if (iterations >= maxIterations) {
        clearInterval(interval);
        const finalNum = numbers[Math.floor(Math.random() * numbers.length)];
        setDrawnNumber(finalNum);
        const entry = bingoEntries.find(e => e.bingo_number === finalNum);
        setWinner((entry?.user as any)?.name || "Unknown");
        setIsDrawing(false);
      }
    }, 100);
  };

  return (
    <DashboardLayout title="Bingo Draw">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="glass-card p-8 text-center">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow">
            <Dices className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-extrabold mb-1">
            <span className="gradient-text">Weekly Bingo Draw</span>
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Week of {format(new Date(weekStart), "MMM d, yyyy")} • {bingoEntries?.length || 0} participants
          </p>

          <AnimatePresence mode="wait">
            {drawnNumber !== null && (
              <motion.div
                key={drawnNumber}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mb-6"
              >
                <div className={`inline-flex items-center justify-center w-32 h-32 rounded-3xl border-4 ${isDrawing ? 'border-primary/30 bg-primary/5' : 'border-primary gradient-primary shadow-glow'
                  } transition-all duration-300`}>
                  <span className={`text-5xl font-extrabold ${isDrawing ? 'gradient-text' : 'text-primary-foreground'}`}>
                    {drawnNumber}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {winner && !isDrawing && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mb-6 w-full flex justify-center"
            >
              <div className="p-4 rounded-2xl bg-warning/10 border border-warning/20 flex items-center gap-3">
                <Trophy className="h-6 w-6 text-warning" />
                <span className="text-lg font-bold text-foreground">{winner}</span>
                <Sparkles className="h-5 w-5 text-warning" />
              </div>
            </motion.div>
          )}

          <Button
            onClick={drawNumber}
            disabled={isDrawing || !bingoEntries?.length}
            className="rounded-xl h-12 px-8 gradient-primary text-primary-foreground font-bold text-lg shadow-glow hover:shadow-glow-lg hover:scale-[1.02] transition-all"
          >
            {isDrawing ? "Drawing..." : "Draw Number"}
          </Button>
        </div>

        {/* All participants table */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">This Week's Bingo Numbers</h3>
          {bingoEntries && bingoEntries.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {bingoEntries
                .sort((a, b) => a.bingo_number - b.bingo_number)
                .map((entry) => (
                  <div
                    key={entry.bingo_number}
                    className={`p-3 rounded-xl border text-center transition-all ${drawnNumber === entry.bingo_number && !isDrawing
                        ? 'border-warning bg-warning/10 shadow-md'
                        : 'border-border/50 bg-muted/20 hover:border-primary/30'
                      }`}
                  >
                    <span className="text-xl font-extrabold gradient-text">{entry.bingo_number}</span>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{(entry.user as any)?.name}</p>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No bingo numbers assigned this week yet.</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
