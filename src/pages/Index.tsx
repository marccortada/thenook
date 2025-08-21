import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Users, BarChart3, MapPin, Clock, Star, Gift, StickyNote, Hash, FileText, Percent, TrendingUp, Bell, Brain, Package, Settings, Activity } from "lucide-react";
import Layout from "@/components/Layout";
import ReservationSystem from "@/components/ReservationSystem";
import EmployeeManagement from "@/components/EmployeeManagement";
import PackageManagement from "@/components/PackageManagement";
import ClientManagement from "@/components/ClientManagement";
import SpecialistClients from "@/components/SpecialistClients";
import InternalCodesManagement from "@/components/InternalCodesManagement";
import InventoryManagement from "@/components/InventoryManagement";
import HappyHourManagement from "@/components/HappyHourManagement";
import RealTimeMetrics from "@/components/RealTimeMetrics";

import AdvancedDashboard from "@/components/AdvancedDashboard";
import ReportsCenter from "@/components/ReportsCenter";

import AdvancedReports from "@/components/AdvancedReports";
import NotificationCenter from "@/components/NotificationCenter";
import UnifiedDashboard from "@/components/UnifiedDashboard";
import IntelligentAnalytics from "@/components/IntelligentAnalytics";

import SimpleCenterCalendar from "@/components/SimpleCenterCalendar";
import AdvancedCalendarView from "@/components/AdvancedCalendarView";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { useNavigate } from "react-router-dom";
import PublicLandingPage from "@/pages/PublicLandingPage";

const Index = () => {
  const [activeTab, setActiveTab] = useState("bookings");
  const { user, isAdmin, isEmployee, isAuthenticated, loading } = useSimpleAuth();
  const navigate = useNavigate();

  const isOwner = !!user && user.email === 'work@thenookmadrid.com';

  // Mostrar página pública si no está autenticado y no está cargando
  if (!loading && !isAuthenticated) {
    return <PublicLandingPage />;
  }

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-2 sm:px-0">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center space-y-4">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="text-muted-foreground">Verificando sesión...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-2 sm:px-0">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            ¡Bienvenido, {user?.name || 'Usuario'}!
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Panel de {isAdmin ? 'administración' : 'empleado'} y gestión
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Mobile Menu */}
          <div className="lg:hidden mb-4">
            <select 
              value={activeTab} 
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full p-3 border rounded-lg bg-background text-sm font-medium"
            >
              <option value="reservations">📅 Nueva Reserva</option>
              <option value="bookings">📅 Calendario</option>
              <option value="clients">👥 Gestión de Clientes</option>
              
              {(isAdmin || isEmployee) && <option value="packages">🎁 Bonos</option>}
              {(isAdmin || isOwner) && <option value="analytics">📈 Analytics</option>}
              {(isAdmin || isOwner) && <option value="control">🎛️ Centro de Control</option>}
            </select>
          </div>

          {/* Desktop Grid */}
          <div className="hidden lg:grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <Button
              variant={activeTab === "reservations" ? "default" : "outline"}
              onClick={() => setActiveTab("reservations")}
              className="h-auto p-4 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105"
            >
              <CalendarDays className="h-5 w-5" />
              <span className="text-sm font-medium">Nueva Reserva</span>
            </Button>
            
            <Button
              variant={activeTab === "bookings" ? "default" : "outline"}
              onClick={() => setActiveTab("bookings")}
              className="h-auto p-4 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105"
            >
              <CalendarDays className="h-5 w-5" />
              <span className="text-sm font-medium">Calendario</span>
            </Button>
            
            <Button
              variant={activeTab === "clients" ? "default" : "outline"}
              onClick={() => setActiveTab("clients")}
              className="h-auto p-4 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105"
            >
              <Users className="h-5 w-5" />
              <span className="text-sm font-medium">Gestión de Clientes</span>
            </Button>
            
            {(isAdmin || isEmployee) && (
              <Button
                variant={activeTab === "packages" ? "default" : "outline"}
                onClick={() => setActiveTab("packages")}
                className="h-auto p-4 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105"
              >
                <Gift className="h-5 w-5" />
                <span className="text-sm font-medium">Bonos</span>
              </Button>
            )}

            
            {(isAdmin || isOwner) && (
              <Button
                variant={activeTab === "analytics" ? "default" : "outline"}
                onClick={() => setActiveTab("analytics")}
                className="h-auto p-4 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105"
              >
                <TrendingUp className="h-5 w-5" />
                <span className="text-sm font-medium">Analytics</span>
              </Button>
            )}
            
            {(isAdmin || isOwner) && (
              <Button
                variant={activeTab === "control" ? "default" : "outline"}
                onClick={() => setActiveTab("control")}
                className="h-auto p-4 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105"
              >
                <BarChart3 className="h-5 w-5" />
                <span className="text-sm font-medium">Centro Control</span>
              </Button>
            )}
          </div>

          <TabsContent value="reservations" className="mt-6 space-y-6">
            <ReservationSystem />
          </TabsContent>

          <TabsContent value="bookings" className="mt-6 space-y-6 -mx-2 sm:-mx-4 lg:mx-0">
            <div className="lg:hidden">
              <AdvancedCalendarView />
            </div>
            <div className="hidden lg:block">
              <AdvancedCalendarView />
            </div>
          </TabsContent>

          <TabsContent value="clients" className="mt-6 space-y-6">
            <ClientManagement />
          </TabsContent>

          {(isAdmin || isOwner) && (
            <TabsContent value="analytics" className="mt-6">
              <AdvancedDashboard />
            </TabsContent>
          )}

          {(isAdmin || isEmployee) && (
            <TabsContent value="packages" className="mt-6">
              <PackageManagement />
            </TabsContent>
          )}


          {(isAdmin || isOwner) && (
            <TabsContent value="control" className="mt-0">
              <UnifiedDashboard />
            </TabsContent>
          )}
        </Tabs>
      </div>
      
    </Layout>
  );
};

export default Index;