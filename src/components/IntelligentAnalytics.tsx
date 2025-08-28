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

  const { toast } = useToast();

  useEffect(() => {
    loadAnalysisStats();
  }, []);


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
            Analíticas Inteligentes
          </CardTitle>
          <CardDescription>
            Análisis avanzado con IA y predicciones
          </CardDescription>
        </CardHeader>
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