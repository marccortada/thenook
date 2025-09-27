import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useInternalCodes } from '@/hooks/useInternalCodes';
import { supabase } from '@/integrations/supabase/client';

export interface ReportData {
  id: string;
  name: string;
  description: string;
  type: 'bookings' | 'revenue' | 'clients' | 'services' | 'employees' | 'codes' | 'client_codes' | 'employee_codes';
  data: any[];
  generatedAt: string;
  filters: Record<string, any>;
}

export interface CodeAnalytics {
  totalCodes: number;
  mostUsedCodes: { code: string; name: string; usageCount: number; category: string }[];
  codesByCategory: { category: string; count: number }[];
  recentAssignments: { code: string; entity: string; assignedAt: string }[];
  criticalAlerts: { type: string; message: string; code?: string }[];
}

export const useAdvancedReports = () => {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [codeAnalytics, setCodeAnalytics] = useState<CodeAnalytics | null>(null);
  const { toast } = useToast();
  const { codes, assignments, refetchCodes, refetchAssignments } = useInternalCodes();

  const generateReport = async (type: string, filters: any, name: string, description: string) => {
    setLoading(true);
    try {
      let data: any[] = [];
      
      // Generate actual data based on report type
      switch (type) {
        case 'codes':
          data = await generateCodesReport(filters);
          break;
        case 'client_codes':
          data = await generateClientCodesReport(filters);
          break;
        case 'employee_codes':
          data = await generateEmployeeCodesReport(filters);
          break;
        case 'bookings':
          data = await generateBookingsWithCodesReport(filters);
          break;
        default:
          data = await generateMockData(type, filters);
      }

      const newReport: ReportData = {
        id: Math.random().toString(),
        name,
        description,
        type: type as any,
        data,
        generatedAt: new Date().toISOString(),
        filters
      };
      setReports(prev => [newReport, ...prev]);
      toast({ title: "Reporte generado exitosamente" });
    } catch (error) {
      toast({ title: "Error al generar reporte", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (template: any) => {
    setLoading(true);
    try {
      const newTemplate = { ...template, id: Math.random().toString() };
      setTemplates(prev => [newTemplate, ...prev]);
      toast({ title: "Plantilla creada exitosamente" });
    } catch (error) {
      toast({ title: "Error al crear plantilla", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const executeCustomQuery = async (config: any) => {
    // Mock implementation
    return [];
  };

  // Code-specific report generators
  const generateCodesReport = async (filters: any) => {
    const codesData = codes.map(code => ({
      id: code.id,
      code: code.code,
      name: code.name,
      category: code.category,
      color: code.color,
      description: code.description,
      createdAt: code.created_at,
      usageCount: assignments.filter(a => a.code_id === code.id).length,
      lastUsed: assignments
        .filter(a => a.code_id === code.id)
        .sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime())[0]?.assigned_at || null
    }));
    
    return codesData;
  };

  const generateClientCodesReport = async (filters: any) => {
    const { data: clientsWithCodes } = await supabase
      .from('profiles')
      .select(`
        id, first_name, last_name, email,
        code_assignments!inner(
          id, assigned_at, notes,
          internal_codes(code, name, category, color)
        )
      `)
      .eq('code_assignments.entity_type', 'client');

    return clientsWithCodes?.map(client => ({
      clientId: client.id,
      clientName: `${client.first_name} ${client.last_name}`,
      email: client.email,
      codes: client.code_assignments.map((assignment: any) => ({
        code: assignment.internal_codes.code,
        name: assignment.internal_codes.name,
        category: assignment.internal_codes.category,
        assignedAt: assignment.assigned_at,
        notes: assignment.notes
      }))
    })) || [];
  };

  const generateEmployeeCodesReport = async (filters: any) => {
    const { data: employeesWithCodes } = await supabase
      .from('employees')
      .select(`
        id, employee_codes,
        profiles(first_name, last_name, email)
      `);

    return employeesWithCodes?.map(employee => ({
      employeeId: employee.id,
      employeeName: `${employee.profiles?.first_name} ${employee.profiles?.last_name}`,
      email: employee.profiles?.email,
      codes: employee.employee_codes || [],
      codesCount: (employee.employee_codes || []).length
    })) || [];
  };

  const generateBookingsWithCodesReport = async (filters: any) => {
    const { data: bookingsWithCodes } = await supabase
      .from('bookings')
      .select(`
        id, booking_datetime, status, total_price_cents, booking_codes,
        profiles(first_name, last_name),
        services(name),
        centers(name)
      `)
      .gte('booking_datetime', filters.startDate || '2024-01-01')
      .lte('booking_datetime', filters.endDate || '2024-12-31');

    return bookingsWithCodes?.map(booking => ({
      bookingId: booking.id,
      date: booking.booking_datetime,
      clientName: `${booking.profiles?.first_name} ${booking.profiles?.last_name}`,
      service: booking.services?.name,
      center: booking.centers?.name,
      status: booking.status,
      totalPrice: booking.total_price_cents / 100,
      codes: booking.booking_codes || [],
      codesCount: (booking.booking_codes || []).length
    })) || [];
  };

  const generateMockData = async (type: string, filters: any) => {
    // Mock data for other report types
    return Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
      value: Math.floor(Math.random() * 1000),
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    }));
  };

  const generateCodeAnalytics = async (): Promise<CodeAnalytics> => {
    const totalCodes = codes.length;
    
    const codeUsageMap = new Map();
    assignments.forEach(assignment => {
      const code = codes.find(c => c.id === assignment.code_id);
      if (code) {
        const key = code.code;
        codeUsageMap.set(key, {
          code: code.code,
          name: code.name,
          category: code.category,
          usageCount: (codeUsageMap.get(key)?.usageCount || 0) + 1
        });
      }
    });

    const mostUsedCodes = Array.from(codeUsageMap.values())
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5);

    const categoryMap = new Map();
    codes.forEach(code => {
      categoryMap.set(code.category, (categoryMap.get(code.category) || 0) + 1);
    });

    const codesByCategory = Array.from(categoryMap.entries()).map(([category, count]) => ({
      category,
      count
    }));

    const recentAssignments = assignments
      .sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime())
      .slice(0, 10)
      .map(assignment => {
        const code = codes.find(c => c.id === assignment.code_id);
        return {
          code: code?.code || 'Unknown',
          entity: `${assignment.entity_type}: ${assignment.entity_id}`,
          assignedAt: assignment.assigned_at
        };
      });

    const criticalAlerts = [
      { type: 'warning', message: `${codes.filter(c => c.category === 'promocion').length} códigos de promoción activos` },
      { type: 'info', message: `${totalCodes} códigos totales en el sistema` }
    ];

    return {
      totalCodes,
      mostUsedCodes,
      codesByCategory,
      recentAssignments,
      criticalAlerts
    };
  };

  const loadCodeAnalytics = async () => {
    setLoading(true);
    try {
      const analytics = await generateCodeAnalytics();
      setCodeAnalytics(analytics);
    } catch (error) {
      toast({ title: "Error al cargar análisis de códigos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = (report: ReportData, format: 'json' | 'csv' = 'json') => {
    if (format === 'csv') {
      exportToCSV(report);
    } else {
      const dataStr = JSON.stringify(report.data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${report.name}.json`;
      link.click();
    }
  };

  const exportToCSV = (report: ReportData) => {
    if (report.data.length === 0) return;
    
    const headers = Object.keys(report.data[0]);
    const csvContent = [
      headers.join(','),
      ...report.data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (Array.isArray(value)) return `"${value.join(';')}"`;
          if (typeof value === 'object') return `"${JSON.stringify(value)}"`;
          return `"${value || ''}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.name}.csv`;
    link.click();
  };

  return {
    reports,
    templates,
    loading,
    codeAnalytics,
    generateReport,
    createTemplate,
    executeCustomQuery,
    exportReport,
    loadCodeAnalytics,
    generateCodeAnalytics
  };
};