import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DashboardStats {
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  averageTicket: number;
  newClients: number;
  returningClients: number;
}

export interface ServiceStats {
  service_name: string;
  total_bookings: number;
  total_revenue: number;
}

export interface CenterStats {
  center_name: string;
  total_bookings: number;
  total_revenue: number;
  occupancy_rate: number;
}

export interface BookingTrend {
  date: string;
  count: number;
  revenue: number;
}

export const useDashboard = (startDate?: string, endDate?: string, centerId?: string) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    confirmedBookings: 0,
    pendingBookings: 0,
    cancelledBookings: 0,
    totalRevenue: 0,
    averageTicket: 0,
    newClients: 0,
    returningClients: 0,
  });
  const [serviceStats, setServiceStats] = useState<ServiceStats[]>([]);
  const [centerStats, setCenterStats] = useState<CenterStats[]>([]);
  const [bookingTrends, setBookingTrends] = useState<BookingTrend[]>([]);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Default to today's date if no date range provided
      const today = new Date();
      const defaultStartDate = startDate || today.toISOString().split('T')[0];
      const defaultEndDate = endDate || today.toISOString().split('T')[0];

      // Build query filters
      let bookingsQuery = supabase
        .from('bookings')
        .select(`
          *,
          services!inner(name, price_cents),
          centers!inner(name),
          profiles!inner(first_name, last_name, email, user_id)
        `)
        .gte('booking_datetime', `${defaultStartDate}T00:00:00`)
        .lte('booking_datetime', `${defaultEndDate}T23:59:59`);

      if (centerId) {
        bookingsQuery = bookingsQuery.eq('center_id', centerId);
      }

      const { data: bookings, error: bookingsError } = await bookingsQuery;

      if (bookingsError) throw bookingsError;

      // Calculate main stats
      const totalBookings = bookings?.length || 0;
      const confirmedBookings = bookings?.filter(b => b.status === 'confirmed').length || 0;
      const pendingBookings = bookings?.filter(b => b.status === 'pending').length || 0;
      const cancelledBookings = bookings?.filter(b => b.status === 'cancelled').length || 0;
      
      const totalRevenue = bookings?.reduce((sum, booking) => {
        return sum + (booking.total_price_cents || 0);
      }, 0) || 0;

      const averageTicket = totalBookings > 0 ? totalRevenue / totalBookings : 0;

      // Get unique clients
      const uniqueClients = new Set(bookings?.map(b => b.client_id).filter(Boolean));
      
      // For new vs returning clients, we need to check if they have previous bookings
      const { data: allBookings } = await supabase
        .from('bookings')
        .select('client_id, booking_datetime')
        .lt('booking_datetime', `${defaultStartDate}T00:00:00`);

      const existingClients = new Set(allBookings?.map(b => b.client_id).filter(Boolean));
      
      let newClients = 0;
      let returningClients = 0;
      
      uniqueClients.forEach(clientId => {
        if (existingClients.has(clientId)) {
          returningClients++;
        } else {
          newClients++;
        }
      });

      setStats({
        totalBookings,
        confirmedBookings,
        pendingBookings,
        cancelledBookings,
        totalRevenue: totalRevenue / 100, // Convert from cents to euros
        averageTicket: averageTicket / 100,
        newClients,
        returningClients,
      });

      // Service stats
      const serviceStatsMap = new Map();
      bookings?.forEach(booking => {
        const serviceName = booking.services?.name || 'Servicio desconocido';
        const revenue = booking.total_price_cents || 0;
        
        if (serviceStatsMap.has(serviceName)) {
          const existing = serviceStatsMap.get(serviceName);
          serviceStatsMap.set(serviceName, {
            service_name: serviceName,
            total_bookings: existing.total_bookings + 1,
            total_revenue: existing.total_revenue + revenue,
          });
        } else {
          serviceStatsMap.set(serviceName, {
            service_name: serviceName,
            total_bookings: 1,
            total_revenue: revenue,
          });
        }
      });

      setServiceStats(Array.from(serviceStatsMap.values())
        .map(stat => ({
          ...stat,
          total_revenue: stat.total_revenue / 100, // Convert to euros
        }))
        .sort((a, b) => b.total_bookings - a.total_bookings));

      // Center stats
      const centerStatsMap = new Map();
      bookings?.forEach(booking => {
        const centerName = booking.centers?.name || 'Centro desconocido';
        const revenue = booking.total_price_cents || 0;
        
        if (centerStatsMap.has(centerName)) {
          const existing = centerStatsMap.get(centerName);
          centerStatsMap.set(centerName, {
            center_name: centerName,
            total_bookings: existing.total_bookings + 1,
            total_revenue: existing.total_revenue + revenue,
          });
        } else {
          centerStatsMap.set(centerName, {
            center_name: centerName,
            total_bookings: 1,
            total_revenue: revenue,
          });
        }
      });

      setCenterStats(Array.from(centerStatsMap.values())
        .map(stat => ({
          ...stat,
          total_revenue: stat.total_revenue / 100,
          occupancy_rate: Math.round((stat.total_bookings / totalBookings) * 100) || 0,
        }))
        .sort((a, b) => b.total_bookings - a.total_bookings));

      // Recent bookings for the list
      const recentBookingsList = bookings?.slice(0, 10).map(booking => ({
        id: booking.id,
        client: `${booking.profiles?.first_name || ''} ${booking.profiles?.last_name || ''}`.trim() || 'Cliente desconocido',
        service: booking.services?.name || 'Servicio desconocido',
        time: new Date(booking.booking_datetime).toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        date: new Date(booking.booking_datetime).toLocaleDateString('es-ES'),
        duration: booking.duration_minutes,
        center: booking.centers?.name || 'Centro desconocido',
        status: booking.status,
        revenue: (booking.total_price_cents || 0) / 100,
      })) || [];

      setRecentBookings(recentBookingsList);

      // Booking trends - group by date
      const trendsMap = new Map();
      bookings?.forEach(booking => {
        const date = new Date(booking.booking_datetime).toISOString().split('T')[0];
        const revenue = booking.total_price_cents || 0;
        
        if (trendsMap.has(date)) {
          const existing = trendsMap.get(date);
          trendsMap.set(date, {
            date,
            count: existing.count + 1,
            revenue: existing.revenue + revenue,
          });
        } else {
          trendsMap.set(date, {
            date,
            count: 1,
            revenue,
          });
        }
      });

      setBookingTrends(Array.from(trendsMap.values())
        .map(trend => ({
          ...trend,
          revenue: trend.revenue / 100,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Error al cargar los datos del dashboard');
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [startDate, endDate, centerId]);

  const refetch = () => {
    fetchDashboardData();
  };

  return {
    stats,
    serviceStats,
    centerStats,
    bookingTrends,
    recentBookings,
    loading,
    error,
    refetch,
  };
};