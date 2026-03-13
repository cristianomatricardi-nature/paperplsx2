import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import HubPage from "./pages/HubPage";
import ResearcherHomePage from "./pages/ResearcherHomePage";
import PaperViewPage from "./pages/PaperViewPage";
import ReplicationAssistantPage from "./pages/ReplicationAssistantPage";
import AnalyticalPipelinePage from "./pages/AnalyticalPipelinePage";
import DigitalLabPage from "./pages/DigitalLabPage";
import PublicProfilePage from "./pages/PublicProfilePage";
import PublicPaperViewPage from "./pages/PublicPaperViewPage";
import ApiKeysPage from "./pages/ApiKeysPage";
import AdminPage from "./pages/AdminPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import NotFound from "./pages/NotFound";
import { HeatmapProvider } from "./components/HeatmapProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/hub" element={<ProtectedRoute><HubPage /></ProtectedRoute>} />
          <Route path="/researcher-home" element={<ProtectedRoute><ResearcherHomePage /></ProtectedRoute>} />
          <Route path="/paper/:paperId" element={<ProtectedRoute><PaperViewPage /></ProtectedRoute>} />
          <Route path="/replication/:paperId" element={<ProtectedRoute><ReplicationAssistantPage /></ProtectedRoute>} />
          <Route path="/analysis/:paperId" element={<ProtectedRoute><AnalyticalPipelinePage /></ProtectedRoute>} />
          <Route path="/digital-lab" element={<ProtectedRoute><DigitalLabPage /></ProtectedRoute>} />
          <Route path="/api-keys" element={<ProtectedRoute><ApiKeysPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
          <Route path="/paper/:paperId/public" element={<PublicPaperViewPage />} />
          <Route path="/profile/:userId" element={<PublicProfilePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
