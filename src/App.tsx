import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ManageBooking from "./pages/ManageBooking";
import ClientReservation from "./pages/ClientReservation";
import PackagesPage from "./pages/PackagesPage";
import AdminLogin from "./pages/AdminLogin";
import NotFound from "./pages/NotFound";
import NotificationDashboard from "./pages/NotificationDashboard";
import ReportsCenter from "./pages/ReportsCenter";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ClientReservation />} />
          <Route path="/manage-booking" element={<ManageBooking />} />
          <Route path="/bonos" element={<PackagesPage />} />
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
          <Route path="*" element={<NotFound />} />
        </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );

export default App;
