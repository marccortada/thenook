import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar as CalendarIcon, 
  Users, 
  Euro, 
  Target,
  Download,
  Filter,
  BarChart3
} from "lucide-react";
import { format, subDays, subWeeks, subMonths, subYears, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useDashboard } from "@/hooks/useDashboard";
import { useCenters } from "@/hooks/useDatabase";

type GranularityType = 'day' | 'week' | 'month' | 'year';

interface AdvancedAnalyticsProps {
  startDate?: string;
  endDate?: string;
  centerId?: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

const AdvancedAnalytics = ({ startDate: initialStartDate, endDate: initialEndDate, centerId: initialCenterId }: AdvancedAnalyticsProps) => {
  const { centers } = useCenters();
  
  // State for period comparison
  const [granularity, setGranularity] = useState<GranularityType>('month');
  const [selectedCenter, setSelectedCenter] = useState<string>(initialCenterId || '');
  const [currentPeriod, setCurrentPeriod] = useState({
    start: new Date(initialStartDate || subMonths(new Date(), 1)),
    end: new Date(initialEndDate || new Date())
  });
  const [comparisonPeriod, setComparisonPeriod] = useState({
    start: subMonths(new Date(initialStartDate || subMonths(new Date(), 1)), 1),
    end: subMonths(new Date(initialEndDate || new Date()), 1)
  });
  const [showComparison, setShowComparison] = useState(true);

  // Calendar state
  const [currentStartOpen, setCurrentStartOpen] = useState(false);
  const [currentEndOpen, setCurrentEndOpen] = useState(false);
  const [comparisonStartOpen, setComparisonStartOpen] = useState(false);
  const [comparisonEndOpen, setComparisonEndOpen] = useState(false);

  // Format dates for API
  const formatDateForAPI = (date: Date) => format(date, 'yyyy-MM-dd');

  // Get current period data
  const { 
    stats: currentStats, 
    serviceStats: currentServiceStats, 
    centerStats: currentCenterStats, 
    bookingTrends: currentBookingTrends, 
    loading: currentLoading 
  } = useDashboard(
    formatDateForAPI(currentPeriod.start), 
    formatDateForAPI(currentPeriod.end), 
    selectedCenter
  );

  // Get comparison period data
  const { 
    stats: comparisonStats, 
    serviceStats: comparisonServiceStats, 
    centerStats: comparisonCenterStats, 
    bookingTrends: comparisonBookingTrends, 
    loading: comparisonLoading 
  } = useDashboard(
    formatDateForAPI(comparisonPeriod.start), 
    formatDateForAPI(comparisonPeriod.end), 
    selectedCenter
  );

  // Quick period selectors
  const setQuickPeriod = (type: 'today' | 'week' | 'month' | 'year') => {
    const now = new Date();
    let start: Date, end: Date;
    
    switch (type) {
      case 'today':
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case 'week':
        start = startOfWeek(now, { locale: es });
        end = endOfWeek(now, { locale: es });
        break;
      case 'month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'year':
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      default:
        return;
    }
    
    setCurrentPeriod({ start, end });
    
    // Auto-set comparison period
    switch (granularity) {
      case 'day':
        setComparisonPeriod({ 
          start: subDays(start, 1), 
          end: subDays(end, 1) 
        });
        break;
      case 'week':
        setComparisonPeriod({ 
          start: subWeeks(start, 1), 
          end: subWeeks(end, 1) 
        });
        break;
      case 'month':
        setComparisonPeriod({ 
          start: subMonths(start, 1), 
          end: subMonths(end, 1) 
        });
        break;
      case 'year':
        setComparisonPeriod({ 
          start: subYears(start, 1), 
          end: subYears(end, 1) 
        });
        break;
    }
  };

  // Calculate growth trends
  const growthMetrics = useMemo(() => {
    if (!showComparison) return null;
    
    const bookingsGrowth = comparisonStats.totalBookings > 0 
      ? ((currentStats.totalBookings - comparisonStats.totalBookings) / comparisonStats.totalBookings) * 100 
      : 0;
    
    const revenueGrowth = comparisonStats.totalRevenue > 0 
      ? ((currentStats.totalRevenue - comparisonStats.totalRevenue) / comparisonStats.totalRevenue) * 100 
      : 0;
    
    const clientsGrowth = (comparisonStats.newClients + comparisonStats.returningClients) > 0 
      ? (((currentStats.newClients + currentStats.returningClients) - (comparisonStats.newClients + comparisonStats.returningClients)) / (comparisonStats.newClients + comparisonStats.returningClients)) * 100 
      : 0;
    
    return { bookingsGrowth, revenueGrowth, clientsGrowth };
  }, [currentStats, comparisonStats, showComparison]);

  // Combined chart data for comparison
  const comparisonChartData = useMemo(() => {
    if (!showComparison) return currentBookingTrends.map(trend => ({
      date: format(new Date(trend.date), 'dd/MM'),
      reservas: trend.count,
      ingresos: trend.revenue,
    }));

    // Combine current and comparison data
    const combined = currentBookingTrends.map((current, index) => {
      const comparison = comparisonBookingTrends[index];
      return {
        date: format(new Date(current.date), 'dd/MM'),
        reservas_actual: current.count,
        ingresos_actual: current.revenue,
        reservas_anterior: comparison?.count || 0,
        ingresos_anterior: comparison?.revenue || 0,
      };
    });
    
    return combined;
  }, [currentBookingTrends, comparisonBookingTrends, showComparison]);

  // Export to CSV function
  const exportToCSV = () => {
    const csvData = [
      ['Fecha', 'Reservas Actuales', 'Ingresos Actuales', 'Reservas Anteriores', 'Ingresos Anteriores'],
      ...comparisonChartData.map(row => [
        row.date,
        row.reservas_actual || row.reservas || 0,
        row.ingresos_actual || row.ingresos || 0,
        row.reservas_anterior || '',
        row.ingresos_anterior || ''
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const loading = currentLoading || (showComparison && comparisonLoading);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Configuración de Análisis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Period Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setQuickPeriod('today')}>
              Hoy
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickPeriod('week')}>
              Esta semana
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickPeriod('month')}>
              Este mes
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickPeriod('year')}>
              Este año
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Granularity */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Granularidad</label>
              <Select value={granularity} onValueChange={(value: GranularityType) => setGranularity(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Día</SelectItem>
                  <SelectItem value="week">Semana</SelectItem>
                  <SelectItem value="month">Mes</SelectItem>
                  <SelectItem value="year">Año</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Center Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Centro</label>
              <Select value={selectedCenter} onValueChange={setSelectedCenter}>
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

            {/* Comparison Toggle */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Comparación</label>
              <Button
                variant={showComparison ? "default" : "outline"}
                onClick={() => setShowComparison(!showComparison)}
                className="w-full justify-start"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                {showComparison ? 'Activada' : 'Desactivada'}
              </Button>
            </div>

            {/* Export */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Exportar</label>
              <Button variant="outline" onClick={exportToCSV} className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>

          {/* Date Pickers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Period */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Período Actual</h4>
              <div className="flex gap-2">
                <Popover open={currentStartOpen} onOpenChange={setCurrentStartOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {format(currentPeriod.start, 'dd MMM yyyy', { locale: es })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={currentPeriod.start}
                      onSelect={(date) => {
                        if (date) {
                          setCurrentPeriod(prev => ({ ...prev, start: date }));
                          setCurrentStartOpen(false);
                        }
                      }}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                
                <Popover open={currentEndOpen} onOpenChange={setCurrentEndOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {format(currentPeriod.end, 'dd MMM yyyy', { locale: es })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={currentPeriod.end}
                      onSelect={(date) => {
                        if (date) {
                          setCurrentPeriod(prev => ({ ...prev, end: date }));
                          setCurrentEndOpen(false);
                        }
                      }}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Comparison Period */}
            {showComparison && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Período de Comparación</h4>
                <div className="flex gap-2">
                  <Popover open={comparisonStartOpen} onOpenChange={setComparisonStartOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-start">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {format(comparisonPeriod.start, 'dd MMM yyyy', { locale: es })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={comparisonPeriod.start}
                        onSelect={(date) => {
                          if (date) {
                            setComparisonPeriod(prev => ({ ...prev, start: date }));
                            setComparisonStartOpen(false);
                          }
                        }}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Popover open={comparisonEndOpen} onOpenChange={setComparisonEndOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-start">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {format(comparisonPeriod.end, 'dd MMM yyyy', { locale: es })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={comparisonPeriod.end}
                        onSelect={(date) => {
                          if (date) {
                            setComparisonPeriod(prev => ({ ...prev, end: date }));
                            setComparisonEndOpen(false);
                          }
                        }}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards with Growth */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reservas</CardTitle>
            {growthMetrics && (
              growthMetrics.bookingsGrowth >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentStats.totalBookings}</div>
            {growthMetrics && (
              <p className="text-xs text-muted-foreground">
                {growthMetrics.bookingsGrowth > 0 ? '+' : ''}{growthMetrics.bookingsGrowth.toFixed(1)}% vs período anterior
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            {growthMetrics && (
              <Euro className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{currentStats.totalRevenue.toFixed(2)}
            </div>
            {growthMetrics && (
              <p className="text-xs text-muted-foreground">
                {growthMetrics.revenueGrowth > 0 ? '+' : ''}{growthMetrics.revenueGrowth.toFixed(1)}% vs período anterior
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa Confirmación</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentStats.totalBookings > 0 ? ((currentStats.confirmedBookings / currentStats.totalBookings) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {currentStats.confirmedBookings}/{currentStats.totalBookings} confirmadas
            </p>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            {growthMetrics && (
              growthMetrics.clientsGrowth >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentStats.newClients + currentStats.returningClients}
            </div>
            {growthMetrics && (
              <p className="text-xs text-muted-foreground">
                {growthMetrics.clientsGrowth > 0 ? '+' : ''}{growthMetrics.clientsGrowth.toFixed(1)}% vs período anterior
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle>
            {showComparison ? 'Comparación de Períodos' : 'Evolución Temporal'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            {showComparison ? (
              <ComposedChart data={comparisonChartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" className="text-xs" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" className="text-xs" tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Bar yAxisId="left" dataKey="reservas_actual" fill="hsl(var(--primary))" name="Reservas Actuales" />
                <Bar yAxisId="left" dataKey="reservas_anterior" fill="hsl(var(--muted))" name="Reservas Anteriores" />
                <Line yAxisId="right" type="monotone" dataKey="ingresos_actual" stroke="hsl(var(--accent))" strokeWidth={3} name="Ingresos Actuales" />
                <Line yAxisId="right" type="monotone" dataKey="ingresos_anterior" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="5 5" name="Ingresos Anteriores" />
              </ComposedChart>
            ) : (
              <AreaChart data={comparisonChartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" className="text-xs" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" className="text-xs" tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="reservas"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                  name="Reservas"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="ingresos"
                  stroke="hsl(var(--secondary))"
                  fill="hsl(var(--secondary))"
                  fillOpacity={0.3}
                  name="Ingresos (€)"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Rest of the analytics tabs... */}
      <Tabs defaultValue="services" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="services">Servicios</TabsTrigger>
          <TabsTrigger value="distribution">Distribución</TabsTrigger>
          <TabsTrigger value="centers">Centros</TabsTrigger>
        </TabsList>

        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle>Rendimiento por Servicio</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={currentServiceStats.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="service_name" 
                    className="text-xs"
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis yAxisId="left" className="text-xs" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" className="text-xs" tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Bar 
                    yAxisId="left"
                    dataKey="total_bookings" 
                    fill="hsl(var(--primary))" 
                    name="Reservas"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    yAxisId="right"
                    dataKey="total_revenue" 
                    fill="hsl(var(--secondary))" 
                    name="Ingresos (€)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Estado de Reservas</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Confirmadas', value: currentStats.confirmedBookings },
                        { name: 'Pendientes', value: currentStats.pendingBookings },
                        { name: 'Canceladas', value: currentStats.cancelledBookings },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tipo de Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Nuevos', value: currentStats.newClients },
                        { name: 'Recurrentes', value: currentStats.returningClients },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="centers">
          <Card>
            <CardHeader>
              <CardTitle>Comparativa entre Centros</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={currentCenterStats}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="center_name" 
                    className="text-xs"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis yAxisId="left" className="text-xs" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" className="text-xs" tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Bar 
                    yAxisId="left"
                    dataKey="total_bookings" 
                    fill="hsl(var(--primary))" 
                    name="Reservas"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    yAxisId="right"
                    dataKey="total_revenue" 
                    fill="hsl(var(--accent))" 
                    name="Ingresos (€)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedAnalytics;
