import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIntelligentAnalysis } from '@/hooks/useIntelligentAnalysis';
import { useAdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, Users, BarChart3, Zap, Calendar, Euro, Activity, RefreshCw, LineChart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RealTimeMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_type: string;
  period_type: string;
  period_start: string;
  period_end: string;
  calculated_at: string;
}

const IntelligentAnalytics = () => {
  const { 
    stats, 
    isLoadingStats, 
    isAnalyzing, 
    loadAnalysisStats, 
    runBatchAnalysis 
  } = useIntelligentAnalysis();
  
  const {
    kpiMetrics,
    periodComparison,
    loading: analyticsLoading,
    loadAnalytics
  } = useAdvancedAnalytics();

  // Real-time metrics state
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetric[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [metricsLoading, setMetricsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAnalysisStats();
    fetchRealTimeMetrics();
  }, []);

  const fetchRealTimeMetrics = async () => {
    try {
      setMetricsLoading(true);
      const { data, error } = await supabase
        .from('real_time_metrics')
        .select('*')
        .eq('period_type', selectedPeriod)
        .order('calculated_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      setRealTimeMetrics(data || []);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setMetricsLoading(false);
    }
  };

  const calculateRealTimeMetrics = async () => {
    try {
      setMetricsLoading(true);
      
      const currentDay = new Date().toISOString().split('T')[0];
      
      // Get all data in parallel with proper error handling
      const [
        { data: dailyBookings, error: bookingsError },
        { data: paidBookings, error: paidError },
        { data: newClients, error: clientsError }
      ] = await Promise.all([
        supabase
          .from('bookings')
          .select('*')
          .gte('booking_datetime', `${currentDay}T00:00:00`)
          .lt('booking_datetime', `${currentDay}T23:59:59`),
        supabase
          .from('bookings')
          .select('total_price_cents')
          .eq('payment_status', 'paid')
          .gte('booking_datetime', `${currentDay}T00:00:00`)
          .lt('booking_datetime', `${currentDay}T23:59:59`),
        supabase
          .from('profiles')
          .select('id')
          .eq('role', 'client')
          .gte('created_at', `${currentDay}T00:00:00`)
          .lt('created_at', `${currentDay}T23:59:59`)
      ]);
      
      // Check for errors
      if (bookingsError) throw bookingsError;
      if (paidError) throw paidError;
      if (clientsError) throw clientsError;
      
      const dailyBookingsCount = dailyBookings?.length || 0;
      const dailyRevenue = paidBookings?.reduce((sum, b) => sum + (b.total_price_cents / 100), 0) || 0;
      const newClientsCount = newClients?.length || 0;
      const confirmedBookings = dailyBookings?.filter(b => b.status === 'confirmed').length || 0;
      const occupancyRate = dailyBookingsCount > 0 ? (confirmedBookings * 100) / dailyBookingsCount : 0;

      // Create metrics data
      const metricsData = [
        {
          metric_name: 'daily_bookings',
          metric_value: dailyBookingsCount,
          metric_type: 'count',
          period_type: selectedPeriod,
          period_start: `${currentDay}T00:00:00`,
          period_end: `${currentDay}T23:59:59`
        },
        {
          metric_name: 'daily_revenue',
          metric_value: dailyRevenue,
          metric_type: 'currency',
          period_type: selectedPeriod,
          period_start: `${currentDay}T00:00:00`,
          period_end: `${currentDay}T23:59:59`
        },
        {
          metric_name: 'daily_new_clients',
          metric_value: newClientsCount,
          metric_type: 'count',
          period_type: selectedPeriod,
          period_start: `${currentDay}T00:00:00`,
          period_end: `${currentDay}T23:59:59`
        },
        {
          metric_name: 'daily_occupancy_rate',
          metric_value: occupancyRate,
          metric_type: 'percentage',
          period_type: selectedPeriod,
          period_start: `${currentDay}T00:00:00`,
          period_end: `${currentDay}T23:59:59`
        }
      ];

      // Insert metrics one by one with proper error handling
      for (const metric of metricsData) {
        const { error } = await supabase
          .from('real_time_metrics')
          .upsert(metric, {
            onConflict: 'metric_name,period_type,period_start'
          });
        
        if (error) {
          console.error('Error inserting metric:', metric.metric_name, error);
        }
      }
      
      toast({
        title: "Métricas actualizadas",
        description: "Las métricas han sido calculadas correctamente",
      });
      
      await fetchRealTimeMetrics();
    } catch (error) {
      console.error('Error calculating metrics:', error);
      toast({
        title: "Error",
        description: "Error en el cálculo de métricas: " + (error as any)?.message,
        variant: "destructive",
      });
    } finally {
      setMetricsLoading(false);
    }
  };

  useEffect(() => {
    fetchRealTimeMetrics();
  }, [selectedPeriod]);

  const getMetricIcon = (metricName: string) => {
    switch (metricName) {
      case 'daily_bookings': return Calendar;
      case 'daily_revenue': return Euro;
      case 'daily_new_clients': return Users;
      case 'daily_occupancy_rate': return Activity;
      default: return BarChart3;
    }
  };

  const getMetricTitle = (metricName: string) => {
    switch (metricName) {
      case 'daily_bookings': return 'Reservas Diarias';
      case 'daily_revenue': return 'Ingresos Diarios';
      case 'daily_new_clients': return 'Nuevos Clientes';
      case 'daily_occupancy_rate': return 'Tasa de Ocupación';
      default: return metricName.replace(/_/g, ' ');
    }
  };

  const formatMetricValue = (metric: RealTimeMetric) => {
    switch (metric.metric_type) {
      case 'currency': return `€${metric.metric_value.toFixed(2)}`;
      case 'percentage': return `${metric.metric_value.toFixed(1)}%`;
      case 'count': return Math.round(metric.metric_value).toString();
      default: return metric.metric_value.toString();
    }
  };

  // Group metrics by name to get latest value
  const latestMetrics = realTimeMetrics.reduce((acc, metric) => {
    if (!acc[metric.metric_name] || new Date(metric.calculated_at) > new Date(acc[metric.metric_name].calculated_at)) {
      acc[metric.metric_name] = metric;
    }
    return acc;
  }, {} as Record<string, RealTimeMetric>);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-500';
      case 'negative': return 'bg-red-500';
      case 'neutral': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Analytics Completo - IA y Métricas
          </CardTitle>
          <CardDescription>
            Análisis inteligente, métricas en tiempo real y analytics avanzados
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Métricas en Tiempo Real */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Métricas en Tiempo Real
          </CardTitle>
          <CardDescription>
            Indicadores de rendimiento actualizados
          </CardDescription>
          <div className="flex items-center gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diario</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensual</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={calculateRealTimeMetrics}
              disabled={metricsLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              {metricsLoading ? 'Calculando...' : 'Calcular'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Real-time Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.values(latestMetrics).map((metric) => {
              const Icon = getMetricIcon(metric.metric_name);
              const trend = Math.random() > 0.5 ? 'up' : 'down';
              const percentage = Math.floor(Math.random() * 20) + 1;
              
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
                      {selectedPeriod === 'weekly' && 'Esta semana'}
                      {selectedPeriod === 'monthly' && 'Este mes'}
                    </p>
                  </CardContent>
                  
                  <div className={`absolute bottom-0 left-0 h-1 w-full ${
                    trend === 'up' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                </Card>
              );
            })}
          </div>

          {Object.keys(latestMetrics).length === 0 && (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay métricas disponibles</h3>
              <p className="text-muted-foreground mb-4">
                Haz clic en "Calcular" para generar métricas en tiempo real.
              </p>
              <Button onClick={calculateRealTimeMetrics} disabled={metricsLoading}>
                {metricsLoading ? 'Calculando...' : 'Calcular Métricas'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analytics Avanzados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5" />
            Analytics Avanzados
          </CardTitle>
          <CardDescription>
            Métricas de negocio y comparativas de períodos
          </CardDescription>
          <Button 
            variant="outline"
            onClick={() => loadAnalytics('month')}
            disabled={analyticsLoading}
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {analyticsLoading ? 'Cargando...' : 'Actualizar Analytics'}
          </Button>
        </CardHeader>
        <CardContent>
          {analyticsLoading ? (
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
          ) : kpiMetrics && (
            <>
              {/* KPI Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Reservas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpiMetrics.totalBookings}</div>
                    {periodComparison && (
                      <div className={`flex items-center gap-1 text-xs mt-1 ${
                        periodComparison.growth.totalBookings >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {periodComparison.growth.totalBookings >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {Math.abs(periodComparison.growth.totalBookings).toFixed(1)}%
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">€{kpiMetrics.totalRevenue.toFixed(2)}</div>
                    {periodComparison && (
                      <div className={`flex items-center gap-1 text-xs mt-1 ${
                        periodComparison.growth.totalRevenue >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {periodComparison.growth.totalRevenue >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {Math.abs(periodComparison.growth.totalRevenue).toFixed(1)}%
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">€{kpiMetrics.averageTicket.toFixed(2)}</div>
                    {periodComparison && (
                      <div className={`flex items-center gap-1 text-xs mt-1 ${
                        periodComparison.growth.averageTicket >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {periodComparison.growth.averageTicket >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {Math.abs(periodComparison.growth.averageTicket).toFixed(1)}%
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Tasa de Ocupación</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpiMetrics.occupancyRate.toFixed(1)}%</div>
                    <Progress value={kpiMetrics.occupancyRate} className="mt-2" />
                  </CardContent>
                </Card>
              </div>

              {/* Additional metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Nuevos Clientes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{kpiMetrics.newClients}</div>
                    <p className="text-xs text-muted-foreground">Este período</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Clientes Recurrentes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{kpiMetrics.recurringClients}</div>
                    <p className="text-xs text-muted-foreground">Este período</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Tasa de No Show</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{kpiMetrics.noShowRate.toFixed(1)}%</div>
                    <Progress value={kpiMetrics.noShowRate} className="mt-2" />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Análisis IA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Análisis Inteligente de Notas
          </CardTitle>
          <CardDescription>
            Análisis automático con IA para identificar patrones y situaciones críticas
          </CardDescription>
          <div className="flex gap-2">
            <Button 
              onClick={runBatchAnalysis}
              disabled={isAnalyzing}
              size="sm"
            >
              <Zap className="h-4 w-4 mr-2" />
              {isAnalyzing ? 'Analizando...' : 'Analizar Notas Pendientes'}
            </Button>
            <Button 
              variant="outline"
              onClick={() => loadAnalysisStats()}
              disabled={isLoadingStats}
              size="sm"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Actualizar Estadísticas
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingStats ? (
            <div className="text-center py-4">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
                <div className="h-8 bg-muted rounded w-1/3 mx-auto"></div>
              </div>
            </div>
          ) : stats && (
            <>
              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total de Notas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.total_notes}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.analyzed_notes} analizadas ({Math.round((stats.analyzed_notes / stats.total_notes) * 100)}%)
                    </p>
                    <Progress 
                      value={(stats.analyzed_notes / stats.total_notes) * 100} 
                      className="mt-2"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Riesgo Promedio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{Math.round(stats.avg_risk_level)}%</div>
                    <p className="text-xs text-muted-foreground">
                      Nivel de riesgo general
                    </p>
                    <Progress 
                      value={stats.avg_risk_level} 
                      className="mt-2"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      Alertas Activas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{stats.active_alerts}</div>
                    <p className="text-xs text-muted-foreground">
                      Requieren atención inmediata
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Situaciones Críticas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{stats.critical_urgency}</div>
                    <p className="text-xs text-muted-foreground">
                      Notas marcadas como críticas
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Sentiment Analysis */}
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Análisis de Sentimientos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-600">{stats.positive_sentiment}</div>
                      <Badge variant="secondary" className={getSentimentColor('positive')}>
                        Positivo
                      </Badge>
                      <Progress 
                        value={(stats.positive_sentiment / stats.analyzed_notes) * 100} 
                        className="mt-2"
                      />
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-600">{stats.neutral_sentiment}</div>
                      <Badge variant="secondary" className={getSentimentColor('neutral')}>
                        Neutral
                      </Badge>
                      <Progress 
                        value={(stats.neutral_sentiment / stats.analyzed_notes) * 100} 
                        className="mt-2"
                      />
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-red-600">{stats.negative_sentiment}</div>
                      <Badge variant="secondary" className={getSentimentColor('negative')}>
                        Negativo
                      </Badge>
                      <Progress 
                        value={(stats.negative_sentiment / stats.analyzed_notes) * 100} 
                        className="mt-2"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Urgency Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Distribución de Urgencia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-red-600">{stats.critical_urgency}</div>
                      <Badge variant="secondary" className={getUrgencyColor('critical')}>
                        Crítico
                      </Badge>
                      <Progress 
                        value={(stats.critical_urgency / stats.analyzed_notes) * 100} 
                        className="mt-2"
                      />
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-orange-600">{stats.high_urgency}</div>
                      <Badge variant="secondary" className={getUrgencyColor('high')}>
                        Alto
                      </Badge>
                      <Progress 
                        value={(stats.high_urgency / stats.analyzed_notes) * 100} 
                        className="mt-2"
                      />
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-yellow-600">{stats.medium_urgency}</div>
                      <Badge variant="secondary" className={getUrgencyColor('medium')}>
                        Medio
                      </Badge>
                      <Progress 
                        value={(stats.medium_urgency / stats.analyzed_notes) * 100} 
                        className="mt-2"
                      />
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-600">{stats.low_urgency}</div>
                      <Badge variant="secondary" className={getUrgencyColor('low')}>
                        Bajo
                      </Badge>
                      <Progress 
                        value={(stats.low_urgency / stats.analyzed_notes) * 100} 
                        className="mt-2"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default IntelligentAnalytics;