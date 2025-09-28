import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import MobileResponsiveLayout from "@/components/MobileResponsiveLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import BookingCardWithModal from "@/components/BookingCardWithModal";
import { format, parseISO } from "date-fns";
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
        .order('booking_datetime', { ascending: false });

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
      const groupKey = format(bookingDate, 'yyyy-MM-dd', { locale: es });
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(booking);
    });
    
    // Sort groups by date (most recent first)
    const sortedGroups: { [key: string]: Booking[] } = {};
    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    
    sortedKeys.forEach(key => {
      sortedGroups[key] = groups[key];
    });
    
    return sortedGroups;
  }, [bookings]);

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
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-40">
        <MobileResponsiveLayout padding="md">
          <h1 className={`font-bold text-foreground ${
            isMobile ? 'text-lg' : 'text-2xl'
          }`}>
            Gestión de Citas - The Nook Madrid
          </h1>
        </MobileResponsiveLayout>
      </header>

      <main className="py-4 sm:py-8">
        <MobileResponsiveLayout maxWidth="7xl" padding="md">
          <div className="space-y-4 sm:space-y-6">

            {/* Grouped Bookings */}
            {Object.entries(groupedBookings).map(([groupKey, groupBookings]) => (
              <div key={groupKey} className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground border-b pb-2">
                  {groupKey} ({groupBookings.length} {groupBookings.length === 1 ? 'cita' : 'citas'})
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