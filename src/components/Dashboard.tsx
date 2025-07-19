import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, Users, TrendingUp, Euro, RefreshCw, Filter, BarChart3 } from "lucide-react";
import { useDashboard } from "@/hooks/useDashboard";
import { useCenters } from "@/hooks/useDatabase";
import { Skeleton } from "@/components/ui/skeleton";
import Analytics from "@/components/Analytics";

const Dashboard = () => {
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() - 30); // 30 días atrás
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedCenterId, setSelectedCenterId] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const { centers } = useCenters();
  const { 
    stats, 
    serviceStats, 
    centerStats, 
    recentBookings, 
    loading, 
    error, 
    refetch 
  } = useDashboard(startDate, endDate, selectedCenterId || undefined);

  const statusColors = {
    confirmed: "bg-accent text-accent-foreground",
    pending: "bg-secondary text-secondary-foreground",
    cancelled: "bg-destructive text-destructive-foreground",
  };

  const statusLabels = {
    confirmed: "Confirmada",
    pending: "Pendiente",
    cancelled: "Cancelada",
  };

  const handleReset = () => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
    setSelectedCenterId('');
    setShowFilters(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={refetch} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Dashboard</CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filtros
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={refetch}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Actualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="start-date">Fecha Inicio</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end-date">Fecha Fin</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="center">Centro</Label>
                <Select value={selectedCenterId} onValueChange={setSelectedCenterId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los centros" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos los centros</SelectItem>
                    {centers.map((center) => (
                      <SelectItem key={center.id} value={center.id}>
                        {center.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={handleReset}>
                  Resetear
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reservas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              {stats.confirmedBookings} confirmadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingBookings}</div>
            <p className="text-xs text-muted-foreground">Por confirmar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              €{stats.averageTicket.toFixed(2)} promedio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newClients + stats.returningClients}</div>
            <p className="text-xs text-muted-foreground">
              {stats.newClients} nuevos, {stats.returningClients} recurrentes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analytics">
            <BarChart3 className="mr-2 h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="bookings">Reservas Recientes</TabsTrigger>
          <TabsTrigger value="services">Servicios</TabsTrigger>
          <TabsTrigger value="centers">Centros</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <Analytics 
            startDate={startDate} 
            endDate={endDate} 
            centerId={selectedCenterId || undefined} 
          />
        </TabsContent>

        <TabsContent value="bookings">
          <Card>
            <CardHeader>
              <CardTitle>Reservas Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              {recentBookings.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No hay reservas en el período seleccionado</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="text-lg font-medium">{booking.time}</div>
                        <div>
                          <div className="font-medium">{booking.client}</div>
                          <div className="text-sm text-muted-foreground">
                            {booking.service} • {booking.duration} min
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center space-x-2">
                            <MapPin className="h-3 w-3" />
                            <span>{booking.center}</span>
                            <span>•</span>
                            <span>{booking.date}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <div className="font-medium">€{booking.revenue.toFixed(2)}</div>
                        </div>
                        <Badge className={statusColors[booking.status as keyof typeof statusColors]}>
                          {statusLabels[booking.status as keyof typeof statusLabels]}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle>Servicios Más Populares</CardTitle>
            </CardHeader>
            <CardContent>
              {serviceStats.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No hay datos de servicios</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {serviceStats.map((service, index) => (
                    <div key={service.service_name} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="text-lg font-bold text-muted-foreground">#{index + 1}</div>
                        <div>
                          <div className="font-medium">{service.service_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {service.total_bookings} reservas
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">€{service.total_revenue.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">
                          €{(service.total_revenue / service.total_bookings).toFixed(2)} promedio
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="centers">
          <Card>
            <CardHeader>
              <CardTitle>Rendimiento por Centro</CardTitle>
            </CardHeader>
            <CardContent>
              {centerStats.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No hay datos de centros</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {centerStats.map((center) => (
                    <div key={center.center_name} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{center.center_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {center.total_bookings} reservas • {center.occupancy_rate}% del total
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">€{center.total_revenue.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">
                          €{(center.total_revenue / center.total_bookings).toFixed(2)} promedio
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;