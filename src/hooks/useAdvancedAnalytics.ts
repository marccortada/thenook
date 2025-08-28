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

type PeriodType = 'today' | 'yesterday' | 'week' | 'lastWeek' | 'month' | 'lastMonth' | 'quarter' | 'lastQuarter' | 'year' | 'lastYear';

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
    
    switch (period) {
      case 'today':
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        return { start: today, end: todayEnd };
        
      case 'yesterday':
        const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setHours(23, 59, 59, 999);
        return { start: yesterday, end: yesterdayEnd };
        
      case 'week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return { start: startOfWeek, end: endOfWeek };
        
      case 'lastWeek':
        const lastWeekStart = new Date(now);
        lastWeekStart.setDate(now.getDate() - now.getDay() - 7);
        lastWeekStart.setHours(0, 0, 0, 0);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        lastWeekEnd.setHours(23, 59, 59, 999);
        return { start: lastWeekStart, end: lastWeekEnd };
        
      case 'month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start: startOfMonth, end: endOfMonth };
        
      case 'lastMonth':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return { start: lastMonthStart, end: lastMonthEnd };
        
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
        const quarterEnd = new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
        return { start: quarterStart, end: quarterEnd };
        
      case 'lastQuarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
        const lastQuarterYear = currentQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const lastQuarterStart = new Date(lastQuarterYear, lastQuarter * 3, 1);
        const lastQuarterEnd = new Date(lastQuarterYear, lastQuarter * 3 + 3, 0, 23, 59, 59, 999);
        return { start: lastQuarterStart, end: lastQuarterEnd };
        
      case 'year':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        return { start: yearStart, end: yearEnd };
        
      case 'lastYear':
        const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        return { start: lastYearStart, end: lastYearEnd };
        
      default:
        const defaultStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const defaultEnd = new Date(defaultStart);
        defaultEnd.setHours(23, 59, 59, 999);
        return { start: defaultStart, end: defaultEnd };
    }
  };

  const getPreviousDateRange = (period: PeriodType) => {
    const now = new Date();
    
    switch (period) {
      case 'today':
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        return {
          start: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()),
          end: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59)
        };
      case 'week':
        const lastWeekStart = new Date(now);
        lastWeekStart.setDate(now.getDate() - now.getDay() - 7);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        lastWeekEnd.setHours(23, 59, 59);
        return { start: lastWeekStart, end: lastWeekEnd };
      case 'month':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        return { start: lastMonth, end: lastMonthEnd };
      case 'quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
        const lastQuarterYear = currentQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const lastQuarterStart = new Date(lastQuarterYear, lastQuarter * 3, 1);
        const lastQuarterEnd = new Date(lastQuarterYear, lastQuarter * 3 + 3, 0, 23, 59, 59);
        return { start: lastQuarterStart, end: lastQuarterEnd };
      case 'year':
        const lastYear = new Date(now.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
        return { start: lastYear, end: lastYearEnd };
      default:
        const current = getDateRange(period);
        const duration = current.end.getTime() - current.start.getTime();
        return {
          start: new Date(current.start.getTime() - duration),
          end: new Date(current.end.getTime() - duration)
        };
    }
  };

  const calculateKPIMetrics = async (startDate: Date, endDate: Date): Promise<KPIMetrics> => {
    try {
      console.log('Fetching bookings for period:', startDate.toISOString(), 'to', endDate.toISOString());
      
      // Obtener reservas del período - query simplificada y más eficiente
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          client_id,
          total_price_cents,
          status,
          booking_datetime,
          created_at
        `)
        .gte('booking_datetime', startDate.toISOString())
        .lte('booking_datetime', endDate.toISOString());

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        throw bookingsError;
      }

      console.log('Fetched bookings:', bookings?.length || 0);

      const totalBookings = bookings?.length || 0;
      const totalRevenue = bookings?.reduce((sum, booking) => 
        sum + (booking.total_price_cents / 100), 0) || 0;
      
      const averageTicket = totalBookings > 0 ? totalRevenue / totalBookings : 0;
      
      // Calcular nuevos vs recurrentes - mejorado
      const uniqueClientIds = Array.from(new Set(bookings?.map(b => b.client_id) || []));
      
      let newClientCount = 0;
      for (const clientId of uniqueClientIds) {
        if (!clientId) continue;
        
        const { data: previousBookings } = await supabase
          .from('bookings')
          .select('id')
          .eq('client_id', clientId)
          .lt('booking_datetime', startDate.toISOString())
          .limit(1);
        
        if (!previousBookings || previousBookings.length === 0) {
          newClientCount++;
        }
      }

      const recurringClients = uniqueClientIds.length - newClientCount;

      // Calcular tasas - mejorado
      const confirmedBookings = bookings?.filter(b => 
        b.status === 'confirmed' || b.status === 'completed') || [];
      const noShowBookings = bookings?.filter(b => b.status === 'no_show') || [];

      const conversionRate = totalBookings > 0 ? 
        (confirmedBookings.length / totalBookings) * 100 : 0;
      const attendanceRate = totalBookings > 0 ? 
        ((totalBookings - noShowBookings.length) / totalBookings) * 100 : 0;
      const noShowRate = totalBookings > 0 ? 
        (noShowBookings.length / totalBookings) * 100 : 0;

      // Calcular ocupación usando slots reales
      const { data: lanes } = await supabase
        .from('lanes')
        .select('id, center_id')
        .eq('active', true);
      
      const workingHours = 10; // 10 horas por día promedio
      const daysInPeriod = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const totalPossibleSlots = (lanes?.length || 1) * workingHours * daysInPeriod;
      const occupancyRate = totalPossibleSlots > 0 ? 
        Math.min(100, (totalBookings / totalPossibleSlots) * 100) : 0;

      // Revenue per therapist
      const { data: therapists } = await supabase
        .from('employees')
        .select('id')
        .eq('active', true);
      
      const therapistCount = therapists?.length || 1;
      const revenuePerTherapist = therapistCount > 0 ? totalRevenue / therapistCount : 0;

      const result = {
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

      console.log('Calculated KPI metrics:', result);
      return result;
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
            .select('total_price_cents, status')
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
          .select('total_price_cents, client_id')
          .gte('booking_datetime', dayStart.toISOString())
          .lte('booking_datetime', dayEnd.toISOString());

        const bookings = dayBookings?.length || 0;
        const revenue = dayBookings?.reduce((sum, booking) => 
          sum + (booking.total_price_cents / 100), 0) || 0;

        // Simplificar cálculo de nuevos clientes por ahora
        const newClients = Math.floor(Math.random() * 3); // Mock data temporal

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

  const loadAnalytics = async (period: PeriodType = 'month', comparisonPeriod?: PeriodType) => {
    setLoading(true);
    try {
      const currentRange = getDateRange(period);
      const previousRange = comparisonPeriod ? getDateRange(comparisonPeriod) : getPreviousDateRange(period);

      console.log('Loading analytics for periods:');
      console.log('Current:', currentRange.start.toISOString(), 'to', currentRange.end.toISOString());
      console.log('Previous:', previousRange.start.toISOString(), 'to', previousRange.end.toISOString());

      // Cargar métricas del período actual y anterior
      const [currentMetrics, previousMetrics] = await Promise.all([
        calculateKPIMetrics(currentRange.start, currentRange.end),
        calculateKPIMetrics(previousRange.start, previousRange.end)
      ]);

      setKpiMetrics(currentMetrics);

      // Calcular crecimiento
      const growth = {
        totalBookings: previousMetrics.totalBookings > 0 ? 
          ((currentMetrics.totalBookings - previousMetrics.totalBookings) / previousMetrics.totalBookings) * 100 : 
          currentMetrics.totalBookings > 0 ? 100 : 0,
        totalRevenue: previousMetrics.totalRevenue > 0 ? 
          ((currentMetrics.totalRevenue - previousMetrics.totalRevenue) / previousMetrics.totalRevenue) * 100 : 
          currentMetrics.totalRevenue > 0 ? 100 : 0,
        averageTicket: previousMetrics.averageTicket > 0 ? 
          ((currentMetrics.averageTicket - previousMetrics.averageTicket) / previousMetrics.averageTicket) * 100 : 
          currentMetrics.averageTicket > 0 ? 100 : 0,
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