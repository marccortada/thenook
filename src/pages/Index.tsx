import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Users, BarChart3, MapPin, Clock, Star, Gift, StickyNote, Hash, Workflow } from "lucide-react";
import Layout from "@/components/Layout";
import Dashboard from "@/components/Dashboard";
import ReservationSystem from "@/components/ReservationSystem";
import EmployeeManagement from "@/components/EmployeeManagement";
import PackageManagement from "@/components/PackageManagement";
import ClientNotes from "@/components/ClientNotes";
import InternalCodesManagement from "@/components/InternalCodesManagement";
import WorkflowBuilder from "@/components/WorkflowBuilder";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useCenters } from "@/hooks/useDatabase";

const Index = () => {
  const [activeTab, setActiveTab] = useState("reservations");
  const { isAuthenticated, isAdmin, profile } = useAuth();
  const navigate = useNavigate();
  const { centers } = useCenters();

  // If not authenticated, show landing page
  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center py-16">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Bienestar y Relajación
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Descubre nuestros centros de masajes y terapias en el corazón de Madrid. 
              Reserva tu sesión de relajación y bienestar.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/auth")}>
                <CalendarDays className="mr-2 h-5 w-5" />
                Reservar Cita
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
                Iniciar Sesión
              </Button>
            </div>
          </div>

          {/* Centers */}
          <div className="py-16">
            <h2 className="text-3xl font-bold text-center mb-12">Nuestros Centros</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {centers.map((center) => (
                <Card key={center.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      {center.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{center.address}</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">Lun-Sab: 9:00 - 21:00</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm">Servicios de alta calidad</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            ¡Bienvenido, {profile?.first_name || 'Usuario'}!
          </h1>
          <p className="text-muted-foreground">
            {isAdmin() ? 'Panel de administración' : 'Gestiona tus reservas y servicios'}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full ${isAdmin() ? 'grid-cols-7' : 'grid-cols-1'}`}>
            <TabsTrigger value="reservations" className="flex items-center space-x-2">
              <CalendarDays className="h-4 w-4" />
              <span>Reservas</span>
            </TabsTrigger>
            {isAdmin() && (
              <TabsTrigger value="employees" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Empleados</span>
              </TabsTrigger>
            )}
            {isAdmin() && (
              <TabsTrigger value="dashboard" className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Dashboard</span>
              </TabsTrigger>
            )}
            {isAdmin() && (
              <TabsTrigger value="workflow" className="flex items-center space-x-2">
                <Workflow className="h-4 w-4" />
                <span>Workflows</span>
              </TabsTrigger>
            )}
            {isAdmin() && (
              <TabsTrigger value="packages" className="flex items-center space-x-2">
                <Gift className="h-4 w-4" />
                <span>Bonos</span>
              </TabsTrigger>
            )}
            {isAdmin() && (
              <TabsTrigger value="notes" className="flex items-center space-x-2">
                <StickyNote className="h-4 w-4" />
                <span>Notas</span>
              </TabsTrigger>
            )}
            {isAdmin() && (
              <TabsTrigger value="codes" className="flex items-center space-x-2">
                <Hash className="h-4 w-4" />
                <span>Códigos</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="reservations" className="mt-6">
            <ReservationSystem />
          </TabsContent>

          {isAdmin() && (
            <TabsContent value="employees" className="mt-6">
              <EmployeeManagement />
            </TabsContent>
          )}

          {isAdmin() && (
            <TabsContent value="dashboard" className="mt-6">
              <Dashboard />
            </TabsContent>
          )}

          {isAdmin() && (
            <TabsContent value="workflow" className="mt-6">
              <WorkflowBuilder />
            </TabsContent>
          )}

          {isAdmin() && (
            <TabsContent value="packages" className="mt-6">
              <PackageManagement />
            </TabsContent>
          )}

          {isAdmin() && (
            <TabsContent value="notes" className="mt-6">
              <ClientNotes />
            </TabsContent>
          )}

          {isAdmin() && (
            <TabsContent value="codes" className="mt-6">
              <InternalCodesManagement />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
};

export default Index;
