import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TranslationProvider } from "@/components/TranslationProvider";

import AdminDashboard from "./components/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import PublicLandingPage from "./pages/PublicLandingPage";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TranslationProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Página pública */}
            <Route path="/" element={<PublicLandingPage />} />
            
            {/* Admin Login - único acceso externo */}
            <Route path="/admin-login" element={<AdminLogin />} />
            
            {/* Panel de administración principal */}
            <Route 
              path="/panel-gestion-nook-madrid-2024" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Redirigir cualquier ruta no válida al panel admin o página principal */}
            <Route path="/admin/*" element={<Navigate to="/panel-gestion-nook-madrid-2024" replace />} />
            <Route path="/pago-exitoso" element={<Navigate to="/panel-gestion-nook-madrid-2024" replace />} />
            <Route path="/pago-cancelado" element={<Navigate to="/panel-gestion-nook-madrid-2024" replace />} />
            <Route path="/canjear" element={<Navigate to="/panel-gestion-nook-madrid-2024" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </TranslationProvider>
  </QueryClientProvider>
);

export default App;
