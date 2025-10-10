import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import MobileResponsiveLayout from "@/components/MobileResponsiveLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import BookingCardWithModal from "@/components/BookingCardWithModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  const { upcomingGroups, historicalGroups } = useMemo(() => {
    const now = Date.now();
    const upcomingMap = new Map<string, Booking[]>();
    const historicalMap = new Map<string, Booking[]>();

    bookings.forEach((booking) => {
      const bookingDate = parseISO(booking.booking_datetime);
      const bookingTime = bookingDate.getTime();
      const groupKey = format(bookingDate, 'yyyy-MM-dd', { locale: es });

      const targetMap = bookingTime >= now ? upcomingMap : historicalMap;
      if (!targetMap.has(groupKey)) {
        targetMap.set(groupKey, []);
      }
      targetMap.get(groupKey)!.push(booking);
    });

    const upcomingGroups = Array.from(upcomingMap.entries())
      .map(([key, dayBookings]) => ({
        key,
        bookings: [...dayBookings].sort((a, b) =>
          parseISO(a.booking_datetime).getTime() - parseISO(b.booking_datetime).getTime()
        ),
        nextTime: Math.min(...dayBookings.map(b => parseISO(b.booking_datetime).getTime())),
      }))
      .sort((a, b) => a.nextTime - b.nextTime)
      .map(({ key, bookings }) => ({ key, bookings }));

    const historicalGroups = Array.from(historicalMap.entries())
      .map(([key, dayBookings]) => ({
        key,
        bookings: [...dayBookings].sort((a, b) =>
          parseISO(b.booking_datetime).getTime() - parseISO(a.booking_datetime).getTime()
        ),
        lastTime: Math.max(...dayBookings.map(b => parseISO(b.booking_datetime).getTime())),
      }))
      .sort((a, b) => b.lastTime - a.lastTime)
      .map(({ key, bookings }) => ({ key, bookings }));

    return { upcomingGroups, historicalGroups };
  }, [bookings]);

  const [activeTab, setActiveTab] = useState<'upcoming' | 'historical'>(
    upcomingGroups.length > 0 ? 'upcoming' : 'historical'
  );

  useEffect(() => {
    if (activeTab === 'upcoming' && upcomingGroups.length === 0 && historicalGroups.length > 0) {
      setActiveTab('historical');
    } else if (activeTab === 'historical' && historicalGroups.length === 0 && upcomingGroups.length > 0) {
      setActiveTab('upcoming');
    }
  }, [activeTab, upcomingGroups.length, historicalGroups.length]);

  const renderGroups = (groups: { key: string; bookings: Booking[] }[]) =>
    groups.map(({ key, bookings }) => (
      <div key={key} className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground border-b pb-2">
          {key} ({bookings.length} {bookings.length === 1 ? 'cita' : 'citas'})
        </h2>
        <div className="space-y-3">
          {bookings.map((booking) => (
            <BookingCardWithModal
              key={booking.id}
              booking={booking}
              onBookingUpdated={fetchBookings}
            />
          ))}
        </div>
      </div>
    ));

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
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as 'upcoming' | 'historical')}
              className="space-y-4"
            >
              <TabsList className="grid w-full grid-cols-2 sm:w-auto">
                <TabsTrigger value="upcoming">Próximas</TabsTrigger>
                <TabsTrigger value="historical">Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming">
                {renderGroups(upcomingGroups)}
                {upcomingGroups.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay citas próximas.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="historical">
                {renderGroups(historicalGroups)}
                {historicalGroups.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay citas históricas.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </MobileResponsiveLayout>
      </main>
    </div>
  );
}
