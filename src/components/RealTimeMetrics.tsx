import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar, 
  Euro, 
  Activity,
  RefreshCw,
  BarChart3,
  PieChart,
  LineChart
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import MetricsExplanation from "./MetricsExplanation";

interface Metric {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_type: string;
  period_type: string;
  period_start: string;
  period_end: string;
  calculated_at: string;
  metadata?: any;
}

const RealTimeMetrics = () => {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('business_metrics')
        .select('*')
        .order('calculated_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // Transform business_metrics to match Metric interface
      const transformedData = data?.map(metric => ({
        id: metric.id,
        metric_name: metric.metric_name,
        metric_value: metric.metric_value,
        metric_type: metric.metric_type,
        period_type: selectedPeriod,
        period_start: metric.period_start,
        period_end: metric.period_end,
        calculated_at: metric.calculated_at,
        metadata: metric.metadata
      })) || [];
      
      setMetrics(transformedData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las métricas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = async () => {
    try {
      // Calculate simple metrics using existing tables
      const currentDay = new Date().toISOString().split('T')[0];
      
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .gte('booking_datetime', `${currentDay}T00:00:00`)
        .lt('booking_datetime', `${currentDay}T23:59:59`);

      if (bookingsError) throw bookingsError;

      const dailyBookingsCount = bookings?.length || 0;
      const dailyRevenue = bookings?.reduce((sum, b) => sum + (b.total_price_cents / 100), 0) || 0;

      // Insert simple metric
      const { error } = await supabase
        .from('business_metrics')
        .insert({
          metric_name: 'daily_bookings',
          metric_value: dailyBookingsCount,
          metric_type: 'count',
          period_start: currentDay,
          period_end: currentDay
        });

      if (error) throw error;
      
      toast({
        title: "Métricas actualizadas",
        description: "Las métricas han sido recalculadas correctamente",
      });
      
      await fetchMetrics();
    } catch (error) {
      console.error('Error calculating metrics:', error);
      toast({
        title: "Error",
        description: "No se pudieron calcular las métricas",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchMetrics();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [selectedPeriod]);

  const getMetricIcon = (metricName: string) => {
    switch (metricName) {
      case 'daily_bookings':
        return Calendar;
      case 'daily_revenue':
        return Euro;
      case 'daily_new_clients':
        return Users;
      case 'daily_occupancy_rate':
        return Activity;
      default:
        return BarChart3;
    }
  };

  const getMetricTitle = (metricName: string) => {
    switch (metricName) {
      case 'daily_bookings':
        return 'Reservas Diarias';
      case 'daily_revenue':
        return 'Ingresos Diarios';
      case 'daily_new_clients':
        return 'Nuevos Clientes';
      case 'daily_occupancy_rate':
        return 'Tasa de Ocupación';
      default:
        return metricName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const formatMetricValue = (metric: Metric) => {
    switch (metric.metric_type) {
      case 'currency':
        return `€${metric.metric_value.toFixed(2)}`;
      case 'percentage':
        return `${metric.metric_value.toFixed(1)}%`;
      case 'count':
        return Math.round(metric.metric_value).toString();
      default:
        return metric.metric_value.toString();
    }
  };

  const getMetricTrend = (metric: Metric) => {
    // Simple trend calculation based on metadata or value
    const trend = Math.random() > 0.5 ? 'up' : 'down'; // Placeholder
    const percentage = Math.floor(Math.random() * 20) + 1;
    
    return { trend, percentage };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Group metrics by name to get the latest value
  const latestMetrics = metrics.reduce((acc, metric) => {
    if (!acc[metric.metric_name] || new Date(metric.calculated_at) > new Date(acc[metric.metric_name].calculated_at)) {
      acc[metric.metric_name] = metric;
    }
    return acc;
  }, {} as Record<string, Metric>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Métricas en Tiempo Real</h2>
          <p className="text-muted-foreground">
            {lastUpdated && `Última actualización: ${lastUpdated.toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">Por Hora</SelectItem>
              <SelectItem value="daily">Diario</SelectItem>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="monthly">Mensual</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={calculateMetrics}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.values(latestMetrics).map((metric) => {
          const Icon = getMetricIcon(metric.metric_name);
          const { trend, percentage } = getMetricTrend(metric);
          
          return (
            <Card key={metric.id} className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span>{getMetricTitle(metric.metric_name)}</span>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold">
                    {formatMetricValue(metric)}
                  </span>
                  <div className={`flex items-center gap-1 text-xs ${
                    trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {trend === 'up' ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {percentage}%
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedPeriod === 'daily' && 'Hoy'}
                  {selectedPeriod === 'hourly' && 'Última hora'}
                  {selectedPeriod === 'weekly' && 'Esta semana'}
                  {selectedPeriod === 'monthly' && 'Este mes'}
                </p>
              </CardContent>
              
              {/* Visual indicator */}
              <div className={`absolute bottom-0 left-0 h-1 w-full ${
                trend === 'up' ? 'bg-green-500' : 'bg-red-500'
              }`} />
            </Card>
          );
        })}
      </div>

      {Object.keys(latestMetrics).length === 0 && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay métricas disponibles</h3>
              <p className="text-muted-foreground mb-4">
                Las métricas se calculan automáticamente. Haz clic en "Actualizar" para generar nuevas métricas.
              </p>
              <Button onClick={calculateMetrics}>
                Calcular Métricas
              </Button>
            </CardContent>
          </Card>
          <MetricsExplanation />
        </div>
      )}

      {/* Historical data preview */}
      {metrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Historial de Métricas
            </CardTitle>
            <CardDescription>
              Últimos valores calculados para el período seleccionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.slice(0, 5).map((metric) => (
                <div key={metric.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {getMetricTitle(metric.metric_name)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(metric.calculated_at).toLocaleString()}
                    </span>
                  </div>
                  <span className="font-medium">
                    {formatMetricValue(metric)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RealTimeMetrics;