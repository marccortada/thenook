import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, subDays, subWeeks, subMonths, subQuarters, subYears } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
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
  Area
} from "recharts";
import { TrendingUp, TrendingDown, Calendar, Users, Euro, Target, CalendarIcon } from "lucide-react";
import { useDashboard } from "@/hooks/useDashboard";

interface AnalyticsProps {
  startDate?: string;
  endDate?: string;
  centerId?: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

const Analytics = ({ startDate, endDate, centerId }: AnalyticsProps) => {
  const { 
    stats, 
    serviceStats, 
    centerStats, 
    bookingTrends, 
    loading 
  } = useDashboard(startDate, endDate, centerId);

  // Estados para comparación personalizada
  const [comparisonType, setComparisonType] = useState<'days' | 'weeks' | 'months' | 'quarters' | 'years'>('days');
  const [comparisonAmount, setComparisonAmount] = useState<number>(7);
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [isCustomDateMode, setIsCustomDateMode] = useState(false);

  // Hook para datos de comparación personalizada
  const { 
    stats: comparisonStats,
    bookingTrends: comparisonTrends
  } = useDashboard(
    isCustomDateMode && customStartDate ? format(customStartDate, 'yyyy-MM-dd') : 
    comparisonType === 'days' ? format(subDays(new Date(), comparisonAmount), 'yyyy-MM-dd') :
    comparisonType === 'weeks' ? format(subWeeks(new Date(), comparisonAmount), 'yyyy-MM-dd') :
    comparisonType === 'months' ? format(subMonths(new Date(), comparisonAmount), 'yyyy-MM-dd') :
    comparisonType === 'quarters' ? format(subQuarters(new Date(), comparisonAmount), 'yyyy-MM-dd') :
    format(subYears(new Date(), comparisonAmount), 'yyyy-MM-dd'),
    
    isCustomDateMode && customEndDate ? format(customEndDate, 'yyyy-MM-dd') :
    comparisonType === 'days' ? format(subDays(new Date(), 1), 'yyyy-MM-dd') :
    comparisonType === 'weeks' ? format(subWeeks(new Date(), 1), 'yyyy-MM-dd') :
    comparisonType === 'months' ? format(subMonths(new Date(), 1), 'yyyy-MM-dd') :
    comparisonType === 'quarters' ? format(subQuarters(new Date(), 1), 'yyyy-MM-dd') :
    format(subYears(new Date(), 1), 'yyyy-MM-dd'),
    
    centerId
  );

  // Calculate growth trends
  const trends = useMemo(() => {
    if (bookingTrends.length < 2) return { bookingsGrowth: 0, revenueGrowth: 0 };
    
    const sortedTrends = [...bookingTrends].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstHalf = sortedTrends.slice(0, Math.ceil(sortedTrends.length / 2));
    const secondHalf = sortedTrends.slice(Math.floor(sortedTrends.length / 2));
    
    const firstHalfBookings = firstHalf.reduce((sum, trend) => sum + trend.count, 0);
    const secondHalfBookings = secondHalf.reduce((sum, trend) => sum + trend.count, 0);
    const firstHalfRevenue = firstHalf.reduce((sum, trend) => sum + trend.revenue, 0);
    const secondHalfRevenue = secondHalf.reduce((sum, trend) => sum + trend.revenue, 0);
    
    const bookingsGrowth = firstHalfBookings > 0 ? ((secondHalfBookings - firstHalfBookings) / firstHalfBookings) * 100 : 0;
    const revenueGrowth = firstHalfRevenue > 0 ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100 : 0;
    
    return { bookingsGrowth, revenueGrowth };
  }, [bookingTrends]);

  // Status distribution data
  const statusData = useMemo(() => [
    { name: 'Confirmadas', value: stats.confirmedBookings, color: 'hsl(var(--primary))' },
    { name: 'Pendientes', value: stats.pendingBookings, color: 'hsl(var(--secondary))' },
    { name: 'Canceladas', value: stats.cancelledBookings, color: 'hsl(var(--destructive))' },
  ], [stats]);

  // Client type data
  const clientTypeData = useMemo(() => [
    { name: 'Nuevos', value: stats.newClients, color: 'hsl(var(--primary))' },
    { name: 'Recurrentes', value: stats.returningClients, color: 'hsl(var(--secondary))' },
  ], [stats]);

  // Revenue vs Bookings trend
  const revenueVsBookingsData = useMemo(() => 
    bookingTrends.map(trend => ({
      date: new Date(trend.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
      reservas: trend.count,
      ingresos: trend.revenue,
    }))
  , [bookingTrends]);

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
      {/* KPI Cards with Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crecimiento Reservas</CardTitle>
            {trends.bookingsGrowth >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trends.bookingsGrowth > 0 ? '+' : ''}{trends.bookingsGrowth.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">vs período anterior</p>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crecimiento Ingresos</CardTitle>
            {trends.revenueGrowth >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trends.revenueGrowth > 0 ? '+' : ''}{trends.revenueGrowth.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">vs período anterior</p>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa Confirmación</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalBookings > 0 ? ((stats.confirmedBookings / stats.totalBookings) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.confirmedBookings}/{stats.totalBookings} reservas
            </p>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cliente Promedio</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.returningClients > 0 ? 
                ((stats.returningClients / (stats.newClients + stats.returningClients)) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">clientes recurrentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends">Tendencias</TabsTrigger>
          <TabsTrigger value="services">Servicios</TabsTrigger>
          <TabsTrigger value="distribution">Distribución</TabsTrigger>
          <TabsTrigger value="centers">Centros</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          {/* Controles de comparación - SIEMPRE VISIBLE */}
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Comparar Períodos Personalizados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex items-center space-x-2">
                  <Button
                    variant={isCustomDateMode ? "outline" : "default"}
                    size="sm"
                    onClick={() => setIsCustomDateMode(false)}
                  >
                    Período Relativo
                  </Button>
                  <Button
                    variant={isCustomDateMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsCustomDateMode(true)}
                  >
                    Fechas Personalizadas
                  </Button>
                </div>

                {!isCustomDateMode ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Cantidad</label>
                      <Select
                        value={comparisonAmount.toString()}
                        onValueChange={(value) => setComparisonAmount(parseInt(value))}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 14, 15, 30].map((num) => (
                            <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Período</label>
                      <Select
                        value={comparisonType}
                        onValueChange={(value: 'days' | 'weeks' | 'months' | 'quarters' | 'years') => setComparisonType(value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="days">Días</SelectItem>
                          <SelectItem value="weeks">Semanas</SelectItem>
                          <SelectItem value="months">Meses</SelectItem>
                          <SelectItem value="quarters">Trimestres</SelectItem>
                          <SelectItem value="years">Años</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Fecha Inicio</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-40 justify-start text-left font-normal",
                              !customStartDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customStartDate ? format(customStartDate, "dd/MM/yyyy", { locale: es }) : "Seleccionar"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={customStartDate}
                            onSelect={setCustomStartDate}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Fecha Fin</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-40 justify-start text-left font-normal",
                              !customEndDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customEndDate ? format(customEndDate, "dd/MM/yyyy", { locale: es }) : "Seleccionar"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={customEndDate}
                            onSelect={setCustomEndDate}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Comparación</label>
                  <div className="text-sm text-muted-foreground">
                    Actual: {stats.totalBookings} reservas vs Comparado: {comparisonStats.totalBookings} reservas
                    <br />
                    Diferencia: {stats.totalBookings - comparisonStats.totalBookings > 0 ? '+' : ''}{stats.totalBookings - comparisonStats.totalBookings} reservas
                    ({comparisonStats.totalBookings > 0 ? (((stats.totalBookings - comparisonStats.totalBookings) / comparisonStats.totalBookings) * 100).toFixed(1) : 0}%)
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Evolución Temporal</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueVsBookingsData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="date" 
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
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reservas por Día</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueVsBookingsData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="reservas"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                      name="Reservas"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle>Rendimiento por Servicio</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={serviceStats.slice(0, 8)}>
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
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
                <div className="flex justify-center space-x-4 mt-4">
                  {statusData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm">{entry.name}: {entry.value}</span>
                    </div>
                  ))}
                </div>
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
                      data={clientTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {clientTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
                <div className="flex justify-center space-x-4 mt-4">
                  {clientTypeData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm">{entry.name}: {entry.value}</span>
                    </div>
                  ))}
                </div>
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
                <BarChart data={centerStats}>
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

export default Analytics;