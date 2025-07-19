import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ReportData {
  id: string;
  name: string;
  description: string;
  type: 'bookings' | 'revenue' | 'clients' | 'services' | 'employees';
  data: any[];
  generatedAt: string;
  filters: Record<string, any>;
}

export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  centerId?: string;
  serviceId?: string;
  status?: string;
  employeeId?: string;
  customConfig?: any;
}

export const useReports = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Generar reporte de reservas
  const generateBookingsReport = async (filters: ReportFilter): Promise<any[]> => {
    let query = supabase
      .from('bookings')
      .select(`
        *,
        profiles!inner(first_name, last_name, email),
        services!inner(name, price_cents),
        centers!inner(name),
        employees(profiles!inner(first_name, last_name))
      `);

    if (filters.startDate) {
      query = query.gte('booking_datetime', `${filters.startDate}T00:00:00`);
    }
    if (filters.endDate) {
      query = query.lte('booking_datetime', `${filters.endDate}T23:59:59`);
    }
    if (filters.centerId) {
      query = query.eq('center_id', filters.centerId);
    }
    if (filters.serviceId) {
      query = query.eq('service_id', filters.serviceId);
    }
    if (filters.status && ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'].includes(filters.status)) {
      query = query.eq('status', filters.status as any);
    }
    if (filters.employeeId) {
      query = query.eq('employee_id', filters.employeeId);
    }

    const { data, error } = await query.order('booking_datetime', { ascending: false });
    
    if (error) throw error;

    return data?.map(booking => ({
      id: booking.id,
      fecha: new Date(booking.booking_datetime).toLocaleDateString('es-ES'),
      hora: new Date(booking.booking_datetime).toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      cliente: `${booking.profiles?.first_name || ''} ${booking.profiles?.last_name || ''}`.trim(),
      email_cliente: booking.profiles?.email,
      servicio: booking.services?.name,
      centro: booking.centers?.name,
      empleado: booking.employees?.profiles ? 
        `${booking.employees.profiles.first_name} ${booking.employees.profiles.last_name}` : 'Sin asignar',
      duracion_minutos: booking.duration_minutes,
      precio_euros: (booking.total_price_cents || 0) / 100,
      estado: booking.status,
      canal: booking.channel,
      estado_pago: booking.payment_status,
      notas: booking.notes || '',
    })) || [];
  };

  // Generar reporte de ingresos
  const generateRevenueReport = async (filters: ReportFilter): Promise<any[]> => {
    let query = supabase
      .from('bookings')
      .select(`
        booking_datetime,
        total_price_cents,
        status,
        payment_status,
        services!inner(name),
        centers!inner(name)
      `)
      .eq('status', 'confirmed');

    if (filters.startDate) {
      query = query.gte('booking_datetime', `${filters.startDate}T00:00:00`);
    }
    if (filters.endDate) {
      query = query.lte('booking_datetime', `${filters.endDate}T23:59:59`);
    }
    if (filters.centerId) {
      query = query.eq('center_id', filters.centerId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Agrupar por día
    const dailyRevenue = new Map();
    data?.forEach(booking => {
      const date = new Date(booking.booking_datetime).toISOString().split('T')[0];
      const revenue = (booking.total_price_cents || 0) / 100;
      
      if (dailyRevenue.has(date)) {
        const existing = dailyRevenue.get(date);
        dailyRevenue.set(date, {
          ...existing,
          ingresos_total: existing.ingresos_total + revenue,
          reservas_count: existing.reservas_count + 1,
        });
      } else {
        dailyRevenue.set(date, {
          fecha: new Date(date).toLocaleDateString('es-ES'),
          ingresos_total: revenue,
          reservas_count: 1,
          centro: booking.centers?.name || 'Sin centro',
        });
      }
    });

    return Array.from(dailyRevenue.values())
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  };

  // Generar reporte de clientes
  const generateClientsReport = async (filters: ReportFilter): Promise<any[]> => {
    let query = supabase
      .from('profiles')
      .select(`
        *,
        bookings(
          id,
          booking_datetime,
          total_price_cents,
          status
        )
      `)
      .neq('role', 'admin')
      .neq('role', 'employee');

    const { data, error } = await query;
    if (error) throw error;

    return data?.map(profile => {
      const bookings = profile.bookings || [];
      const confirmedBookings = bookings.filter((b: any) => b.status === 'confirmed');
      const totalSpent = confirmedBookings.reduce((sum: number, b: any) => 
        sum + ((b.total_price_cents || 0) / 100), 0);
      
      const lastBooking = bookings.length > 0 ? 
        new Date(Math.max(...bookings.map((b: any) => new Date(b.booking_datetime).getTime()))) : null;

      return {
        id: profile.id,
        nombre: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        email: profile.email,
        telefono: profile.phone || 'Sin teléfono',
        fecha_registro: new Date(profile.created_at).toLocaleDateString('es-ES'),
        total_reservas: bookings.length,
        reservas_confirmadas: confirmedBookings.length,
        gasto_total_euros: totalSpent,
        gasto_promedio_euros: confirmedBookings.length > 0 ? totalSpent / confirmedBookings.length : 0,
        ultima_reserva: lastBooking ? lastBooking.toLocaleDateString('es-ES') : 'Nunca',
        dias_desde_ultima_reserva: lastBooking ? 
          Math.floor((new Date().getTime() - lastBooking.getTime()) / (1000 * 60 * 60 * 24)) : null,
      };
    }).sort((a, b) => b.gasto_total_euros - a.gasto_total_euros) || [];
  };

  // Generar reporte de servicios
  const generateServicesReport = async (filters: ReportFilter): Promise<any[]> => {
    let bookingsQuery = supabase
      .from('bookings')
      .select(`
        service_id,
        total_price_cents,
        duration_minutes,
        status,
        booking_datetime,
        services!inner(name, price_cents)
      `)
      .eq('status', 'confirmed');

    if (filters.startDate) {
      bookingsQuery = bookingsQuery.gte('booking_datetime', `${filters.startDate}T00:00:00`);
    }
    if (filters.endDate) {
      bookingsQuery = bookingsQuery.lte('booking_datetime', `${filters.endDate}T23:59:59`);
    }

    const { data: bookings, error } = await bookingsQuery;
    if (error) throw error;

    // Agrupar por servicio
    const serviceStats = new Map();
    bookings?.forEach(booking => {
      const serviceId = booking.service_id;
      const serviceName = booking.services?.name || 'Servicio desconocido';
      const revenue = (booking.total_price_cents || 0) / 100;
      const duration = booking.duration_minutes || 0;

      if (serviceStats.has(serviceId)) {
        const existing = serviceStats.get(serviceId);
        serviceStats.set(serviceId, {
          ...existing,
          total_reservas: existing.total_reservas + 1,
          ingresos_total: existing.ingresos_total + revenue,
          tiempo_total_minutos: existing.tiempo_total_minutos + duration,
        });
      } else {
        serviceStats.set(serviceId, {
          servicio: serviceName,
          total_reservas: 1,
          ingresos_total: revenue,
          precio_base_euros: (booking.services?.price_cents || 0) / 100,
          tiempo_total_minutos: duration,
          duracion_promedio_minutos: duration,
        });
      }
    });

    return Array.from(serviceStats.values())
      .map(stat => ({
        ...stat,
        ingreso_promedio_euros: stat.total_reservas > 0 ? stat.ingresos_total / stat.total_reservas : 0,
        duracion_promedio_minutos: stat.total_reservas > 0 ? stat.tiempo_total_minutos / stat.total_reservas : 0,
        popularidad_porcentaje: 0, // Se calculará después
      }))
      .sort((a, b) => b.total_reservas - a.total_reservas);
  };

  // Función principal para generar reporte
  const generateReport = async (
    type: ReportData['type'],
    filters: ReportFilter,
    name: string,
    description: string
  ): Promise<ReportData> => {
    setLoading(true);
    try {
      let data: any[] = [];

      switch (type) {
        case 'bookings':
          data = await generateBookingsReport(filters);
          break;
        case 'revenue':
          data = await generateRevenueReport(filters);
          break;
        case 'clients':
          data = await generateClientsReport(filters);
          break;
        case 'services':
          data = await generateServicesReport(filters);
          break;
        default:
          throw new Error(`Tipo de reporte no soportado: ${type}`);
      }

      const report: ReportData = {
        id: `report-${Date.now()}`,
        name,
        description,
        type,
        data,
        generatedAt: new Date().toISOString(),
        filters,
      };

      toast({
        title: "Reporte Generado",
        description: `Se generó el reporte "${name}" con ${data.length} registros`,
      });

      return report;
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el reporte",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Generar reporte personalizado
  const generateCustomReport = async (config: any): Promise<ReportData> => {
    setLoading(true);
    try {
      const data = await executeCustomQuery(config);
      
      const reportData: ReportData = {
        id: `custom-${Date.now()}`,
        name: config.name,
        description: config.description || '',
        type: 'bookings', // Default type for custom reports
        data: data,
        generatedAt: new Date().toISOString(),
        filters: config.filters || {},
      };

      toast({
        title: "Reporte generado",
        description: `Reporte "${config.name}" generado exitosamente con ${data.length} registros`,
      });

      return reportData;
    } catch (error) {
      console.error('Error generating custom report:', error);
      toast({
        title: "Error",
        description: "Error al generar el reporte personalizado",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const executeCustomQuery = async (config: any): Promise<any[]> => {
    try {
      // Simple query to avoid type recursion issues
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          profiles!inner(id, first_name, last_name, email, phone, role),
          services!inner(id, name, type, price_cents, duration_minutes),
          centers!inner(id, name, address),
          employees(id, profile_id, profiles!inner(first_name, last_name))
        `)
        .order('booking_datetime', { ascending: false })
        .limit(1000);

      if (error) throw error;

      // Transform data to match selected fields
      return data?.map(row => transformRowData(row, config.selectedFields || [])) || [];
      
    } catch (error) {
      console.error('Error executing custom query:', error);
      throw error;
    }
  };

  const getFieldDefinition = (fieldId: string) => {
    const fieldMap: Record<string, { table: string; column: string; }> = {
      'booking_datetime': { table: 'bookings', column: 'booking_datetime' },
      'booking_status': { table: 'bookings', column: 'status' },
      'booking_duration': { table: 'bookings', column: 'duration_minutes' },
      'booking_price': { table: 'bookings', column: 'total_price_cents' },
      'booking_payment_status': { table: 'bookings', column: 'payment_status' },
      'booking_channel': { table: 'bookings', column: 'channel' },
      'booking_notes': { table: 'bookings', column: 'notes' },
      'client_name': { table: 'profiles', column: 'first_name,last_name' },
      'client_email': { table: 'profiles', column: 'email' },
      'client_phone': { table: 'profiles', column: 'phone' },
      'client_role': { table: 'profiles', column: 'role' },
      'service_name': { table: 'services', column: 'name' },
      'service_type': { table: 'services', column: 'type' },
      'service_price': { table: 'services', column: 'price_cents' },
      'service_duration': { table: 'services', column: 'duration_minutes' },
      'center_name': { table: 'centers', column: 'name' },
      'center_address': { table: 'centers', column: 'address' },
      'employee_name': { table: 'employees', column: 'first_name,last_name' },
    };
    
    return fieldMap[fieldId];
  };

  const getColumnPath = (fieldId: string): string => {
    // Map field IDs to their Supabase query paths
    const pathMap: Record<string, string> = {
      'booking_datetime': 'booking_datetime',
      'booking_status': 'status',
      'booking_duration': 'duration_minutes',
      'booking_price': 'total_price_cents',
      'booking_payment_status': 'payment_status',
      'booking_channel': 'channel',
      'booking_notes': 'notes',
      'client_email': 'profiles.email',
      'client_phone': 'profiles.phone',
      'client_role': 'profiles.role',
      'service_name': 'services.name',
      'service_type': 'services.type',
      'service_price': 'services.price_cents',
      'service_duration': 'services.duration_minutes',
      'center_name': 'centers.name',
      'center_address': 'centers.address',
    };
    
    return pathMap[fieldId] || fieldId;
  };

  const transformRowData = (row: any, selectedFields: string[]): Record<string, any> => {
    const transformed: Record<string, any> = {};
    
    selectedFields.forEach(fieldId => {
      const fieldValue = getTransformedValue(row, fieldId);
      const fieldLabel = getFieldLabel(fieldId);
      transformed[fieldLabel] = fieldValue;
    });
    
    return transformed;
  };

  const getFieldLabel = (fieldId: string): string => {
    const labelMap: Record<string, string> = {
      'booking_datetime': 'Fecha y Hora',
      'booking_status': 'Estado',
      'booking_duration': 'Duración (min)',
      'booking_price': 'Precio Total',
      'booking_payment_status': 'Estado de Pago',
      'booking_channel': 'Canal de Reserva',
      'booking_notes': 'Notas',
      'client_name': 'Nombre del Cliente',
      'client_email': 'Email del Cliente',
      'client_phone': 'Teléfono del Cliente',
      'client_role': 'Tipo de Cliente',
      'service_name': 'Nombre del Servicio',
      'service_type': 'Tipo de Servicio',
      'service_price': 'Precio del Servicio',
      'service_duration': 'Duración del Servicio',
      'center_name': 'Nombre del Centro',
      'center_address': 'Dirección del Centro',
      'employee_name': 'Nombre del Empleado',
    };
    return labelMap[fieldId] || fieldId;
  };

  const getTransformedValue = (row: any, fieldId: string): any => {
    switch (fieldId) {
      case 'booking_datetime':
        return new Date(row.booking_datetime).toLocaleString('es-ES');
      case 'booking_status':
        return row.status;
      case 'booking_duration':
        return row.duration_minutes;
      case 'booking_price':
        return (row.total_price_cents / 100).toFixed(2) + '€';
      case 'booking_payment_status':
        return row.payment_status;
      case 'booking_channel':
        return row.channel;
      case 'booking_notes':
        return row.notes || '';
      case 'client_name':
        return `${row.profiles?.first_name || ''} ${row.profiles?.last_name || ''}`.trim();
      case 'client_email':
        return row.profiles?.email || '';
      case 'client_phone':
        return row.profiles?.phone || '';
      case 'client_role':
        return row.profiles?.role || '';
      case 'service_name':
        return row.services?.name || '';
      case 'service_type':
        return row.services?.type || '';
      case 'service_price':
        return row.services ? (row.services.price_cents / 100).toFixed(2) + '€' : '';
      case 'service_duration':
        return row.services?.duration_minutes ? `${row.services.duration_minutes} min` : '';
      case 'center_name':
        return row.centers?.name || '';
      case 'center_address':
        return row.centers?.address || '';
      case 'employee_name':
        const employee = row.employees?.profiles;
        return employee ? `${employee.first_name || ''} ${employee.last_name || ''}`.trim() : '';
      default:
        return row[fieldId] || '';
    }
  };

  // Exportar a CSV
  const exportToCSV = (report: ReportData): void => {
    if (!report.data || report.data.length === 0) {
      toast({
        title: "Sin Datos",
        description: "No hay datos para exportar",
        variant: "destructive",
      });
      return;
    }

    const headers = Object.keys(report.data[0]);
    const csvContent = [
      headers.join(','),
      ...report.data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${report.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Exportación Exitosa",
      description: "El reporte se ha descargado como archivo CSV",
    });
  };

  return {
    generateReport,
    generateCustomReport,
    exportToCSV,
    loading
  };
};