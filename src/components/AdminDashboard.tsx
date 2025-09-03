import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  CalendarDays, 
  Users, 
  BarChart3, 
  Gift, 
  TrendingUp, 
  Bell, 
  FileText, 
  Percent, 
  Settings,
  Calendar,
  Palette,
  
} from "lucide-react";

// Import components for each section
import ReservationSystem from "@/components/ReservationSystem";
import AdvancedCalendarView from "@/components/AdvancedCalendarView";
import ClientManagement from "@/components/ClientManagement";
import PackageManagement from "@/components/PackageManagement";
import GiftCardManagement from "@/components/GiftCardManagement";
import AdvancedDashboard from "@/components/AdvancedDashboard";
import TreatmentGroupsManagement from "@/components/TreatmentGroupsManagement";

import NotificationCenter from "@/components/NotificationCenter";
import ReportsCenter from "@/components/ReportsCenter";
import AdminPricingPromos from "@/pages/AdminPricingPromos";
import AdminSettings from "@/pages/AdminSettings";
import BookingManagement from "@/pages/BookingManagement";

import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("nueva-reserva");
  const { user, isAdmin, isEmployee, loading } = useSimpleAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground">Cargando panel de administración...</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    {
      id: "nueva-reserva",
      label: "Nueva Reserva",
      icon: CalendarDays,
      component: ReservationSystem,
      roles: ["admin", "employee"]
    },
    {
      id: "calendario",
      label: "Calendario",
      icon: Calendar,
      component: AdvancedCalendarView,
      roles: ["admin", "employee"]
    },
    {
      id: "clientes",
      label: "Gestión de Clientes",
      icon: Users,
      component: ClientManagement,
      roles: ["admin", "employee"]
    },
    {
      id: "bonos",
      label: "Bonos",
      icon: Gift,
      component: PackageManagement,
      roles: ["admin", "employee"]
    },
    {
      id: "tarjetas-regalo",
      label: "Tarjetas Regalo",
      icon: Gift,
      component: GiftCardManagement,
      roles: ["admin", "employee"]
    },
    {
      id: "advanced-analytics",
      label: "Dashboard Avanzado",
      icon: BarChart3,
      component: AdvancedDashboard,
      roles: ["admin"]
    },
    {
      id: "notificaciones",
      label: "Notificaciones",
      icon: Bell,
      component: NotificationCenter,
      roles: ["admin"]
    },
    {
      id: "precios-promos",
      label: "Precios y Promos",
      icon: Percent,
      component: AdminPricingPromos,
      roles: ["admin", "employee"]
    },
    {
      id: "grupos-tratamientos",
      label: "Grupos de Tratamientos",
      icon: Palette,
      component: TreatmentGroupsManagement,
      roles: ["admin", "employee"]
    },
    {
      id: "gestion-citas",
      label: "Gestión de Citas",
      icon: Calendar,
      component: BookingManagement,
      roles: ["admin", "employee"]
    },
    {
      id: "configuracion",
      label: "Configuración",
      icon: Settings,
      component: AdminSettings,
      roles: ["admin"]
    }
  ];

  const userRole = isAdmin ? "admin" : "employee";
  const availableItems = menuItems.filter(item => 
    item.roles.includes(userRole)
  );

  const activeItem = availableItems.find(item => item.id === activeTab) || availableItems[0];

  const handleSignOut = () => {
    localStorage.removeItem('nook_user_session');
    navigate('/admin-login');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 truncate">
                Panel de Administración
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base truncate">
                Bienvenido, {user?.name || 'Usuario'} - {isAdmin ? 'Administrador' : 'Empleado'}
              </p>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/')}
                className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-7 sm:h-8"
              >
                <span className="hidden sm:inline">Ver página pública</span>
                <span className="sm:hidden">Ver web</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut}
                className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-7 sm:h-8"
              >
                <span className="hidden sm:inline">Cerrar sesión</span>
                <span className="sm:hidden">Salir</span>
              </Button>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Mobile Menu */}
          <div className="lg:hidden mb-6">
            <Card>
              <CardContent className="p-4">
                <select 
                  value={activeTab} 
                  onChange={(e) => setActiveTab(e.target.value)}
                  className="w-full p-3 border rounded-lg bg-background text-sm font-medium"
                >
                  {availableItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>
          </div>

          {/* Desktop Menu */}
          <div className="hidden lg:block mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
                  {availableItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    
                    return (
                      <Button
                        key={item.id}
                        variant={isActive ? "default" : "outline"}
                        onClick={() => setActiveTab(item.id)}
                        className="h-auto p-4 flex flex-col items-center gap-3 text-sm font-medium transition-all hover:scale-105"
                      >
                        <Icon className="h-6 w-6" />
                        <span>{item.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          {availableItems.map((item) => {
            const Component = item.component;
            return (
              <TabsContent key={item.id} value={item.id} className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <item.icon className="h-6 w-6" />
                      {item.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Component />
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;