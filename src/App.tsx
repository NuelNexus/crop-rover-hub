import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AnalyticsPage from "./pages/AnalyticsPage";
import CropsPage from "./pages/CropsPage";
import CropRoverPage from "./pages/CropRoverPage";
import StoragePage from "./pages/StoragePage";
import MarketplacePage from "./pages/MarketplacePage";
import TraceabilityPage from "./pages/TraceabilityPage";
import HarvestingPage from "./pages/HarvestingPage";
import FinancesPage from "./pages/FinancesPage";
import WeatherPage from "./pages/WeatherPage";
import SettingsPage from "./pages/SettingsPage";
import AIAnalysisPage from "./pages/AIAnalysisPage";
import ESP32Page from "./pages/ESP32Page";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<AuthRoute><AuthPage /></AuthRoute>} />
    <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
    <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
    <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
    <Route path="/crops" element={<ProtectedRoute><CropsPage /></ProtectedRoute>} />
    <Route path="/croprover" element={<ProtectedRoute><CropRoverPage /></ProtectedRoute>} />
    <Route path="/storage" element={<ProtectedRoute><StoragePage /></ProtectedRoute>} />
    <Route path="/marketplace" element={<ProtectedRoute><MarketplacePage /></ProtectedRoute>} />
    <Route path="/traceability" element={<ProtectedRoute><TraceabilityPage /></ProtectedRoute>} />
    <Route path="/harvesting" element={<ProtectedRoute><HarvestingPage /></ProtectedRoute>} />
    <Route path="/finances" element={<ProtectedRoute><FinancesPage /></ProtectedRoute>} />
    <Route path="/weather" element={<ProtectedRoute><WeatherPage /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
    <Route path="/ai-analysis" element={<ProtectedRoute><AIAnalysisPage /></ProtectedRoute>} />
    <Route path="/esp32" element={<ProtectedRoute><ESP32Page /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
