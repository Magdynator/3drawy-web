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
import ProtectedRoute from "./components/ProtectedRoute";

import AdminManagement from "./pages/AdminManagement";

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
        <Route path="/user/:userId" element={<UserProfilePage />} />
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
