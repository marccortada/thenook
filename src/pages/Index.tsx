import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Users, BarChart3, MapPin, Clock, Star, Gift, StickyNote, Hash, FileText, Percent, TrendingUp, Package2, Bell, Brain } from "lucide-react";
import Layout from "@/components/Layout";
import ReservationSystem from "@/components/ReservationSystem";
import EmployeeManagement from "@/components/EmployeeManagement";
import PackageManagement from "@/components/PackageManagement";
import ClientNotes from "@/components/ClientNotes";
import BookingsList from "@/components/BookingsList";
import SpecialistClients from "@/components/SpecialistClients";
import InternalCodesManagement from "@/components/InternalCodesManagement";
import HappyHourManagement from "@/components/HappyHourManagement";
import AdvancedDashboard from "@/components/AdvancedDashboard";
import ReportsCenter from "@/components/ReportsCenter";
import InventoryManagement from "@/components/InventoryManagement";
import AdvancedReports from "@/components/AdvancedReports";
import NotificationCenter from "@/components/NotificationCenter";
import UnifiedDashboard from "@/components/UnifiedDashboard";
import IntelligentAnalytics from "@/components/IntelligentAnalytics";
import ChatBot from "@/components/ChatBot";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useCenters } from "@/hooks/useDatabase";

const Index = () => {
  const [activeTab, setActiveTab] = useState("reservations");
  const { profile } = useAuth();
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            ¡Bienvenido, {profile?.first_name || 'Administrador'}!
          </h1>
          <p className="text-muted-foreground">
            Panel de administración y gestión
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Mobile Menu */}
          <div className="lg:hidden mb-4">
            <select 
              value={activeTab} 
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full p-3 border rounded-lg bg-background text-sm"
            >
              <option value="reservations">📅 Reservas</option>
              <option value="employees">👥 Empleados</option>
              <option value="analytics">📊 Analytics</option>
              <option value="reports">📋 Reportes</option>
              <option value="packages">🎁 Bonos</option>
              <option value="notes">📝 Notas</option>
              <option value="codes"># Códigos</option>
              <option value="happyhour">% Happy Hour</option>
              <option value="inventory">📦 Inventario</option>
              <option value="control">🎛️ Centro de Control</option>
            </select>
          </div>

          {/* Desktop Tabs */}
          <TabsList className="hidden lg:grid w-full grid-cols-8">
            <TabsTrigger value="reservations" className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
              <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Reservas</span>
            </TabsTrigger>
            <TabsTrigger value="employees" className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Empleados</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Reportes</span>
            </TabsTrigger>
            <TabsTrigger value="packages" className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
              <Gift className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Bonos</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
              <StickyNote className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Notas</span>
            </TabsTrigger>
            <TabsTrigger value="codes" className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
              <Hash className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Códigos</span>
            </TabsTrigger>
            <TabsTrigger value="happyhour" className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
              <Percent className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Happy Hour</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
              <Package2 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Inventario</span>
            </TabsTrigger>
            <TabsTrigger value="control" className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Centro Control</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reservations" className="mt-6 space-y-6">
            <ReservationSystem />
            <BookingsList />
            <SpecialistClients />
          </TabsContent>

          <TabsContent value="employees" className="mt-6">
            <EmployeeManagement />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <AdvancedDashboard />
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <ReportsCenter />
          </TabsContent>

          <TabsContent value="packages" className="mt-6">
            <PackageManagement />
          </TabsContent>

          <TabsContent value="notes" className="mt-6">
            <ClientNotes />
          </TabsContent>

          <TabsContent value="codes" className="mt-6">
            <InternalCodesManagement />
          </TabsContent>

          <TabsContent value="happyhour" className="mt-6">
            <HappyHourManagement />
          </TabsContent>

          <TabsContent value="inventory" className="mt-6">
            <InventoryManagement />
          </TabsContent>

          <TabsContent value="control" className="mt-6">
            <UnifiedDashboard />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* ChatBot para Admin */}
      <ChatBot />
    </Layout>
  );
};

export default Index;
