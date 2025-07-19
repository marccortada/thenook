import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  report_type: 'financial' | 'operational' | 'marketing' | 'inventory' | 'staff' | 'custom';
  parameters: any;
  query_definition: any;
  chart_config?: any;
  is_active: boolean;
  is_public: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface GeneratedReport {
  id: string;
  template_id?: string;
  name: string;
  parameters: any;
  data: any;
  format: 'json' | 'csv' | 'pdf';
  file_url?: string;
  status: 'generating' | 'completed' | 'failed';
  error_message?: string;
  generated_by?: string;
  generated_at: string;
  expires_at?: string;
}

export interface BusinessMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_type: string;
  period_start: string;
  period_end: string;
  center_id?: string;
  metadata?: any;
  calculated_at: string;
}

export interface KpiTarget {
  id: string;
  metric_name: string;
  target_value: number;
  target_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  period_start: string;
  period_end: string;
  center_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardWidget {
  id: string;
  user_id: string;
  widget_type: string;
  title: string;
  config: any;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export const useAdvancedReports = () => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [metrics, setMetrics] = useState<BusinessMetric[]>([]);
  const [kpiTargets, setKpiTargets] = useState<KpiTarget[]>([]);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch report templates
  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates((data || []) as ReportTemplate[]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching templates';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Fetch generated reports
  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('generated_reports')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setReports((data || []) as GeneratedReport[]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching reports';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Fetch business metrics
  const fetchMetrics = async (period = 30) => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period);

      const { data, error } = await supabase
        .from('business_metrics')
        .select('*')
        .gte('period_start', startDate.toISOString().split('T')[0])
        .order('calculated_at', { ascending: false });

      if (error) throw error;
      setMetrics(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching metrics';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Fetch KPI targets
  const fetchKpiTargets = async () => {
    try {
      const { data, error } = await supabase
        .from('kpi_targets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setKpiTargets((data || []) as KpiTarget[]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching KPI targets';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Fetch dashboard widgets
  const fetchWidgets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('User profile not found');

      const { data, error } = await supabase
        .from('dashboard_widgets')
        .select('*')
        .eq('user_id', profile.id)
        .order('position_y', { ascending: true });

      if (error) throw error;
      setWidgets(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching widgets';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Generate report from template
  const generateReport = async (templateId: string, parameters: any = {}) => {
    setLoading(true);
    try {
      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('User profile not found');

      // Get template
      const { data: template } = await supabase
        .from('report_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (!template) throw new Error('Template not found');

      // Generate report data based on template type
      let reportData = {};
      
      if (template.report_type === 'financial') {
        reportData = await generateFinancialReport(parameters);
      } else if (template.report_type === 'operational') {
        reportData = await generateOperationalReport(parameters);
      } else if (template.report_type === 'marketing') {
        reportData = await generateMarketingReport(parameters);
      } else {
        reportData = await generateCustomReport(template.query_definition, parameters);
      }

      // Save generated report
      const { data, error } = await supabase
        .from('generated_reports')
        .insert([{
          template_id: templateId,
          name: `${template.name} - ${new Date().toLocaleDateString()}`,
          parameters,
          data: reportData,
          format: 'json',
          status: 'completed',
          generated_by: profile.id,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        }])
        .select()
        .single();

      if (error) throw error;

      await fetchReports();
      toast({
        title: "Reporte generado",
        description: "El reporte se ha generado exitosamente",
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error generating report';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Generate financial report
  const generateFinancialReport = async (parameters: any) => {
    const startDate = parameters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = parameters.endDate || new Date().toISOString().split('T')[0];
    const centerId = parameters.centerId || null;

    const { data, error } = await supabase.rpc('calculate_revenue_metrics', {
      start_date: startDate,
      end_date: endDate,
      center_id_param: centerId
    });

    if (error) throw error;
    return data?.[0] || {};
  };

  // Generate operational report
  const generateOperationalReport = async (parameters: any) => {
    const startDate = parameters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = parameters.endDate || new Date().toISOString().split('T')[0];
    const centerId = parameters.centerId || null;

    const { data, error } = await supabase.rpc('calculate_operational_metrics', {
      start_date: startDate,
      end_date: endDate,
      center_id_param: centerId
    });

    if (error) throw error;
    return data?.[0] || {};
  };

  // Generate marketing report
  const generateMarketingReport = async (parameters: any) => {
    // Implementation for marketing-specific metrics
    const startDate = parameters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = parameters.endDate || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        channel,
        created_at,
        client_id,
        total_price_cents
      `)
      .gte('booking_datetime', startDate)
      .lte('booking_datetime', endDate);

    if (error) throw error;

    // Process data for marketing insights
    const channelBreakdown = (data || []).reduce((acc: any, booking: any) => {
      acc[booking.channel] = (acc[booking.channel] || 0) + 1;
      return acc;
    }, {});

    return {
      total_bookings: data?.length || 0,
      channel_breakdown: channelBreakdown,
      average_booking_value: data?.reduce((sum: number, b: any) => sum + (b.total_price_cents / 100), 0) / (data?.length || 1)
    };
  };

  // Generate custom report
  const generateCustomReport = async (queryDefinition: any, parameters: any) => {
    // This would implement custom query logic based on query_definition
    return {
      message: 'Custom report generation not yet implemented',
      parameters,
      queryDefinition
    };
  };

  // Get business intelligence summary
  const getBusinessIntelligence = async (startDate?: string, endDate?: string, centerId?: string) => {
    try {
      const { data, error } = await supabase.rpc('get_business_intelligence', {
        start_date: startDate,
        end_date: endDate,
        center_id_param: centerId
      });

      if (error) throw error;
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching business intelligence';
      setError(errorMessage);
      throw err;
    }
  };

  // Create KPI target
  const createKpiTarget = async (target: Omit<KpiTarget, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('User profile not found');

      const { data, error } = await supabase
        .from('kpi_targets')
        .insert([{ ...target, created_by: profile.id }])
        .select()
        .single();

      if (error) throw error;

      await fetchKpiTargets();
      toast({
        title: "Objetivo KPI creado",
        description: "El objetivo se ha creado exitosamente",
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error creating KPI target';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  // Update dashboard widget
  const updateWidget = async (widgetId: string, updates: Partial<DashboardWidget>) => {
    try {
      const { data, error } = await supabase
        .from('dashboard_widgets')
        .update(updates)
        .eq('id', widgetId)
        .select()
        .single();

      if (error) throw error;

      await fetchWidgets();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error updating widget';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  // Export report data
  const exportReport = async (reportId: string, format: 'csv' | 'json' | 'pdf') => {
    try {
      const { data: report } = await supabase
        .from('generated_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (!report) throw new Error('Report not found');

      let exportData = '';
      let mimeType = '';
      let fileName = '';

      switch (format) {
        case 'json':
          exportData = JSON.stringify(report.data, null, 2);
          mimeType = 'application/json';
          fileName = `${report.name}.json`;
          break;
        case 'csv':
          exportData = convertToCSV(report.data);
          mimeType = 'text/csv';
          fileName = `${report.name}.csv`;
          break;
        case 'pdf':
          // PDF generation would require a library like jsPDF
          throw new Error('PDF export not yet implemented');
      }

      // Create and trigger download
      const blob = new Blob([exportData], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Reporte exportado",
        description: `El reporte se ha exportado como ${format.toUpperCase()}`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error exporting report';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  // Helper function to convert data to CSV
  const convertToCSV = (data: any): string => {
    if (!data || typeof data !== 'object') return '';

    // Simple CSV conversion - could be enhanced
    const headers = Object.keys(data);
    const csvContent = headers.join(',') + '\n' + Object.values(data).join(',');
    return csvContent;
  };

  useEffect(() => {
    fetchTemplates();
    fetchReports();
    fetchMetrics();
    fetchKpiTargets();
    fetchWidgets();
  }, []);

  return {
    templates,
    reports,
    metrics,
    kpiTargets,
    widgets,
    loading,
    error,
    fetchTemplates,
    fetchReports,
    fetchMetrics,
    fetchKpiTargets,
    fetchWidgets,
    generateReport,
    getBusinessIntelligence,
    createKpiTarget,
    updateWidget,
    exportReport,
  };
};