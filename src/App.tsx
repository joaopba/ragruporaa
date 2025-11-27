import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import OpmeScanner from "./pages/OpmeScanner";
import OpmeRegistration from "./pages/OpmeRegistration";
import LinkedOpmeView from "./pages/LinkedOpmeView";
import Login from "./pages/Login";
import { SessionContextProvider } from "./components/SessionContextProvider";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute"; // Importa o novo componente

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SessionContextProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            {/* Rotas protegidas são aninhadas dentro de ProtectedRoute */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Index />} />
                <Route path="/opme-scanner" element={<OpmeScanner />} />
                <Route path="/opme-registration" element={<OpmeRegistration />} />
                <Route path="/linked-opme-view" element={<LinkedOpmeView />} />
              </Route>
            </Route>
            {/* Todas as rotas personalizadas devem vir antes da rota catch-all "*" */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;