import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import MobileResponsiveLayout from "@/components/MobileResponsiveLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import BookingCardWithModal from "@/components/BookingCardWithModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface Booking {
  id: string;
  booking_datetime: string;
  duration_minutes: number;
  total_price_cents: number;
  status: string;
  payment_status: string;
  notes?: string;
  booking_codes?: string[];
  services?: { name: string };
  centers?: { name: string };
  profiles?: { 
    id: string;
    first_name: string; 
    last_name: string; 
    email: string; 
    phone: string;
  };
}

export default function BookingManagement() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    document.title = "Gestión de Citas | The Nook Madrid";
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          services (name),
          centers (name),
          profiles (id, first_name, last_name, email, phone)
        `)
        .order('booking_datetime', { ascending: sortOrder === 'newest' ? false : true });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las citas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const groupedBookings = useMemo(() => {
    const groups: { [key: string]: Booking[] } = {};
    
    bookings.forEach((booking) => {
      const bookingDate = parseISO(booking.booking_datetime);
      let groupKey = '';
      
      switch (groupBy) {
        case 'day':
          groupKey = format(bookingDate, 'yyyy-MM-dd', { locale: es });
          break;
        case 'week':
          const weekStart = startOfWeek(bookingDate, { weekStartsOn: 1 });
          const weekEnd = endOfWeek(bookingDate, { weekStartsOn: 1 });
          groupKey = `${format(weekStart, 'dd MMM', { locale: es })} - ${format(weekEnd, 'dd MMM yyyy', { locale: es })}`;
          break;
        case 'month':
          groupKey = format(bookingDate, 'MMMM yyyy', { locale: es });
          break;
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(booking);
    });
    
    // Sort groups by date
    const sortedGroups: { [key: string]: Booking[] } = {};
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (sortOrder === 'newest') {
        return b.localeCompare(a);
      }
      return a.localeCompare(b);
    });
    
    sortedKeys.forEach(key => {
      sortedGroups[key] = groups[key];
    });
    
    return sortedGroups;
  }, [bookings, groupBy, sortOrder]);

  useEffect(() => {
    fetchBookings();
  }, [sortOrder]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground">Cargando citas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <MobileResponsiveLayout padding="md">
          <h1 className={`font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent ${
            isMobile ? 'text-lg' : 'text-2xl'
          }`}>
            Gestión de Citas - The Nook Madrid
          </h1>
        </MobileResponsiveLayout>
      </header>

      <main className="py-4 sm:py-8">
        <MobileResponsiveLayout maxWidth="7xl" padding="md">
          <div className="space-y-4 sm:space-y-6">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Agrupar por:
                </label>
                <Select value={groupBy} onValueChange={(value: 'day' | 'week' | 'month') => setGroupBy(value)}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" align="center" sideOffset={2} collisionPadding={8} sticky="always" className="z-[9999] bg-popover border shadow-md min-w-[var(--radix-select-trigger-width)]">
                    <SelectItem value="day">Día</SelectItem>
                    <SelectItem value="week">Semana</SelectItem>
                    <SelectItem value="month">Mes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Ordenar por:
                </label>
                <Select value={sortOrder} onValueChange={(value: 'newest' | 'oldest') => setSortOrder(value)}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" align="center" sideOffset={2} collisionPadding={8} sticky="always" className="z-[9999] bg-popover border shadow-md min-w-[var(--radix-select-trigger-width)]">
                    <SelectItem value="newest">Más recientes</SelectItem>
                    <SelectItem value="oldest">Más antiguos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Grouped Bookings */}
            {Object.entries(groupedBookings).map(([groupKey, groupBookings]) => (
              <div key={groupKey} className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground border-b pb-2">
                  {groupKey} ({groupBookings.length} citas)
                </h2>
                <div className="space-y-3">
                  {groupBookings.map((booking) => (
                    <BookingCardWithModal
                      key={booking.id}
                      booking={booking}
                      onBookingUpdated={fetchBookings}
                    />
                  ))}
                </div>
              </div>
            ))}
            
            {Object.keys(groupedBookings).length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No se encontraron citas</p>
              </div>
            )}
          </div>
        </MobileResponsiveLayout>
      </main>
    </div>
  );
}