import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Users, BarChart3, MapPin, Clock, Star, Gift, StickyNote, Hash, FileText, Percent, TrendingUp, Bell, Brain } from "lucide-react";
import Layout from "@/components/Layout";
import ReservationSystem from "@/components/ReservationSystem";
import EmployeeManagement from "@/components/EmployeeManagement";
import PackageManagement from "@/components/PackageManagement";
import ClientManagement from "@/components/ClientManagement";
import SpecialistClients from "@/components/SpecialistClients";
import InternalCodesManagement from "@/components/InternalCodesManagement";
import HappyHourManagement from "@/components/HappyHourManagement";
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
import { useCenters } from "@/hooks/useDatabase";

const Index = () => {
  const [activeTab, setActiveTab] = useState("reservations");
  const { user, isAdmin, isEmployee, isAuthenticated, loading } = useSimpleAuth();
  const navigate = useNavigate();

  // Debug logs para diagnosticar el problema
  console.log('🔍 Index Component Debug:', {
    user,
    isAdmin,
    isEmployee, 
    isAuthenticated,
    loading,
    activeTab
  });

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Mostrar estado de carga */}
        {loading && (
          <div className="mb-8 text-center">
            <p className="text-muted-foreground">Cargando panel de administración...</p>
          </div>
        )}
        
        {/* Mostrar mensaje si no hay autenticación */}
        {!loading && !isAuthenticated && (
          <div className="mb-8 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive">⚠️ Sesión no válida. Por favor, inicia sesión nuevamente.</p>
            <Button 
              onClick={() => navigate('/admin-login')} 
              variant="outline" 
              className="mt-2"
            >
              Ir a Login
            </Button>
          </div>
        )}

        {activeTab !== "control" && !loading && isAuthenticated && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">
              ¡Bienvenido, {user?.name || 'Usuario'}!
            </h1>
            <p className="text-muted-foreground">
              Panel de {isAdmin ? 'administración' : 'empleado'} y gestión
            </p>
            {/* Debug info visible */}
            <div className="mt-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              Debug: Usuario={user?.email}, Admin={isAdmin ? 'Sí' : 'No'}, Empleado={isEmployee ? 'Sí' : 'No'}
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Mobile Menu */}
          <div className="lg:hidden mb-4">
            <select 
              value={activeTab} 
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full p-3 border rounded-lg bg-background text-sm"
            >
              <option value="reservations">📅 Nueva Reserva</option>
              <option value="bookings">📅 Calendario</option>
              <option value="clients">👥 Gestión de Clientes</option>
              {(isAdmin || isEmployee) && <option value="analytics">📊 Analytics</option>}
              {isAdmin && <option value="packages">🎁 Bonos</option>}
              {isAdmin && <option value="happyhour">% Happy Hour</option>}
              
              {isAdmin && <option value="control">🎛️ Centro de Control</option>}
            </select>
          </div>

          {/* Desktop Grid */}
          <div className="hidden lg:grid grid-cols-4 gap-4 mb-6">
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
            
            {/* Para admin y empleados */}
            {(isAdmin || isEmployee) && (
              <Button
                variant={activeTab === "analytics" ? "default" : "outline"}
                onClick={() => setActiveTab("analytics")}
                className="h-auto p-4 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105"
              >
                <TrendingUp className="h-5 w-5" />
                <span className="text-sm font-medium">Analytics</span>
              </Button>
            )}
            
            {isAdmin && (
              <Button
                variant={activeTab === "packages" ? "default" : "outline"}
                onClick={() => setActiveTab("packages")}
                className="h-auto p-4 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105"
              >
                <Gift className="h-5 w-5" />
                <span className="text-sm font-medium">Bonos</span>
              </Button>
            )}
            
            
            {isAdmin && (
              <Button
                variant={activeTab === "happyhour" ? "default" : "outline"}
                onClick={() => setActiveTab("happyhour")}
                className="h-auto p-4 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105"
              >
                <Percent className="h-5 w-5" />
                <span className="text-sm font-medium">Happy Hour</span>
              </Button>
            )}
            
            
            {isAdmin && (
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

          <TabsContent value="bookings" className="mt-6 space-y-6">
            <AdvancedCalendarView />
          </TabsContent>

          <TabsContent value="clients" className="mt-6 space-y-6">
            <ClientManagement />
          </TabsContent>

          {(isAdmin || isEmployee) && (
            <TabsContent value="analytics" className="mt-6">
              <AdvancedDashboard />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="packages" className="mt-6">
              <PackageManagement />
            </TabsContent>
          )}


          {isAdmin && (
            <TabsContent value="happyhour" className="mt-6">
              <HappyHourManagement />
            </TabsContent>
          )}


          {isAdmin && (
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