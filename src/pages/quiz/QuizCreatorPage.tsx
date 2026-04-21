import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Plus, Trash2, Save, Check, X, Upload, Image as ImageIcon, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";

// All supported question types
const QUESTION_TYPES = [
    { value: "quiz", label: "Quiz", icon: "🎯", desc: "Multiple choice (2-4 options)" },
    { value: "true_false", label: "True / False", icon: "✅", desc: "Two options: True or False" },
    { value: "type_answer", label: "Type Answer", icon: "⌨️", desc: "Players type the correct answer" },
    { value: "slider", label: "Slider", icon: "📏", desc: "Players pick a number on a scale" },
    { value: "puzzle", label: "Puzzle", icon: "🧩", desc: "Drag items into correct order" },
    { value: "poll", label: "Poll", icon: "📊", desc: "Opinion poll, no right answer" },
    { value: "word_cloud", label: "Word Cloud", icon: "☁️", desc: "Players submit words" },
    { value: "brainstorm", label: "Brainstorm", icon: "💡", desc: "Players submit idea cards" },
    { value: "blur_image", label: "Blur Image", icon: "🔍", desc: "Image un-blurs over time" },
    { value: "eliminate", label: "Eliminate", icon: "❌", desc: "Remove wrong answers" },
    { value: "fast_typing", label: "Fast Typing", icon: "⚡", desc: "Type the text as fast as possible" },
] as const;

type QuestionType = typeof QUESTION_TYPES[number]["value"];

interface QuestionDraft {
    id: string;
    question_text: string;
    question_type: QuestionType;
    options: { text: string; isCorrect: boolean }[];
    time_limit: number;
    show_on_player_screen: boolean;
    imageFile?: File | null;
    imagePreview?: string | null;
    // Type-specific fields stored in extra_config
    extra_config: {
        correct_answer?: string;          // type_answer
        slider_min?: number;              // slider
        slider_max?: number;              // slider
        slider_correct?: number;          // slider
        puzzle_items?: string[];          // puzzle (correct order)
        target_text?: string;             // fast_typing
    };
}

const DEFAULT_QUESTION = (): QuestionDraft => ({
    id: crypto.randomUUID(),
    question_text: "",
    question_type: "quiz",
    options: [
        { text: "", isCorrect: true },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
    ],
    time_limit: 20,
    show_on_player_screen: false,
    imageFile: null,
    imagePreview: null,
    extra_config: {},
});

const OPTION_COLORS = [
    { bg: "bg-zingoo-red", label: "Red" },
    { bg: "bg-zingoo-blue", label: "Blue" },
    { bg: "bg-zingoo-yellow", label: "Yellow" },
    { bg: "bg-zingoo-green", label: "Green" },
];

const OPTION_ICONS = ["▲", "◆", "●", "■"];

export default function QuizCreatorPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { session } = useAuth();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [questions, setQuestions] = useState<QuestionDraft[]>([DEFAULT_QUESTION()]);
    const [isLoading, setIsLoading] = useState(!!id);

    useEffect(() => {
        if (!id) return;
        async function fetchQuiz() {
            try {
                // @ts-ignore
                const { data: quiz, error: quizError } = await supabase
                    .from("quizzes")
                    .select("*")
                    .eq("id", id)
                    .single();

                if (quizError) throw quizError;

                setTitle(quiz.title || "");
                setDescription(quiz.description || "");



                // @ts-ignore
                const { data: qs, error: qsError } = await supabase
                    .from("quiz_questions")
                    .select("*")
                    .eq("quiz_id", id)
                    .order("position", { ascending: true });

                if (qsError) throw qsError;

                if (qs && qs.length > 0) {
                    const loadedQuestions: QuestionDraft[] = qs.map((q: any) => ({
                        id: q.id,
                        question_text: q.question_text || "",
                        question_type: q.question_type || "quiz",
                        options: q.options || [],
                        time_limit: q.time_limit || 20,
                        show_on_player_screen: q.extra_config?.show_on_player_screen || false,
                        imageFile: null,
                        imagePreview: q.image_url || null,
                        extra_config: q.extra_config || {}
                    }));
                    setQuestions(loadedQuestions);
                }
            } catch (err: any) {
                toast({ title: "Failed to load quiz", description: err.message, variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        }
        fetchQuiz();
    }, [id]);

    // --- Helpers ---
    const updateQuestion = (index: number, updates: Partial<QuestionDraft>) => {
        setQuestions(prev => prev.map((q, i) => i === index ? { ...q, ...updates } : q));
    };

    const updateExtraConfig = (index: number, updates: Partial<QuestionDraft["extra_config"]>) => {
        setQuestions(prev => prev.map((q, i) =>
            i === index ? { ...q, extra_config: { ...q.extra_config, ...updates } } : q
        ));
    };

    const addQuestion = () => setQuestions([...questions, DEFAULT_QUESTION()]);

    const removeQuestion = (index: number) => {
        if (questions.length > 1) {
            if (questions[index].imagePreview) URL.revokeObjectURL(questions[index].imagePreview!);
            setQuestions(questions.filter((_, i) => i !== index));
        }
    };

    const changeQuestionType = (index: number, newType: QuestionType) => {
        const q = { ...questions[index] };
        q.question_type = newType;

        // Set sensible defaults per type
        if (newType === "true_false") {
            q.options = [
                { text: "True", isCorrect: true },
                { text: "False", isCorrect: false },
            ];
        } else if (newType === "quiz" || newType === "blur_image" || newType === "eliminate") {
            if (q.options.length < 4) {
                q.options = [
                    { text: "", isCorrect: true },
                    { text: "", isCorrect: false },
                    { text: "", isCorrect: false },
                    { text: "", isCorrect: false },
                ];
            }
        } else if (newType === "slider") {
            q.extra_config = { ...q.extra_config, slider_min: 0, slider_max: 100, slider_correct: 50 };
        } else if (newType === "puzzle") {
            q.extra_config = { ...q.extra_config, puzzle_items: ["Item 1", "Item 2", "Item 3", "Item 4"] };
        } else if (newType === "type_answer") {
            q.extra_config = { ...q.extra_config, correct_answer: "" };
        } else if (newType === "fast_typing") {
            q.extra_config = { ...q.extra_config, target_text: "" };
        }

        setQuestions(prev => prev.map((existing, i) => i === index ? q : existing));
    };

    const setCorrectOption = (qIndex: number, oIndex: number) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== qIndex) return q;
            return {
                ...q,
                options: q.options.map((opt, j) => ({ ...opt, isCorrect: j === oIndex })),
            };
        }));
    };

    const updateOptionText = (qIndex: number, oIndex: number, text: string) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== qIndex) return q;
            const newOpts = [...q.options];
            newOpts[oIndex] = { ...newOpts[oIndex], text };
            return { ...q, options: newOpts };
        }));
    };

    const handleImageSelect = (qIndex: number, file: File | null) => {
        const newQuestions = [...questions];
        if (newQuestions[qIndex].imagePreview) {
            URL.revokeObjectURL(newQuestions[qIndex].imagePreview!);
        }
        if (file) {
            newQuestions[qIndex].imageFile = file;
            newQuestions[qIndex].imagePreview = URL.createObjectURL(file);
        } else {
            newQuestions[qIndex].imageFile = null;
            newQuestions[qIndex].imagePreview = null;
        }
        setQuestions(newQuestions);
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const uploadImage = async (file: File, quizId: string, questionIndex: number): Promise<string | null> => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${quizId}/q${questionIndex}_${Date.now()}.${fileExt}`;
            const { error } = await supabase.storage.from("quiz-images").upload(fileName, file, { upsert: true });
            if (error) {
                console.warn("Storage upload failed, falling back to base64:", error.message);
                return await fileToBase64(file);
            }
            const { data: urlData } = supabase.storage.from("quiz-images").getPublicUrl(fileName);
            return urlData?.publicUrl || await fileToBase64(file);
        } catch (err) {
            console.warn("Upload error, using base64 fallback:", err);
            return await fileToBase64(file);
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            toast({ title: "Title required", description: "Please enter a quiz title.", variant: "destructive" });
            return;
        }

        const validQuestions = questions.filter(q => q.question_text.trim());
        if (validQuestions.length === 0) {
            toast({ title: "Questions required", description: "Add at least one question.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            let quizId = id;

            if (id) {
                // @ts-ignore
                const { error: quizError } = await supabase
                    .from("quizzes")
                    .update({ title: title.trim(), description: description.trim() || null })
                    .eq("id", id);
                if (quizError) throw quizError;

                // Delete old questions explicitly to avoid orphans when replacing them
                // @ts-ignore
                const { error: deleteError } = await supabase.from("quiz_questions").delete().eq("quiz_id", id);
                if (deleteError) {
                    console.error("Error deleting old questions:", deleteError);
                    throw new Error(`Failed to update questions: ${deleteError.message}`);
                }
            } else {
                // @ts-ignore
                const { data: quiz, error: quizError } = await supabase
                    .from("quizzes")
                    .insert({ title: title.trim(), description: description.trim() || null, created_by: session?.user?.id })
                    .select()
                    .single();

                if (quizError) throw quizError;
                quizId = (quiz as any).id;
            }

            const questionsToInsert = [];
            for (let i = 0; i < validQuestions.length; i++) {
                const q = validQuestions[i];
                let imageUrl: string | null = q.imagePreview && q.imagePreview.startsWith("http") ? q.imagePreview : null;

                if (q.imageFile) imageUrl = await uploadImage(q.imageFile, quizId as string, i);

                questionsToInsert.push({
                    quiz_id: quizId,
                    question_text: q.question_text.trim(),
                    question_type: q.question_type,
                    options: q.options.filter((o: any) => o.text.trim()),
                    time_limit: q.time_limit,
                    points: 1000,
                    position: i,
                    image_url: imageUrl,
                    extra_config: { ...q.extra_config, show_on_player_screen: q.show_on_player_screen },
                });
            }

            // 3. Insert new questions
            // @ts-ignore
            const { error: questionsError } = await supabase.from("quiz_questions").insert(questionsToInsert);
            if (questionsError) {
                console.error("Error inserting questions:", questionsError);
                throw new Error(`Failed to insert questions: ${questionsError.message}`);
            }

            toast({ title: "Quiz Saved!", description: `"${title}" is ready with ${validQuestions.length} questions.` });
            navigate("/quiz/host/list");
        } catch (err: any) {
            toast({ title: "Save failed", description: err.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    // --- Type-Specific Editor Renderers ---
    const renderQuizOptions = (q: QuestionDraft, qIndex: number) => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {q.options.map((opt, oIndex) => (
                <div key={oIndex} className="relative flex items-center">
                    <div className={`w-12 h-12 ${OPTION_COLORS[oIndex].bg} rounded-l-xl flex items-center justify-center shrink-0`}>
                        <span className="text-white font-bold text-lg">{OPTION_ICONS[oIndex]}</span>
                    </div>
                    <Input
                        placeholder={`Answer ${oIndex + 1}`}
                        value={opt.text}
                        onChange={(e) => updateOptionText(qIndex, oIndex, e.target.value)}
                        className="h-12 rounded-none rounded-r-xl border-none bg-slate-50 dark:bg-slate-800 text-lg font-medium pr-12"
                    />
                    <button
                        type="button"
                        onClick={() => setCorrectOption(qIndex, oIndex)}
                        className={`absolute right-3 w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${opt.isCorrect ? 'bg-zingoo-green border-zingoo-green' : 'border-slate-300'}`}
                    >
                        {opt.isCorrect && <Check className="w-4 h-4 text-white" />}
                    </button>
                </div>
            ))}
        </div>
    );

    const renderTrueFalse = (q: QuestionDraft, qIndex: number) => (
        <div className="grid grid-cols-2 gap-4">
            {q.options.map((opt, oIndex) => (
                <button
                    key={oIndex}
                    type="button"
                    onClick={() => setCorrectOption(qIndex, oIndex)}
                    className={`h-20 rounded-2xl text-white text-2xl font-black transition-all border-4 ${oIndex === 0 ? 'bg-zingoo-blue' : 'bg-zingoo-red'
                        } ${opt.isCorrect ? 'border-zingoo-green scale-105 shadow-xl' : 'border-transparent opacity-70 hover:opacity-100'}`}
                >
                    {opt.isCorrect && <Check className="w-6 h-6 inline mr-2" />}
                    {opt.text}
                </button>
            ))}
        </div>
    );

    const renderTypeAnswer = (q: QuestionDraft, qIndex: number) => (
        <div className="space-y-3">
            <Label className="text-sm font-bold text-slate-500">Correct Answer(s) — comma separated for multiple accepted answers</Label>
            <Input
                placeholder="e.g. Paris, paris"
                value={q.extra_config.correct_answer || ""}
                onChange={(e) => updateExtraConfig(qIndex, { correct_answer: e.target.value })}
                className="h-14 text-xl rounded-2xl border-2 border-zingoo-green/30 bg-green-50 dark:bg-green-900/20 text-center font-bold"
            />
        </div>
    );

    const renderSlider = (q: QuestionDraft, qIndex: number) => (
        <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-500">Min</Label>
                <Input
                    type="number"
                    value={q.extra_config.slider_min ?? 0}
                    onChange={(e) => updateExtraConfig(qIndex, { slider_min: Number(e.target.value) })}
                    className="h-12 rounded-xl text-center font-bold text-lg"
                />
            </div>
            <div className="space-y-2">
                <Label className="text-sm font-bold text-zingoo-green">Correct Value</Label>
                <Input
                    type="number"
                    value={q.extra_config.slider_correct ?? 50}
                    onChange={(e) => updateExtraConfig(qIndex, { slider_correct: Number(e.target.value) })}
                    className="h-12 rounded-xl text-center font-bold text-lg border-zingoo-green border-2"
                />
            </div>
            <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-500">Max</Label>
                <Input
                    type="number"
                    value={q.extra_config.slider_max ?? 100}
                    onChange={(e) => updateExtraConfig(qIndex, { slider_max: Number(e.target.value) })}
                    className="h-12 rounded-xl text-center font-bold text-lg"
                />
            </div>
        </div>
    );

    const renderPuzzle = (q: QuestionDraft, qIndex: number) => {
        const items = q.extra_config.puzzle_items || ["Item 1", "Item 2", "Item 3", "Item 4"];
        return (
            <div className="space-y-3">
                <Label className="text-sm font-bold text-slate-500">Items in CORRECT order (players will see them shuffled)</Label>
                {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zingoo-purple/10 rounded-xl flex items-center justify-center text-sm font-black text-zingoo-purple">
                            {idx + 1}
                        </div>
                        <Input
                            value={item}
                            onChange={(e) => {
                                const newItems = [...items];
                                newItems[idx] = e.target.value;
                                updateExtraConfig(qIndex, { puzzle_items: newItems });
                            }}
                            placeholder={`Item ${idx + 1}`}
                            className="h-10 rounded-xl text-lg font-medium"
                        />
                        {items.length > 2 && (
                            <button
                                type="button"
                                onClick={() => {
                                    const newItems = items.filter((_, i) => i !== idx);
                                    updateExtraConfig(qIndex, { puzzle_items: newItems });
                                }}
                                className="text-red-400 hover:text-red-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => updateExtraConfig(qIndex, { puzzle_items: [...items, `Item ${items.length + 1}`] })}
                    className="text-sm text-zingoo-purple"
                >
                    <Plus className="w-4 h-4 mr-1" /> Add Item
                </Button>
            </div>
        );
    };

    const renderPollOptions = (q: QuestionDraft, qIndex: number) => (
        <div className="space-y-3">
            <Label className="text-sm font-bold text-slate-500">Poll Options (no correct answer)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {q.options.map((opt, oIndex) => (
                    <div key={oIndex} className="flex items-center">
                        <div className={`w-12 h-12 ${OPTION_COLORS[oIndex % OPTION_COLORS.length].bg} rounded-l-xl flex items-center justify-center shrink-0`}>
                            <span className="text-white font-bold text-lg">{OPTION_ICONS[oIndex % OPTION_ICONS.length]}</span>
                        </div>
                        <Input
                            placeholder={`Option ${oIndex + 1}`}
                            value={opt.text}
                            onChange={(e) => updateOptionText(qIndex, oIndex, e.target.value)}
                            className="h-12 rounded-none rounded-r-xl border-none bg-slate-50 dark:bg-slate-800 text-lg font-medium"
                        />
                    </div>
                ))}
            </div>
        </div>
    );

    const renderFreeText = (q: QuestionDraft, qIndex: number, label: string, placeholder: string) => (
        <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 text-center">
            <p className="text-slate-400 text-sm font-bold mb-2">{label}</p>
            <p className="text-lg text-slate-500">{placeholder}</p>
        </div>
    );

    const renderFastTyping = (q: QuestionDraft, qIndex: number) => (
        <div className="space-y-3">
            <Label className="text-sm font-bold text-slate-500">Target Text — players must type this exactly</Label>
            <Input
                placeholder="e.g. The quick brown fox jumps over the lazy dog"
                value={q.extra_config.target_text || ""}
                onChange={(e) => updateExtraConfig(qIndex, { target_text: e.target.value })}
                className="h-14 text-lg rounded-2xl border-2 border-zingoo-purple/30 bg-purple-50 dark:bg-purple-900/20 text-center font-medium"
            />
        </div>
    );

    const renderTypeEditor = (q: QuestionDraft, qIndex: number) => {
        switch (q.question_type) {
            case "quiz":
            case "eliminate":
                return renderQuizOptions(q, qIndex);
            case "true_false":
                return renderTrueFalse(q, qIndex);
            case "type_answer":
                return renderTypeAnswer(q, qIndex);
            case "slider":
                return renderSlider(q, qIndex);
            case "puzzle":
                return renderPuzzle(q, qIndex);
            case "poll":
                return renderPollOptions(q, qIndex);
            case "blur_image":
                return renderQuizOptions(q, qIndex);
            case "word_cloud":
                return renderFreeText(q, qIndex, "Word Cloud", "Players will type words that appear as a word cloud on the host screen");
            case "brainstorm":
                return renderFreeText(q, qIndex, "Brainstorm", "Players will submit idea cards that appear on the host screen");
            case "fast_typing":
                return renderFastTyping(q, qIndex);
            default:
                return renderQuizOptions(q, qIndex);
        }
    };

    // --- Image Upload Area ---
    const renderImageUpload = (q: QuestionDraft, qIndex: number) => (
        <div className="relative">
            {q.imagePreview ? (
                <div className="relative group rounded-2xl overflow-hidden border-2 border-dashed border-zingoo-purple/30 bg-slate-50 dark:bg-slate-800">
                    <img src={q.imagePreview} alt="Question" className="w-full max-h-[250px] object-contain mx-auto" />
                    <button
                        type="button"
                        onClick={() => handleImageSelect(qIndex, null)}
                        className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <label className="absolute bottom-3 right-3 bg-white/90 hover:bg-white text-slate-700 rounded-xl px-4 py-2 shadow-lg cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity text-sm font-semibold flex items-center gap-2">
                        <Upload className="w-4 h-4" /> Change
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            if (file) handleImageSelect(qIndex, file);
                        }} />
                    </label>
                </div>
            ) : (
                <label className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-zingoo-purple hover:bg-zingoo-purple/5 transition-all cursor-pointer group">
                    <div className="w-12 h-12 rounded-2xl bg-zingoo-purple/10 group-hover:bg-zingoo-purple/20 flex items-center justify-center transition-colors">
                        <ImageIcon className="w-6 h-6 text-zingoo-purple" />
                    </div>
                    <p className="text-sm font-bold text-slate-500 group-hover:text-zingoo-purple transition-colors">Add Image (Optional)</p>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                                toast({ title: "File too large", description: "Max 5MB allowed.", variant: "destructive" });
                                return;
                            }
                            handleImageSelect(qIndex, file);
                        }
                    }} />
                </label>
            )}
        </div>
    );

    if (isLoading) {
        return (
            <DashboardLayout title="Edit Quiz">
                <div className="max-w-4xl mx-auto py-20 text-center text-slate-500 font-bold text-xl">
                    Loading quiz data...
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title={id ? "Edit Quiz" : "Create Quiz"}>
            <div className="max-w-4xl mx-auto pb-20">
                <div className="flex items-center justify-between mb-8">
                    <Button variant="ghost" onClick={() => navigate("/quiz/host/list")} className="rounded-xl">
                        <ChevronLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-zingoo-green hover:opacity-90 text-white rounded-xl px-6">
                        <Save className="w-4 h-4 mr-2" /> {isSaving ? "Saving..." : "Save Quiz"}
                    </Button>
                </div>

                {/* Quiz Details Card */}
                <Card className="rounded-3xl border-none shadow-xl mb-8 overflow-hidden">
                    <CardHeader className="bg-zingoo-purple text-white p-8">
                        <CardTitle className="text-2xl font-bold">Quiz Details</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="quiz-title" className="text-lg font-semibold">Title</Label>
                            <Input
                                id="quiz-title"
                                placeholder="Enter an awesome title..."
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="h-14 text-xl rounded-xl border-2"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="quiz-desc" className="text-lg font-semibold">Description (Optional)</Label>
                            <Input
                                id="quiz-desc"
                                placeholder="What is this quiz about?"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="h-14 rounded-xl border-2"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Questions */}
                <div className="space-y-8">
                    {questions.map((q, qIndex) => {
                        const typeInfo = QUESTION_TYPES.find(t => t.value === q.question_type) || QUESTION_TYPES[0];
                        return (
                            <Card key={q.id} className="rounded-3xl border-none shadow-lg overflow-hidden animate-fade-in" style={{ animationDelay: `${qIndex * 100}ms` }}>
                                {/* Question Header */}
                                <div className="bg-slate-100 dark:bg-slate-800 p-4 border-b flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-slate-500">Q{qIndex + 1}</span>
                                        <span className="text-2xl">{typeInfo.icon}</span>
                                        <span className="font-bold text-sm text-slate-600 dark:text-slate-300">{typeInfo.label}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {/* Show on player screen toggle */}
                                        <button
                                            type="button"
                                            onClick={() => updateQuestion(qIndex, { show_on_player_screen: !q.show_on_player_screen })}
                                            title={q.show_on_player_screen ? "Question visible on player screen" : "Question hidden on player screen"}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${q.show_on_player_screen
                                                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-400 border-slate-200 dark:border-slate-600'
                                                }`}
                                        >
                                            <span>{q.show_on_player_screen ? '📱' : '🚫'}</span>
                                            <span className="hidden sm:inline">{q.show_on_player_screen ? 'On Player' : 'Host Only'}</span>
                                        </button>
                                        <select
                                            value={q.time_limit}
                                            onChange={(e) => updateQuestion(qIndex, { time_limit: parseInt(e.target.value) })}
                                            className="h-8 rounded-lg border bg-white dark:bg-slate-700 px-2 font-semibold text-sm"
                                        >
                                            <option value={10}>10 sec</option>
                                            <option value={20}>20 sec</option>
                                            <option value={30}>30 sec</option>
                                            <option value={60}>60 sec</option>
                                            <option value={90}>90 sec</option>
                                            <option value={120}>120 sec</option>
                                        </select>
                                        <Button variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)} className="text-destructive hover:bg-destructive/10">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <CardContent className="p-6 space-y-6">
                                    {/* Question Type Selector */}
                                    <div className="flex flex-wrap gap-2">
                                        {QUESTION_TYPES.map(t => (
                                            <button
                                                key={t.value}
                                                type="button"
                                                onClick={() => changeQuestionType(qIndex, t.value)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${q.question_type === t.value
                                                    ? 'bg-zingoo-purple text-white shadow-md scale-105'
                                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600'
                                                    }`}
                                                title={t.desc}
                                            >
                                                <span>{t.icon}</span>
                                                <span className="hidden sm:inline">{t.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Question Text */}
                                    <Input
                                        placeholder="Type your question here..."
                                        value={q.question_text}
                                        onChange={(e) => updateQuestion(qIndex, { question_text: e.target.value })}
                                        className="h-16 text-xl font-bold text-center rounded-2xl border-none bg-slate-50 dark:bg-slate-800"
                                    />

                                    {/* Image Upload */}
                                    {renderImageUpload(q, qIndex)}

                                    {/* Type-Specific Editor */}
                                    {renderTypeEditor(q, qIndex)}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <Button
                    onClick={addQuestion}
                    className="w-full mt-8 h-16 rounded-2xl bg-white dark:bg-slate-800 border-2 border-dashed border-slate-300 text-slate-500 hover:border-zingoo-purple hover:text-zingoo-purple transition-all text-xl font-bold"
                >
                    <Plus className="w-6 h-6 mr-2" /> Add Question
                </Button>
            </div>
        </DashboardLayout>
    );
}
