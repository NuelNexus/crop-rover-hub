import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import HomePage from "./pages/HomePage.tsx";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import AnalyticsPage from "./pages/AnalyticsPage.tsx";
import CropsPage from "./pages/CropsPage.tsx";
import CropRoverPage from "./pages/CropRoverPage.tsx";
import StoragePage from "./pages/StoragePage.tsx";
import MarketplacePage from "./pages/MarketplacePage.tsx";
import TraceabilityPage from "./pages/TraceabilityPage.tsx";
import PlaceholderPage from "./pages/PlaceholderPage.tsx";

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
          <Route path="/harvesting" element={<PlaceholderPage title="Harvesting" />} />
          <Route path="/finances" element={<PlaceholderPage title="Finances" />} />
          <Route path="/weather" element={<PlaceholderPage title="Weather" />} />
          <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
