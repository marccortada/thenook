import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Users, BarChart3, MapPin, Clock, Star, Gift, StickyNote, Hash, FileText, Percent, TrendingUp, Bell, Brain, Package, Settings, Activity } from "lucide-react";
import MobileOptimizer from "@/components/MobileOptimizer";

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
import { useNavigate, Link } from "react-router-dom";
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
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-2 sm:px-0">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center space-y-4">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="text-muted-foreground">Verificando sesión...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with logo */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="inline-flex items-center hover:opacity-80 transition-opacity">
              <img
                src="/lovable-uploads/475dc4d6-6d6b-4357-a8b5-4611869beb43.png"
                alt="The Nook Madrid - Inicio"
                className="h-6 w-auto sm:h-8 md:h-10"
                loading="lazy"
                width={160}
                height={40}
              />
            </Link>
            <div className="flex items-center">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-8 sm:h-9"
                onClick={() => {
                  // Cerrar sesión y volver a la página pública
                  localStorage.removeItem('nook_user_session');
                  window.location.href = '/';
                }}
              >
                <span className="hidden sm:inline">Cerrar sesión</span>
                <span className="sm:hidden">Salir</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4 sm:mb-6 lg:mb-8 px-2 sm:px-0">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">
                  ¡Bienvenido, {user?.name || 'Usuario'}!
                </h1>
                <p className="text-sm text-muted-foreground">
                  Panel de {isAdmin ? 'administración' : 'empleado'} y gestión
                </p>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Mobile Menu - Improved */}
            <div className="lg:hidden mb-4 sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
              <div className="p-2">
                <select 
                  value={activeTab} 
                  onChange={(e) => setActiveTab(e.target.value)}
                  className="w-full p-3 border rounded-lg bg-background text-sm font-medium shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="reservations">📅 Nueva Reserva</option>
                  <option value="bookings">📅 Calendario</option>
                  <option value="clients">👥 Gestión de Clientes</option>
                  
                  {(isAdmin || isEmployee) && <option value="packages">🎁 Bonos</option>}
                  {(isAdmin || isOwner) && <option value="analytics">📈 Analytics</option>}
                  {(isAdmin || isOwner) && <option value="control">🎛️ Centro de Control</option>}
                </select>
              </div>
            </div>

            {/* Desktop Grid - More Responsive */}
            <div className="hidden lg:grid grid-cols-2 xl:grid-cols-4 gap-3 xl:gap-4 mb-6 sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pb-4 pt-2">
              <Button
                variant={activeTab === "reservations" ? "default" : "outline"}
                onClick={() => setActiveTab("reservations")}
                className="h-auto p-3 xl:p-4 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 shadow-sm text-xs xl:text-sm"
              >
                <CalendarDays className="h-4 w-4 xl:h-5 xl:w-5" />
                <span className="font-medium">Nueva Reserva</span>
              </Button>
              
              <Button
                variant={activeTab === "bookings" ? "default" : "outline"}
                onClick={() => setActiveTab("bookings")}
                className="h-auto p-3 xl:p-4 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 shadow-sm text-xs xl:text-sm"
              >
                <CalendarDays className="h-4 w-4 xl:h-5 xl:w-5" />
                <span className="font-medium">Calendario</span>
              </Button>
              
              <Button
                variant={activeTab === "clients" ? "default" : "outline"}
                onClick={() => setActiveTab("clients")}
                className="h-auto p-3 xl:p-4 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 shadow-sm text-xs xl:text-sm"
              >
                <Users className="h-4 w-4 xl:h-5 xl:w-5" />
                <span className="font-medium">Gestión de Clientes</span>
              </Button>
              
              {(isAdmin || isEmployee) && (
                <Button
                  variant={activeTab === "packages" ? "default" : "outline"}
                  onClick={() => setActiveTab("packages")}
                  className="h-auto p-3 xl:p-4 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 shadow-sm text-xs xl:text-sm"
                >
                  <Gift className="h-4 w-4 xl:h-5 xl:w-5" />
                  <span className="font-medium">Bonos</span>
                </Button>
              )}

              
              {(isAdmin || isOwner) && (
                <Button
                  variant={activeTab === "analytics" ? "default" : "outline"}
                  onClick={() => setActiveTab("analytics")}
                  className="h-auto p-3 xl:p-4 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 shadow-sm text-xs xl:text-sm"
                >
                  <TrendingUp className="h-4 w-4 xl:h-5 xl:w-5" />
                  <span className="font-medium">Analytics</span>
                </Button>
              )}
              
              {(isAdmin || isOwner) && (
                <Button
                  variant={activeTab === "control" ? "default" : "outline"}
                  onClick={() => setActiveTab("control")}
                  className="h-auto p-3 xl:p-4 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 shadow-sm text-xs xl:text-sm"
                >
                  <BarChart3 className="h-4 w-4 xl:h-5 xl:w-5" />
                  <span className="font-medium">Centro Control</span>
                </Button>
              )}
            </div>

            <TabsContent value="reservations" className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
              <ReservationSystem />
            </TabsContent>

            <TabsContent value="bookings" className="mt-4 sm:mt-6 space-y-4 sm:space-y-6 -mx-2 sm:-mx-4 lg:mx-0">
              <AdvancedCalendarView />
            </TabsContent>

            <TabsContent value="clients" className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
              <ClientManagement />
            </TabsContent>

            {(isAdmin || isOwner) && (
              <TabsContent value="analytics" className="mt-4 sm:mt-6">
                <AdvancedDashboard />
              </TabsContent>
            )}

            {(isAdmin || isEmployee) && (
              <TabsContent value="packages" className="mt-4 sm:mt-6">
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
      </main>
    </div>
  );
};

export default Index;