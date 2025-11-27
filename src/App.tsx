import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import OpmeScanner from "./pages/OpmeScanner";
import OpmeRegistration from "./pages/OpmeRegistration"; // Import the new OpmeRegistration page
import Login from "./pages/Login";
import { SessionContextProvider } from "./components/SessionContextProvider";
import Layout from "./components/Layout"; // Import the new Layout component

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
            <Route element={<Layout />}> {/* Wrap main routes with Layout */}
              <Route path="/" element={<Index />} />
              <Route path="/opme-scanner" element={<OpmeScanner />} />
              <Route path="/opme-registration" element={<OpmeRegistration />} /> {/* New route for OPME registration */}
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;