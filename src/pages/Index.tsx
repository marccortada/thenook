import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Users, BarChart3, MapPin, Clock, Star, Gift, StickyNote, Hash, FileText, Percent, TrendingUp } from "lucide-react";
import Layout from "@/components/Layout";
import ReservationSystem from "@/components/ReservationSystem";
import EmployeeManagement from "@/components/EmployeeManagement";
import PackageManagement from "@/components/PackageManagement";
import ClientNotes from "@/components/ClientNotes";
import BookingsList from "@/components/BookingsList";
import InternalCodesManagement from "@/components/InternalCodesManagement";
import HappyHourManagement from "@/components/HappyHourManagement";
import AdvancedDashboard from "@/components/AdvancedDashboard";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useCenters } from "@/hooks/useDatabase";

const Index = () => {
  const [activeTab, setActiveTab] = useState("reservations");
  const { isAuthenticated, isAdmin, profile } = useAuth();
  const navigate = useNavigate();

  // Redirect non-authenticated users to main page
  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  // Only show admin dashboard for authenticated admins
  if (!isAdmin()) {
    navigate("/");
    return null;
  }

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
          <div className="md:hidden mb-4">
            <select 
              value={activeTab} 
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full p-2 border rounded-lg bg-background"
            >
              <option value="reservations">📅 Reservas</option>
              <option value="employees">👥 Empleados</option>
              <option value="analytics">📊 Analytics</option>
              <option value="reports">📋 Reportes</option>
              <option value="packages">🎁 Bonos</option>
              <option value="notes">📝 Notas</option>
              <option value="codes"># Códigos</option>
              <option value="happyhour">% Happy Hour</option>
            </select>
          </div>

          {/* Desktop Tabs */}
          <TabsList className="hidden md:grid w-full grid-cols-8">
            <TabsTrigger value="reservations" className="flex items-center space-x-2">
              <CalendarDays className="h-4 w-4" />
              <span>Reservas</span>
            </TabsTrigger>
            <TabsTrigger value="employees" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Empleados</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Reportes</span>
            </TabsTrigger>
            <TabsTrigger value="packages" className="flex items-center space-x-2">
              <Gift className="h-4 w-4" />
              <span>Bonos</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center space-x-2">
              <StickyNote className="h-4 w-4" />
              <span>Notas</span>
            </TabsTrigger>
            <TabsTrigger value="codes" className="flex items-center space-x-2">
              <Hash className="h-4 w-4" />
              <span>Códigos</span>
            </TabsTrigger>
            <TabsTrigger value="happyhour" className="flex items-center space-x-2">
              <Percent className="h-4 w-4" />
              <span>Happy Hour</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reservations" className="mt-6 space-y-6">
            <ReservationSystem />
            <BookingsList />
          </TabsContent>

          <TabsContent value="employees" className="mt-6">
            <EmployeeManagement />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <AdvancedDashboard />
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">Centro de Reportes</h3>
              <p className="text-muted-foreground mb-6">
                Genera reportes detallados y analiza el rendimiento de tu negocio
              </p>
              <Button 
                onClick={() => navigate('/reports')}
                size="lg"
              >
                <FileText className="mr-2 h-5 w-5" />
                Ir al Centro de Reportes
              </Button>
            </div>
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
        </Tabs>
      </div>
    </Layout>
  );
};

export default Index;
