import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Calendar, 
  Target,
  Clock,
  Percent,
  Star,
  BarChart3,
  PieChart,
  Activity,
  MapPin,
  RefreshCw
} from "lucide-react";
import { useAdvancedAnalytics } from "@/hooks/useAdvancedAnalytics";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

type PeriodType = 'today' | 'week' | 'month' | 'quarter' | 'year';



const AdvancedDashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('month');
  const {
    kpiMetrics,
    periodComparison,
    therapistMetrics,
    serviceMetrics,
    timeSeriesData,
    centerMetrics,
    loading,
    loadAnalytics
  } = useAdvancedAnalytics();

  const handlePeriodChange = (period: PeriodType) => {
    setSelectedPeriod(period);
    loadAnalytics(period);
  };

  const formatCurrency = (amount: number) => `€${amount.toFixed(2)}`;
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const GrowthIndicator = ({ value, className }: { value: number; className?: string }) => {
    const isPositive = value >= 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    
    return (
      <div className={cn("flex items-center", className)}>
        <Icon className={cn("h-4 w-4 mr-1", isPositive ? "text-green-500" : "text-red-500")} />
        <span className={cn("text-sm font-medium", isPositive ? "text-green-500" : "text-red-500")}>
          {formatPercentage(Math.abs(value))}
        </span>
      </div>
    );
  };

  const KPICard = ({ 
    title, 
    value, 
    icon: Icon, 
    growth, 
    subtitle 
  }: { 
    title: string; 
    value: string; 
    icon: any; 
    growth?: number; 
    subtitle?: string 
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        {growth !== undefined && (
          <div className="flex items-center pt-1">
            <GrowthIndicator value={growth} />
            <span className="text-xs text-muted-foreground ml-2">vs período anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading && !kpiMetrics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">Dashboard Avanzado</h2>
          <div className="animate-pulse h-10 w-32 bg-gray-200 rounded"></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Dashboard Avanzado</h2>
          <p className="text-muted-foreground">
            Análisis completo del rendimiento del negocio
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mes</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Año</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAnalytics(selectedPeriod)}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Reservas Totales"
          value={kpiMetrics?.totalBookings.toString() || "0"}
          icon={Calendar}
          growth={periodComparison?.growth.totalBookings}
        />
        <KPICard
          title="Ingresos Totales"
          value={formatCurrency(kpiMetrics?.totalRevenue || 0)}
          icon={DollarSign}
          growth={periodComparison?.growth.totalRevenue}
        />
        <KPICard
          title="Ticket Medio"
          value={formatCurrency(kpiMetrics?.averageTicket || 0)}
          icon={Target}
          growth={periodComparison?.growth.averageTicket}
        />
        <KPICard
          title="Tasa de Conversión"
          value={formatPercentage(kpiMetrics?.conversionRate || 0)}
          icon={Percent}
          growth={periodComparison?.growth.conversionRate}
        />
      </div>

      {/* KPIs Secundarios */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Tasa de Asistencia"
          value={formatPercentage(kpiMetrics?.attendanceRate || 0)}
          icon={Users}
          growth={periodComparison?.growth.attendanceRate}
        />
        <KPICard
          title="No Shows"
          value={formatPercentage(kpiMetrics?.noShowRate || 0)}
          icon={Clock}
          subtitle="Mejora de proceso necesaria"
        />
        <KPICard
          title="Ocupación"
          value={formatPercentage(kpiMetrics?.occupancyRate || 0)}
          icon={Activity}
          subtitle="Capacidad utilizada"
        />
        <KPICard
          title="Ingresos/Terapeuta"
          value={formatCurrency(kpiMetrics?.revenuePerTherapist || 0)}
          icon={Star}
          subtitle="Promedio por profesional"
        />
      </div>

      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="trends">Tendencias</TabsTrigger>
          <TabsTrigger value="therapists">Terapeutas</TabsTrigger>
          <TabsTrigger value="services">Servicios</TabsTrigger>
          <TabsTrigger value="centers">Centros</TabsTrigger>
          <TabsTrigger value="clients">Clientes</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Evolución de Reservas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="bookings" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Evolución de Ingresos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Ingresos']} />
                    <Line type="monotone" dataKey="revenue" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Nuevos Clientes por Día
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="newClients" fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="therapists" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rendimiento por Terapeuta</CardTitle>
              <CardDescription>Métricas individuales del período seleccionado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {therapistMetrics.map((therapist) => (
                  <div key={therapist.therapistId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{therapist.therapistName}</h4>
                      <p className="text-sm text-muted-foreground">
                        {therapist.totalBookings} reservas • {formatPercentage(therapist.attendanceRate)} asistencia
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(therapist.totalRevenue)}</div>
                      <div className="text-sm text-muted-foreground">
                        Ticket: {formatCurrency(therapist.averageTicket)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Servicios Más Populares</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {serviceMetrics.slice(0, 5).map((service, index) => (
                    <div key={service.serviceId} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <span className="font-medium">{service.serviceName}</span>
                      </div>
                      <div className="text-right text-sm">
                        <div>{service.totalBookings} reservas</div>
                        <div className="text-muted-foreground">{formatCurrency(service.totalRevenue)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribución de Ingresos por Servicio</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={serviceMetrics.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="serviceName" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="totalRevenue" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="centers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Rendimiento por Centro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {centerMetrics.map((center) => (
                  <Card key={center.centerId}>
                    <CardHeader>
                      <CardTitle className="text-lg">{center.centerName}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Reservas:</span>
                          <span className="font-medium">{center.totalBookings}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Ingresos:</span>
                          <span className="font-medium">{formatCurrency(center.totalRevenue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Ocupación:</span>
                          <span className="font-medium">{formatPercentage(center.occupancyRate)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Terapeutas:</span>
                          <span className="font-medium">{center.therapistCount}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Nuevos Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {kpiMetrics?.newClients || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  En el período seleccionado
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Clientes Recurrentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {kpiMetrics?.recurringClients || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  Clientes que repiten
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tasa de Retención</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {kpiMetrics ? formatPercentage(
                    (kpiMetrics.recurringClients / (kpiMetrics.newClients + kpiMetrics.recurringClients)) * 100
                  ) : "0%"}
                </div>
                <p className="text-sm text-muted-foreground">
                  Clientes que vuelven
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedDashboard;