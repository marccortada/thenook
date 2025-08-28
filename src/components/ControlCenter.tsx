
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar,
  Users, 
  Package,
  TrendingUp,
  Settings,
  Bell,
  FileText,
  CreditCard,
  Gift,
  UserCheck,
  Clock,
  Euro,
  AlertCircle,
  CheckCircle,
  RotateCcw
} from 'lucide-react';
import ReservationSystem from './ReservationSystem';
import ClientManagement from './ClientManagement';
import PackageManagement from './PackageManagement';
import AdvancedDashboard from './AdvancedDashboard';
import AdvancedScheduleManagement from './AdvancedScheduleManagement';
import EmployeeManagement from './EmployeeManagement';
import CenterManagement from './CenterManagement';
import { useDashboard } from '@/hooks/useDashboard';

const ControlCenter = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { metrics, loading, error, refetch } = useDashboard();

  if (loading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={refetch} variant="outline">
                <RotateCcw className="mr-2 h-4 w-4" />
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-primary">Centro de Control</h2>
          <p className="text-muted-foreground">Panel de administración para gestión completa</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={refetch} variant="outline" size="sm">
            <RotateCcw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reservas Hoy</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.todayBookings}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.pendingBookings} pendientes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Hoy</CardTitle>
              <Euro className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{metrics.todayRevenue?.toFixed(2) || '0.00'}</div>
              <p className="text-xs text-muted-foreground">
                +{metrics.revenueGrowth?.toFixed(1) || '0'}% vs ayer
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.activeClients}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.newClientsThisMonth} nuevos este mes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa Ocupación</CardTitle>
              <TrendingUp className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.occupancyRate?.toFixed(1) || '0'}%</div>
              <p className="text-xs text-muted-foreground">
                Promedio semanal
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="reservations">Reservas</TabsTrigger>
          <TabsTrigger value="clients">Clientes</TabsTrigger>
          <TabsTrigger value="packages">Bonos</TabsTrigger>
          <TabsTrigger value="schedule">Horarios</TabsTrigger>
          <TabsTrigger value="staff">Personal</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <AdvancedDashboard />
        </TabsContent>

        <TabsContent value="reservations">
          <ReservationSystem />
        </TabsContent>

        <TabsContent value="clients">
          <ClientManagement />
        </TabsContent>

        <TabsContent value="packages">
          <PackageManagement />
        </TabsContent>

        <TabsContent value="schedule">
          <AdvancedScheduleManagement />
        </TabsContent>

        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Personal</CardTitle>
              <CardDescription>
                Administra empleados y centros
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="employees">
                <TabsList>
                  <TabsTrigger value="employees">Empleados</TabsTrigger>
                  <TabsTrigger value="centers">Centros</TabsTrigger>
                </TabsList>
                <TabsContent value="employees">
                  <EmployeeManagement />
                </TabsContent>
                <TabsContent value="centers">
                  <CenterManagement />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ControlCenter;
