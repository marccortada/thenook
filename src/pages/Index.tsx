import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Users, BarChart3, MapPin, Clock, Star, Gift, StickyNote, Hash, FileText, Percent, TrendingUp, Bell, Package, Settings, Activity, Calendar } from "lucide-react";

import ReservationSystem from "@/components/ReservationSystem";
import EmployeeManagement from "@/components/EmployeeManagement";
import PackageManagement from "@/components/PackageManagement";
import ClientManagement from "@/components/ClientManagement";
import SpecialistClients from "@/components/SpecialistClients";
import InternalCodesManagement from "@/components/InternalCodesManagement";

import HappyHourManagement from "@/components/HappyHourManagement";
import RealTimeMetrics from "@/components/RealTimeMetrics";

import AdvancedDashboard from "@/components/AdvancedDashboard";
import ReportsCenter from "@/components/ReportsCenter";

import AdvancedReports from "@/components/AdvancedReports";
import NotificationCenter from "@/components/NotificationCenter";
import UnifiedDashboard from "@/components/UnifiedDashboard";


import SimpleCenterCalendar from "@/components/SimpleCenterCalendar";
import AdvancedCalendarView from "@/components/AdvancedCalendarView";
import AdminDashboard from "@/components/AdminDashboard";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { useNavigate } from "react-router-dom";
import PublicLandingPage from "@/pages/PublicLandingPage";
import AppLogo from "@/components/AppLogo";

const Index = () => {
  const [activeTab, setActiveTab] = useState("bookings");
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const { user, isAdmin, isEmployee, isAuthenticated, loading } = useSimpleAuth();
  const navigate = useNavigate();

  const isOwner = !!user && user.email === 'work@thenookmadrid.com';

  // Mostrar página pública si no está autenticado y no está cargando
  if (!loading && !isAuthenticated) {
    return <PublicLandingPage />;
  }

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

  // Mostrar el panel de administración si está activo
  if (showAdminDashboard && isAdmin) {
    return <AdminDashboard />;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4 sm:mb-6 lg:mb-8 px-2 sm:px-0">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <AppLogo className="h-10 w-auto" />
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">
                    ¡Bienvenido, {user?.name || 'Usuario'}!
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Panel de {isAdmin ? 'administración' : 'empleado'} y gestión
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                {isAdmin && (
                  <Button 
                    onClick={() => setShowAdminDashboard(true)}
                    className="flex items-center space-x-2"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Panel de Administración</span>
                  </Button>
                )}
                <Button variant="outline" onClick={() => navigate("/admin-login")} className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Cambiar Usuario</span>
                </Button>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-9 bg-muted p-1 h-auto">
              <TabsTrigger value="bookings" className="flex flex-col items-center py-2 px-1 text-xs">
                <CalendarDays className="h-4 w-4 mb-1" />
                <span className="hidden sm:inline">Reservas</span>
              </TabsTrigger>
              
              <TabsTrigger value="calendar" className="flex flex-col items-center py-2 px-1 text-xs">
                <Calendar className="h-4 w-4 mb-1" />
                <span className="hidden sm:inline">Calendario</span>
              </TabsTrigger>
              
              <TabsTrigger value="clients" className="flex flex-col items-center py-2 px-1 text-xs">
                <Users className="h-4 w-4 mb-1" />
                <span className="hidden sm:inline">Clientes</span>
              </TabsTrigger>
              
              <TabsTrigger value="analytics" className="flex flex-col items-center py-2 px-1 text-xs">
                <BarChart3 className="h-4 w-4 mb-1" />
                <span className="hidden sm:inline">Analíticas</span>
              </TabsTrigger>
              
              {isAdmin && (
                <>
                  <TabsTrigger value="staff" className="flex flex-col items-center py-2 px-1 text-xs">
                    <Users className="h-4 w-4 mb-1" />
                    <span className="hidden sm:inline">Personal</span>
                  </TabsTrigger>
                  
                  <TabsTrigger value="packages" className="flex flex-col items-center py-2 px-1 text-xs">
                    <Package className="h-4 w-4 mb-1" />
                    <span className="hidden sm:inline">Bonos</span>
                  </TabsTrigger>
                  
                  <TabsTrigger value="codes" className="flex flex-col items-center py-2 px-1 text-xs">
                    <Hash className="h-4 w-4 mb-1" />
                    <span className="hidden sm:inline">Códigos</span>
                  </TabsTrigger>
                  
                  
                  <TabsTrigger value="promos" className="flex flex-col items-center py-2 px-1 text-xs">
                    <Percent className="h-4 w-4 mb-1" />
                    <span className="hidden sm:inline">Promos</span>
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            <TabsContent value="bookings" className="space-y-4 sm:space-y-6">
              <ReservationSystem />
            </TabsContent>

            <TabsContent value="calendar" className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CalendarDays className="h-5 w-5" />
                    <span>Calendario de Citas</span>
                  </CardTitle>
                  <CardDescription>
                    Vista avanzada del calendario con gestión de disponibilidad
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AdvancedCalendarView />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="clients" className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Gestión de Clientes</span>
                  </CardTitle>
                  <CardDescription>
                    Administra la información de clientes y su historial
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ClientManagement />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Star className="h-5 w-5" />
                    <span>Clientes Especialistas</span>
                  </CardTitle>
                  <CardDescription>
                    Vista especializada de clientes por profesional
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SpecialistClients />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5" />
                      <span>Métricas en Tiempo Real</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RealTimeMetrics />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Activity className="h-5 w-5" />
                      <span>Dashboard Unificado</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <UnifiedDashboard />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {isAdmin && (
              <>
                <TabsContent value="staff" className="space-y-4 sm:space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Users className="h-5 w-5" />
                        <span>Gestión de Personal</span>
                      </CardTitle>
                      <CardDescription>
                        Administra empleados, horarios y especialidades
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <EmployeeManagement />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="packages" className="space-y-4 sm:space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Package className="h-5 w-5" />
                        <span>Gestión de Bonos</span>
                      </CardTitle>
                      <CardDescription>
                        Crea y administra paquetes de servicios
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <PackageManagement />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="codes" className="space-y-4 sm:space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Hash className="h-5 w-5" />
                        <span>Códigos Internos</span>
                      </CardTitle>
                      <CardDescription>
                        Gestiona códigos de descuento y promociones especiales
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <InternalCodesManagement />
                    </CardContent>
                  </Card>
                </TabsContent>


                <TabsContent value="promos" className="space-y-4 sm:space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Percent className="h-5 w-5" />
                        <span>Happy Hours</span>
                      </CardTitle>
                      <CardDescription>
                        Configura descuentos por horarios especiales
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <HappyHourManagement />
                    </CardContent>
                  </Card>
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Index;