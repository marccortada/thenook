import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useIntelligentAnalysis } from '@/hooks/useIntelligentAnalysis';
import { Brain, TrendingUp, AlertTriangle, Users, BarChart3, Zap } from 'lucide-react';

const IntelligentAnalytics = () => {
  const { 
    stats, 
    isLoadingStats, 
    isAnalyzing, 
    loadAnalysisStats, 
    runBatchAnalysis 
  } = useIntelligentAnalysis();

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

  if (isLoadingStats) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Análisis Inteligente
            </CardTitle>
            <CardDescription>
              Cargando estadísticas de análisis...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Análisis Inteligente de Notas de Clientes
          </CardTitle>
          <CardDescription>
            Análisis automático con IA para identificar patrones, sentimientos y situaciones críticas
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
      </Card>

      {stats && (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <Card>
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
    </div>
  );
};

export default IntelligentAnalytics;