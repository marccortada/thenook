import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Users, BarChart3, MapPin, Clock, Star, Gift, StickyNote, Hash, FileText, Percent, TrendingUp, Bell, Brain, Package, Settings, Activity } from "lucide-react";

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
import AdvancedAnalytics from "@/components/AdvancedAnalytics";
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
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { user, isAdmin, isEmployee, isAuthenticated, loading } = useSimpleAuth();
  const navigate = useNavigate();

  const isOwner = !!user && user.email === 'work@thenookmadrid.com';

  // Handle scroll to hide/show header
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Hide header when scrolling down more than 50px
      if (currentScrollY > 50 && currentScrollY > lastScrollY) {
        setIsHeaderVisible(false);
      } 
      // Show header when scrolling up or at top
      else if (currentScrollY < lastScrollY || currentScrollY <= 50) {
        setIsHeaderVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    // Also listen to scroll events on the main container
    const mainContainer = document.querySelector('main');
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    if (mainContainer) {
      mainContainer.addEventListener('scroll', handleScroll, { passive: true });
    }
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (mainContainer) {
        mainContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, [lastScrollY]);

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
      <main className="container mx-auto px-4 py-8 overflow-y-auto" style={{ maxHeight: '100vh' }}>
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
            {/* Mobile Menu - Auto Hide Header */}
            <div className={`lg:hidden mb-4 fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b transition-transform duration-300 ${
              isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
            }`}>
              <div className="p-3">
                <select 
                  value={activeTab} 
                  onChange={(e) => setActiveTab(e.target.value)}
                  className="w-full p-3 border rounded-lg bg-background text-sm font-medium shadow-sm"
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

            {/* Desktop Grid - Auto Hide Header */}
            <div className={`hidden lg:grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6 fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pb-6 pt-4 px-4 transition-transform duration-300 ${
              isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
            }`}>
              <div className="max-w-7xl mx-auto w-full grid grid-cols-2 xl:grid-cols-4 gap-4">
                <Button
                  variant={activeTab === "reservations" ? "default" : "outline"}
                  onClick={() => setActiveTab("reservations")}
                  className="h-auto p-4 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 shadow-sm"
                >
                  <CalendarDays className="h-5 w-5" />
                  <span className="text-sm font-medium">Nueva Reserva</span>
                </Button>
                
                <Button
                  variant={activeTab === "bookings" ? "default" : "outline"}
                  onClick={() => setActiveTab("bookings")}
                  className="h-auto p-4 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 shadow-sm"
                >
                  <CalendarDays className="h-5 w-5" />
                  <span className="text-sm font-medium">Calendario</span>
                </Button>
                
                <Button
                  variant={activeTab === "clients" ? "default" : "outline"}
                  onClick={() => setActiveTab("clients")}
                  className="h-auto p-4 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 shadow-sm"
                >
                  <Users className="h-5 w-5" />
                  <span className="text-sm font-medium">Gestión de Clientes</span>
                </Button>
                
                {(isAdmin || isEmployee) && (
                  <Button
                    variant={activeTab === "packages" ? "default" : "outline"}
                    onClick={() => setActiveTab("packages")}
                    className="h-auto p-4 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 shadow-sm"
                  >
                    <Gift className="h-5 w-5" />
                    <span className="text-sm font-medium">Bonos</span>
                  </Button>
                )}

                
                {(isAdmin || isOwner) && (
                  <Button
                    variant={activeTab === "analytics" ? "default" : "outline"}
                    onClick={() => setActiveTab("analytics")}
                    className="h-auto p-4 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 shadow-sm"
                  >
                    <TrendingUp className="h-5 w-5" />
                    <span className="text-sm font-medium">Analytics</span>
                  </Button>
                )}
                
                {(isAdmin || isOwner) && (
                  <Button
                    variant={activeTab === "control" ? "default" : "outline"}
                    onClick={() => setActiveTab("control")}
                    className="h-auto p-4 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 shadow-sm"
                  >
                    <BarChart3 className="h-5 w-5" />
                    <span className="text-sm font-medium">Centro Control</span>
                  </Button>
                )}
              </div>
            </div>

            <div className="lg:hidden h-20"></div> {/* Spacer for mobile fixed header */}
            <div className="hidden lg:block h-24"></div> {/* Spacer for desktop fixed header */}
            
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
                <AdvancedAnalytics />
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
      </main>
    </div>
  );
};

export default Index;