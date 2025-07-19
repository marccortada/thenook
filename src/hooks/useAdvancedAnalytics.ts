import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface KPIMetrics {
  totalBookings: number;
  totalRevenue: number;
  averageTicket: number;
  conversionRate: number;
  attendanceRate: number;
  noShowRate: number;
  newClients: number;
  recurringClients: number;
  occupancyRate: number;
  revenuePerTherapist: number;
}

export interface PeriodComparison {
  current: KPIMetrics;
  previous: KPIMetrics;
  growth: {
    totalBookings: number;
    totalRevenue: number;
    averageTicket: number;
    conversionRate: number;
    attendanceRate: number;
  };
}

export interface TherapistMetrics {
  therapistId: string;
  therapistName: string;
  totalBookings: number;
  totalRevenue: number;
  averageTicket: number;
  attendanceRate: number;
  occupancyRate: number;
  clientSatisfaction: number;
}

export interface ServiceMetrics {
  serviceId: string;
  serviceName: string;
  totalBookings: number;
  totalRevenue: number;
  averagePrice: number;
  popularityRank: number;
  growthRate: number;
}

export interface TimeSeriesData {
  date: string;
  bookings: number;
  revenue: number;
  newClients: number;
}

export interface CenterMetrics {
  centerId: string;
  centerName: string;
  totalBookings: number;
  totalRevenue: number;
  occupancyRate: number;
  therapistCount: number;
}

type PeriodType = 'today' | 'week' | 'month' | 'quarter' | 'year';

export const useAdvancedAnalytics = () => {
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetrics | null>(null);
  const [periodComparison, setPeriodComparison] = useState<PeriodComparison | null>(null);
  const [therapistMetrics, setTherapistMetrics] = useState<TherapistMetrics[]>([]);
  const [serviceMetrics, setServiceMetrics] = useState<ServiceMetrics[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [centerMetrics, setCenterMetrics] = useState<CenterMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const getDateRange = (period: PeriodType) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (period) {
      case 'today':
        return {
          start: startOfToday,
          end: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1)
        };
      case 'week':
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
        return {
          start: startOfWeek,
          end: new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1)
        };
      case 'month':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        };
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        return {
          start: new Date(now.getFullYear(), quarter * 3, 1),
          end: new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59)
        };
      case 'year':
        return {
          start: new Date(now.getFullYear(), 0, 1),
          end: new Date(now.getFullYear(), 11, 31, 23, 59, 59)
        };
      default:
        return { start: startOfToday, end: now };
    }
  };

  const getPreviousDateRange = (period: PeriodType) => {
    const current = getDateRange(period);
    const duration = current.end.getTime() - current.start.getTime();
    
    return {
      start: new Date(current.start.getTime() - duration),
      end: new Date(current.end.getTime() - duration)
    };
  };

  const calculateKPIMetrics = async (startDate: Date, endDate: Date): Promise<KPIMetrics> => {
    try {
      // Obtener reservas del período
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          *,
          profiles!inner(id, email, created_at),
          services!inner(name, price_cents, type)
        `)
        .gte('booking_datetime', startDate.toISOString())
        .lte('booking_datetime', endDate.toISOString());

      const totalBookings = bookings?.length || 0;
      const totalRevenue = bookings?.reduce((sum, booking) => 
        sum + (booking.total_price_cents / 100), 0) || 0;
      
      const averageTicket = totalBookings > 0 ? totalRevenue / totalBookings : 0;
      
      // Calcular nuevos vs recurrentes
      const clientEmails = Array.from(new Set(bookings?.map(b => b.profiles.email) || []));
      const newClients = await Promise.all(
        clientEmails.map(async (email) => {
          const { data: previousBookings } = await supabase
            .from('bookings')
            .select('id')
            .eq('client_id', bookings?.find(b => b.profiles.email === email)?.client_id)
            .lt('booking_datetime', startDate.toISOString())
            .limit(1);
          
          return previousBookings?.length === 0;
        })
      );

      const newClientCount = newClients.filter(Boolean).length;
      const recurringClients = clientEmails.length - newClientCount;

      // Calcular tasas
      const confirmedBookings = bookings?.filter(b => 
        b.status === 'confirmed' || b.status === 'completed') || [];
      const cancelledBookings = bookings?.filter(b => 
        b.status === 'cancelled' || b.status === 'no_show') || [];
      const noShowBookings = bookings?.filter(b => b.status === 'no_show') || [];

      const conversionRate = totalBookings > 0 ? 
        (confirmedBookings.length / totalBookings) * 100 : 0;
      const attendanceRate = totalBookings > 0 ? 
        ((totalBookings - noShowBookings.length) / totalBookings) * 100 : 0;
      const noShowRate = totalBookings > 0 ? 
        (noShowBookings.length / totalBookings) * 100 : 0;

      // Calcular ocupación (simplificado)
      const { data: totalSlots } = await supabase
        .from('lanes')
        .select('id, center_id');
      
      const workingHours = 10; // 10 horas por día promedio
      const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const totalPossibleSlots = (totalSlots?.length || 1) * workingHours * daysInPeriod;
      const occupancyRate = totalPossibleSlots > 0 ? 
        (totalBookings / totalPossibleSlots) * 100 : 0;

      // Revenue per therapist
      const { data: therapists } = await supabase
        .from('employees')
        .select('id')
        .eq('active', true);
      
      const revenuePerTherapist = (therapists?.length || 1) > 0 ? 
        totalRevenue / (therapists?.length || 1) : 0;

      return {
        totalBookings,
        totalRevenue,
        averageTicket,
        conversionRate,
        attendanceRate,
        noShowRate,
        newClients: newClientCount,
        recurringClients,
        occupancyRate,
        revenuePerTherapist
      };
    } catch (error) {
      console.error('Error calculating KPI metrics:', error);
      return {
        totalBookings: 0,
        totalRevenue: 0,
        averageTicket: 0,
        conversionRate: 0,
        attendanceRate: 0,
        noShowRate: 0,
        newClients: 0,
        recurringClients: 0,
        occupancyRate: 0,
        revenuePerTherapist: 0
      };
    }
  };

  const fetchTherapistMetrics = async (startDate: Date, endDate: Date) => {
    try {
      const { data: therapists } = await supabase
        .from('employees')
        .select(`
          id,
          profiles!inner(first_name, last_name)
        `)
        .eq('active', true);

      if (!therapists) return [];

      const metrics = await Promise.all(
        therapists.map(async (therapist) => {
          const { data: bookings } = await supabase
            .from('bookings')
            .select('*, services!inner(price_cents)')
            .eq('employee_id', therapist.id)
            .gte('booking_datetime', startDate.toISOString())
            .lte('booking_datetime', endDate.toISOString());

          const totalBookings = bookings?.length || 0;
          const totalRevenue = bookings?.reduce((sum, booking) => 
            sum + (booking.total_price_cents / 100), 0) || 0;
          const averageTicket = totalBookings > 0 ? totalRevenue / totalBookings : 0;

          const confirmedBookings = bookings?.filter(b => 
            b.status === 'confirmed' || b.status === 'completed') || [];
          const attendanceRate = totalBookings > 0 ? 
            (confirmedBookings.length / totalBookings) * 100 : 0;

          return {
            therapistId: therapist.id,
            therapistName: `${therapist.profiles.first_name} ${therapist.profiles.last_name}`,
            totalBookings,
            totalRevenue,
            averageTicket,
            attendanceRate,
            occupancyRate: 0, // Simplificado por ahora
            clientSatisfaction: 85 + Math.random() * 15 // Mock data por ahora
          };
        })
      );

      return metrics;
    } catch (error) {
      console.error('Error fetching therapist metrics:', error);
      return [];
    }
  };

  const fetchServiceMetrics = async (startDate: Date, endDate: Date) => {
    try {
      const { data: services } = await supabase
        .from('services')
        .select('*')
        .eq('active', true);

      if (!services) return [];

      const metrics = await Promise.all(
        services.map(async (service, index) => {
          const { data: bookings } = await supabase
            .from('bookings')
            .select('total_price_cents')
            .eq('service_id', service.id)
            .gte('booking_datetime', startDate.toISOString())
            .lte('booking_datetime', endDate.toISOString());

          const totalBookings = bookings?.length || 0;
          const totalRevenue = bookings?.reduce((sum, booking) => 
            sum + (booking.total_price_cents / 100), 0) || 0;
          const averagePrice = service.price_cents / 100;

          return {
            serviceId: service.id,
            serviceName: service.name,
            totalBookings,
            totalRevenue,
            averagePrice,
            popularityRank: index + 1,
            growthRate: Math.random() * 40 - 20 // Mock data por ahora
          };
        })
      );

      // Ordenar por popularidad
      return metrics.sort((a, b) => b.totalBookings - a.totalBookings)
        .map((metric, index) => ({ ...metric, popularityRank: index + 1 }));
    } catch (error) {
      console.error('Error fetching service metrics:', error);
      return [];
    }
  };

  const fetchTimeSeriesData = async (startDate: Date, endDate: Date) => {
    try {
      const days = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const dayStart = new Date(currentDate);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);

        const { data: dayBookings } = await supabase
          .from('bookings')
          .select(`
            total_price_cents,
            profiles!inner(created_at)
          `)
          .gte('booking_datetime', dayStart.toISOString())
          .lte('booking_datetime', dayEnd.toISOString());

        const bookings = dayBookings?.length || 0;
        const revenue = dayBookings?.reduce((sum, booking) => 
          sum + (booking.total_price_cents / 100), 0) || 0;

        // Contar nuevos clientes del día
        const newClients = dayBookings?.filter(booking => {
          const createdDate = new Date(booking.profiles.created_at);
          return createdDate >= dayStart && createdDate <= dayEnd;
        }).length || 0;

        days.push({
          date: currentDate.toISOString().split('T')[0],
          bookings,
          revenue,
          newClients
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return days;
    } catch (error) {
      console.error('Error fetching time series data:', error);
      return [];
    }
  };

  const fetchCenterMetrics = async (startDate: Date, endDate: Date) => {
    try {
      const { data: centers } = await supabase
        .from('centers')
        .select('*')
        .eq('active', true);

      if (!centers) return [];

      const metrics = await Promise.all(
        centers.map(async (center) => {
          const { data: bookings } = await supabase
            .from('bookings')
            .select('total_price_cents')
            .eq('center_id', center.id)
            .gte('booking_datetime', startDate.toISOString())
            .lte('booking_datetime', endDate.toISOString());

          const { data: therapists } = await supabase
            .from('employees')
            .select('id')
            .eq('center_id', center.id)
            .eq('active', true);

          const totalBookings = bookings?.length || 0;
          const totalRevenue = bookings?.reduce((sum, booking) => 
            sum + (booking.total_price_cents / 100), 0) || 0;

          return {
            centerId: center.id,
            centerName: center.name,
            totalBookings,
            totalRevenue,
            occupancyRate: Math.random() * 40 + 40, // Mock por ahora
            therapistCount: therapists?.length || 0
          };
        })
      );

      return metrics;
    } catch (error) {
      console.error('Error fetching center metrics:', error);
      return [];
    }
  };

  const loadAnalytics = async (period: PeriodType = 'month') => {
    setLoading(true);
    try {
      const currentRange = getDateRange(period);
      const previousRange = getPreviousDateRange(period);

      // Cargar métricas del período actual y anterior
      const [currentMetrics, previousMetrics] = await Promise.all([
        calculateKPIMetrics(currentRange.start, currentRange.end),
        calculateKPIMetrics(previousRange.start, previousRange.end)
      ]);

      setKpiMetrics(currentMetrics);

      // Calcular crecimiento
      const growth = {
        totalBookings: previousMetrics.totalBookings > 0 ? 
          ((currentMetrics.totalBookings - previousMetrics.totalBookings) / previousMetrics.totalBookings) * 100 : 0,
        totalRevenue: previousMetrics.totalRevenue > 0 ? 
          ((currentMetrics.totalRevenue - previousMetrics.totalRevenue) / previousMetrics.totalRevenue) * 100 : 0,
        averageTicket: previousMetrics.averageTicket > 0 ? 
          ((currentMetrics.averageTicket - previousMetrics.averageTicket) / previousMetrics.averageTicket) * 100 : 0,
        conversionRate: currentMetrics.conversionRate - previousMetrics.conversionRate,
        attendanceRate: currentMetrics.attendanceRate - previousMetrics.attendanceRate
      };

      setPeriodComparison({
        current: currentMetrics,
        previous: previousMetrics,
        growth
      });

      // Cargar otras métricas
      const [therapists, services, timeSeries, centers] = await Promise.all([
        fetchTherapistMetrics(currentRange.start, currentRange.end),
        fetchServiceMetrics(currentRange.start, currentRange.end),
        fetchTimeSeriesData(currentRange.start, currentRange.end),
        fetchCenterMetrics(currentRange.start, currentRange.end)
      ]);

      setTherapistMetrics(therapists);
      setServiceMetrics(services);
      setTimeSeriesData(timeSeries);
      setCenterMetrics(centers);

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las métricas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  return {
    kpiMetrics,
    periodComparison,
    therapistMetrics,
    serviceMetrics,
    timeSeriesData,
    centerMetrics,
    loading,
    loadAnalytics
  };
};