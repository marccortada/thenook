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
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useCenters } from "@/hooks/useDatabase";

const Index = () => {
  const [activeTab, setActiveTab] = useState("reservations");
  const { profile } = useAuth();
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {activeTab !== "control" && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">
              ¡Bienvenido, {profile?.first_name || 'Administrador'}!
            </h1>
            <p className="text-muted-foreground">
              Panel de administración y gestión
            </p>
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
              <option value="reservations">📅 Reservas</option>
              <option value="employees">👥 Empleados</option>
              <option value="analytics">📊 Analytics</option>
              <option value="packages">🎁 Bonos</option>
              <option value="notes">📝 Notas</option>
              <option value="codes"># Códigos</option>
              <option value="happyhour">% Happy Hour</option>
              <option value="inventory">📦 Inventario</option>
              <option value="control">🎛️ Centro de Control</option>
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
              <span className="text-sm font-medium">Reservas</span>
            </Button>
            
            <Button
              variant={activeTab === "employees" ? "default" : "outline"}
              onClick={() => setActiveTab("employees")}
              className="h-auto p-4 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105"
            >
              <Users className="h-5 w-5" />
              <span className="text-sm font-medium">Empleados</span>
            </Button>
            
            <Button
              variant={activeTab === "analytics" ? "default" : "outline"}
              onClick={() => setActiveTab("analytics")}
              className="h-auto p-4 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105"
            >
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm font-medium">Analytics</span>
            </Button>
            
            <Button
              variant={activeTab === "packages" ? "default" : "outline"}
              onClick={() => setActiveTab("packages")}
              className="h-auto p-4 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105"
            >
              <Gift className="h-5 w-5" />
              <span className="text-sm font-medium">Bonos</span>
            </Button>
            
            <Button
              variant={activeTab === "notes" ? "default" : "outline"}
              onClick={() => setActiveTab("notes")}
              className="h-auto p-4 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105"
            >
              <StickyNote className="h-5 w-5" />
              <span className="text-sm font-medium">Notas</span>
            </Button>
            
            <Button
              variant={activeTab === "codes" ? "default" : "outline"}
              onClick={() => setActiveTab("codes")}
              className="h-auto p-4 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105"
            >
              <Hash className="h-5 w-5" />
              <span className="text-sm font-medium">Códigos</span>
            </Button>
            
            <Button
              variant={activeTab === "happyhour" ? "default" : "outline"}
              onClick={() => setActiveTab("happyhour")}
              className="h-auto p-4 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105"
            >
              <Percent className="h-5 w-5" />
              <span className="text-sm font-medium">Happy Hour</span>
            </Button>
            
            <Button
              variant={activeTab === "inventory" ? "default" : "outline"}
              onClick={() => setActiveTab("inventory")}
              className="h-auto p-4 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105"
            >
              <Package2 className="h-5 w-5" />
              <span className="text-sm font-medium">Inventario</span>
            </Button>
            
            <Button
              variant={activeTab === "control" ? "default" : "outline"}
              onClick={() => setActiveTab("control")}
              className="h-auto p-4 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105"
            >
              <BarChart3 className="h-5 w-5" />
              <span className="text-sm font-medium">Centro Control</span>
            </Button>
          </div>

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

          <TabsContent value="control" className="mt-0">
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
