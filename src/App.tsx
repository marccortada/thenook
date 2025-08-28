import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TranslationProvider } from "@/components/TranslationProvider";

import Index from "./pages/Index";
import ManageBooking from "./pages/ManageBooking";
import ClientReservation from "./pages/ClientReservation";
import PackagesPage from "./pages/PackagesPage";
import BuyVoucherPage from "./pages/BuyVoucherPage";
import GiftCardsPage from "./pages/GiftCardsPage";
import GiftCardsManagementPage from "./pages/GiftCardsManagementPage";
import AdminLogin from "./pages/AdminLogin";
import NotFound from "./pages/NotFound";
import NotificationDashboard from "./pages/NotificationDashboard";
import ReportsCenter from "./pages/ReportsCenter";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminPricingPromos from "./pages/AdminPricingPromos";
import AdminSettings from "./pages/AdminSettings";
import RedeemCode from "./pages/RedeemCode";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCanceled from "./pages/PaymentCanceled";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TranslationProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/client-reservation" element={<ClientReservation />} />
          <Route path="/manage-booking" element={<ManageBooking />} />
          <Route path="/comprar-bono" element={<BuyVoucherPage />} />
          <Route path="/tarjetas-regalo" element={<GiftCardsPage />} />
          <Route path="/admin/bonos" element={<ProtectedRoute><PackagesPage /></ProtectedRoute>} />
          <Route path="/admin/tarjetas-regalo" element={<ProtectedRoute><GiftCardsManagementPage /></ProtectedRoute>} />
          <Route 
            path="/bonos"
            element={
              <ProtectedRoute requireAdmin={true}>
                <PackagesPage />
              </ProtectedRoute>
            }
          />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route 
            path="/panel-gestion-nook-madrid-2024" 
            element={
              <ProtectedRoute requireAuth={true}>
                <Index />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/panel-gestion-nook-madrid-2024/notifications" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <NotificationDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/panel-gestion-nook-madrid-2024/reports" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <ReportsCenter />
              </ProtectedRoute>
            } 
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route 
            path="/panel-gestion-nook-madrid-2024/precios-promos" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminPricingPromos />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/panel-gestion-nook-madrid-2024/canjear" 
            element={
              <ProtectedRoute requireEmployee={true}>
                <RedeemCode />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/panel-gestion-nook-madrid-2024/configuracion" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminSettings />
              </ProtectedRoute>
            } 
          />
          <Route path="/pago-exitoso" element={<PaymentSuccess />} />
          <Route path="/pago-cancelado" element={<PaymentCanceled />} />
          <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </TranslationProvider>
  </QueryClientProvider>
);

export default App;
