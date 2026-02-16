import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import ResearcherHomePage from "./pages/ResearcherHomePage";
import PaperViewPage from "./pages/PaperViewPage";
import ReplicationAssistantPage from "./pages/ReplicationAssistantPage";
import DigitalLabPage from "./pages/DigitalLabPage";
import PublicProfilePage from "./pages/PublicProfilePage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/researcher-home" element={<ProtectedRoute><ResearcherHomePage /></ProtectedRoute>} />
          <Route path="/paper/:paperId" element={<ProtectedRoute><PaperViewPage /></ProtectedRoute>} />
          <Route path="/replication/:paperId" element={<ProtectedRoute><ReplicationAssistantPage /></ProtectedRoute>} />
          <Route path="/digital-lab" element={<ProtectedRoute><DigitalLabPage /></ProtectedRoute>} />
          <Route path="/profile/:userId" element={<PublicProfilePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
