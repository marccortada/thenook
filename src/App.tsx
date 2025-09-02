import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TranslationProvider } from "@/components/TranslationProvider";

import AdminDashboard from "./components/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import PublicLandingPage from "./pages/PublicLandingPage";
import ClientReservation from "./pages/ClientReservation";
import BuyPackagesPage from "./pages/BuyPackagesPage";
import GiftCardsPage from "./pages/GiftCardsPage";
import BookingPaymentSetup from "./pages/BookingPaymentSetup";
import PaymentSetupSuccess from "./pages/PaymentSetupSuccess";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCanceled from "./pages/PaymentCanceled";
import ProtectedRoute from "./components/ProtectedRoute";
import PagoExitoso from "./pages/PagoExitoso";

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
            
            {/* Páginas públicas de reservas y compras */}
            <Route path="/client-reservation" element={<ClientReservation />} />
            <Route path="/packages" element={<BuyPackagesPage />} />
            <Route path="/gift-cards" element={<GiftCardsPage />} />
            
            {/* Páginas de pago con tarjeta */}
            <Route path="/asegurar-reserva" element={<BookingPaymentSetup />} />
            <Route path="/pago-configurado" element={<PaymentSetupSuccess />} />
            
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
            
            {/* Páginas de resultado de pago */}
            <Route path="/pago-exitoso" element={<PagoExitoso />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/pago-cancelado" element={<PaymentCanceled />} />
            
            {/* Redirigir cualquier ruta no válida al panel admin o página principal */}
            <Route path="/admin/*" element={<Navigate to="/panel-gestion-nook-madrid-2024" replace />} />
            <Route path="/canjear" element={<Navigate to="/panel-gestion-nook-madrid-2024" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </TranslationProvider>
  </QueryClientProvider>
);

export default App;
