import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import { AnimatePresence } from "framer-motion";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import UserManagement from "./pages/UserManagement";
import AttendancePage from "./pages/AttendancePage";
import ScannerPage from "./pages/ScannerPage";
import AtmPage from "./pages/AtmPage";
import UserProfilePage from "./pages/UserProfilePage";
import BingoDrawPage from "./pages/BingoDrawPage";
import NotFound from "./pages/NotFound";
import AdminManagement from "./pages/AdminManagement";
import ProtectedRoute from "./components/ProtectedRoute";
import ActivityLogsPage from "./pages/ActivityLogsPage";
import AdminUserDetailPage from "./pages/AdminUserDetailPage";
import QuizLandingPage from "./pages/quiz/QuizLandingPage";
import QuizJoinPage from "./pages/quiz/QuizJoinPage";
import QuizCreatorPage from "./pages/quiz/QuizCreatorPage";
import QuizHostLobbyPage from "./pages/quiz/QuizHostLobbyPage";
import QuizHostGamePage from "./pages/quiz/QuizHostGamePage";
import QuizLeaderboardPage from "./pages/quiz/QuizLeaderboardPage";
import QuizListPage from "./pages/quiz/QuizListPage";
import QuizPlayerGamePage from "./pages/quiz/QuizPlayerGamePage";

const queryClient = new QueryClient();

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
        <Route path="/admins" element={<ProtectedRoute><AdminManagement /></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute><AttendancePage /></ProtectedRoute>} />
        <Route path="/scanner" element={<ProtectedRoute><ScannerPage /></ProtectedRoute>} />
        <Route path="/atm" element={<ProtectedRoute><AtmPage /></ProtectedRoute>} />
        <Route path="/bingo" element={<ProtectedRoute><BingoDrawPage /></ProtectedRoute>} />
        <Route path="/admin/logs" element={<ProtectedRoute><ActivityLogsPage /></ProtectedRoute>} />
        <Route path="/admin/user/:userId" element={<ProtectedRoute><AdminUserDetailPage /></ProtectedRoute>} />
        <Route path="/user/:userId" element={<UserProfilePage />} />

        {/* Quiz Routes */}
        <Route path="/quiz" element={<QuizLandingPage />} />
        <Route path="/quiz/join" element={<QuizJoinPage />} />
        <Route path="/quiz/create" element={<ProtectedRoute><QuizCreatorPage /></ProtectedRoute>} />
        <Route path="/quiz/create/:id" element={<ProtectedRoute><QuizCreatorPage /></ProtectedRoute>} />
        <Route path="/quiz/host/list" element={<ProtectedRoute><QuizListPage /></ProtectedRoute>} />
        <Route path="/quiz/host/:sessionId" element={<ProtectedRoute><QuizHostLobbyPage /></ProtectedRoute>} />
        <Route path="/quiz/game/:sessionId" element={<ProtectedRoute><QuizHostGamePage /></ProtectedRoute>} />
        <Route path="/quiz/play/:sessionId" element={<QuizPlayerGamePage />} />
        <Route path="/quiz/leaderboard/:sessionId" element={<QuizLeaderboardPage />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AnimatedRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
