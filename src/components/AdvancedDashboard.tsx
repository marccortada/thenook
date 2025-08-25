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
  Activity,
  MapPin,
  RefreshCw
} from "lucide-react";
import { useAdvancedAnalytics } from "@/hooks/useAdvancedAnalytics";
import { PeriodComparisonChart } from "@/components/PeriodComparisonChart";
import PeriodCalendarModal from "@/components/PeriodCalendarModal";
import { cn } from "@/lib/utils";

type PeriodType = 'today' | 'week' | 'month' | 'quarter' | 'year';

const AdvancedDashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('month');
  const [showCalendarModal, setShowCalendarModal] = useState(false);
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

  // Simple chart component using CSS bars
  const SimpleBarChart = ({ data, valueKey, labelKey, title }: {
    data: any[];
    valueKey: string;
    labelKey: string;
    title: string;
  }) => {
    const maxValue = Math.max(...data.map(item => item[valueKey] || 0));
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.slice(0, 8).map((item, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium truncate">{item[labelKey]}</span>
                  <span>{valueKey === 'totalRevenue' ? formatCurrency(item[valueKey]) : item[valueKey]}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${maxValue > 0 ? (item[valueKey] / maxValue) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

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
          {/* Calendar Button */}
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => setShowCalendarModal(true)}
              className={cn(
                "px-6 py-3 text-base font-semibold rounded-xl",
                "bg-gradient-to-r from-primary to-primary/80",
                "hover:from-primary/90 hover:to-primary/70",
                "shadow-lg hover:shadow-xl transition-all duration-200",
                "flex items-center gap-2"
              )}
            >
              <Calendar className="h-5 w-5" />
              Calendario
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Period Comparison Chart */}
            <div className="lg:col-span-2">
              {periodComparison && (
                <PeriodComparisonChart
                  title="Comparación de Períodos"
                  periodLabel={{
                    current: `${selectedPeriod === 'today' ? 'Hoy' : 
                             selectedPeriod === 'week' ? 'Esta semana' :
                             selectedPeriod === 'month' ? 'Este mes' :
                             selectedPeriod === 'quarter' ? 'Este trimestre' : 'Este año'}`,
                    previous: `${selectedPeriod === 'today' ? 'Ayer' : 
                              selectedPeriod === 'week' ? 'Semana anterior' :
                              selectedPeriod === 'month' ? 'Mes anterior' :
                              selectedPeriod === 'quarter' ? 'Trimestre anterior' : 'Año anterior'}`
                  }}
                  data={[
                    {
                      label: 'Reservas Totales',
                      current: periodComparison.current.totalBookings,
                      previous: periodComparison.previous.totalBookings,
                      format: 'number'
                    },
                    {
                      label: 'Ingresos Totales',
                      current: periodComparison.current.totalRevenue,
                      previous: periodComparison.previous.totalRevenue,
                      format: 'currency'
                    },
                    {
                      label: 'Ticket Medio',
                      current: periodComparison.current.averageTicket,
                      previous: periodComparison.previous.averageTicket,
                      format: 'currency'
                    },
                    {
                      label: 'Nuevos Clientes',
                      current: periodComparison.current.newClients,
                      previous: periodComparison.previous.newClients,
                      format: 'number'
                    }
                  ]}
                />
              )}
            </div>

            {/* Daily Evolution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Últimos 7 días
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {timeSeriesData.slice(-7).map((day, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="text-sm font-medium">
                        {new Date(day.date).toLocaleDateString('es-ES', { 
                          weekday: 'short', 
                          day: 'numeric', 
                          month: 'short' 
                        })}
                      </div>
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3 text-blue-500" />
                          <span>{day.bookings}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-3 w-3 text-green-500" />
                          <span>{formatCurrency(day.revenue)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="h-3 w-3 text-purple-500" />
                          <span>{day.newClients}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="text-center p-4 bg-blue-50">
              <div className="text-2xl font-bold text-blue-600">
                {kpiMetrics?.totalBookings || 0}
              </div>
              <div className="text-sm text-blue-600">Total Reservas</div>
              {periodComparison && (
                <div className="text-xs text-blue-500 mt-1">
                  {periodComparison.growth.totalBookings >= 0 ? '+' : ''}{periodComparison.growth.totalBookings.toFixed(1)}% vs anterior
                </div>
              )}
            </Card>
            <Card className="text-center p-4 bg-green-50">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(kpiMetrics?.totalRevenue || 0)}
              </div>
              <div className="text-sm text-green-600">Ingresos</div>
              {periodComparison && (
                <div className="text-xs text-green-500 mt-1">
                  {periodComparison.growth.totalRevenue >= 0 ? '+' : ''}{periodComparison.growth.totalRevenue.toFixed(1)}% vs anterior
                </div>
              )}
            </Card>
            <Card className="text-center p-4 bg-purple-50">
              <div className="text-2xl font-bold text-purple-600">
                {kpiMetrics?.newClients || 0}
              </div>
              <div className="text-sm text-purple-600">Nuevos Clientes</div>
            </Card>
            <Card className="text-center p-4 bg-orange-50">
              <div className="text-2xl font-bold text-orange-600">
                {formatPercentage(kpiMetrics?.attendanceRate || 0)}
              </div>
              <div className="text-sm text-orange-600">Asistencia</div>
              {periodComparison && (
                <div className="text-xs text-orange-500 mt-1">
                  {periodComparison.growth.attendanceRate >= 0 ? '+' : ''}{periodComparison.growth.attendanceRate.toFixed(1)}% vs anterior
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="therapists" className="space-y-4">
          <SimpleBarChart 
            data={therapistMetrics} 
            valueKey="totalRevenue" 
            labelKey="therapistName" 
            title="Ingresos por Terapeuta" 
          />
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <SimpleBarChart 
              data={serviceMetrics} 
              valueKey="totalBookings" 
              labelKey="serviceName" 
              title="Servicios Más Populares" 
            />
            <SimpleBarChart 
              data={serviceMetrics} 
              valueKey="totalRevenue" 
              labelKey="serviceName" 
              title="Servicios Más Rentables" 
            />
          </div>
        </TabsContent>

        <TabsContent value="centers" className="space-y-4">
          <SimpleBarChart 
            data={centerMetrics} 
            valueKey="totalRevenue" 
            labelKey="centerName" 
            title="Rendimiento por Centro" 
          />
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
                    ((kpiMetrics.recurringClients / Math.max(kpiMetrics.newClients + kpiMetrics.recurringClients, 1)) * 100)
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

      {/* Period Calendar Modal */}
      <PeriodCalendarModal 
        open={showCalendarModal} 
        onOpenChange={setShowCalendarModal} 
      />
    </div>
  );
};

export default AdvancedDashboard;