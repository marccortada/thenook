import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AnalysisStats {
  total_notes: number;
  analyzed_notes: number;
  positive_sentiment: number;
  negative_sentiment: number;
  neutral_sentiment: number;
  critical_urgency: number;
  high_urgency: number;
  medium_urgency: number;
  low_urgency: number;
  avg_risk_level: number;
  active_alerts: number;
}

export const useIntelligentAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const { toast } = useToast();

  const analyzeNote = async (noteId: string, content: string, title?: string, category?: string, clientId?: string) => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-client-notes', {
        body: {
          noteId,
          content,
          title,
          category,
          clientId,
          mode: 'single'
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Error al analizar la nota');
      }

      toast({
        title: "Análisis completado",
        description: "La nota ha sido analizada con IA",
      });

      return data.analysis;
    } catch (error) {
      console.error('Error analyzing note:', error);
      toast({
        title: "Error en el análisis",
        description: "No se pudo analizar la nota automáticamente",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runBatchAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-client-notes', {
        body: {
          mode: 'batch'
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Error en el análisis por lotes');
      }

      toast({
        title: "Análisis por lotes completado",
        description: `Se procesaron ${data.processed} notas, ${data.errors} errores`,
      });

      // Refresh stats after batch analysis
      await loadAnalysisStats();

      return data;
    } catch (error) {
      console.error('Error in batch analysis:', error);
      toast({
        title: "Error en análisis por lotes",
        description: "No se pudo completar el análisis automático",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadAnalysisStats = async (daysBack: number = 30) => {
    setIsLoadingStats(true);
    try {
      // Get basic notes count
      const { data: notesData, error: notesError } = await supabase
        .from('client_notes')
        .select('id, priority')
        .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString());

      if (notesError) {
        throw notesError;
      }

      // Mock stats for now since the tables are just created
      const statsData = {
        total_notes: notesData?.length || 0,
        analyzed_notes: 0,
        positive_sentiment: 0,
        negative_sentiment: 0,
        neutral_sentiment: 0,
        critical_urgency: 0,
        high_urgency: 0,
        medium_urgency: 0,
        low_urgency: 0,
        avg_risk_level: 0,
        active_alerts: 0
      };

      setStats(statsData);
      return statsData;

    } catch (error) {
      console.error('Error loading analysis stats:', error);
      toast({
        title: "Error cargando estadísticas",
        description: "No se pudieron cargar las estadísticas de análisis",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoadingStats(false);
    }
  };

  return {
    analyzeNote,
    runBatchAnalysis,
    loadAnalysisStats,
    isAnalyzing,
    stats,
    isLoadingStats
  };
};