import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<Index />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/crops" element={<CropsPage />} />
          <Route path="/croprover" element={<CropRoverPage />} />
          <Route path="/storage" element={<StoragePage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/traceability" element={<TraceabilityPage />} />
          <Route path="/harvesting" element={<HarvestingPage />} />
          <Route path="/finances" element={<FinancesPage />} />
          <Route path="/weather" element={<WeatherPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
