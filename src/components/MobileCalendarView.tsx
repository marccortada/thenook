import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  X,
  Clock,
  MapPin,
  User,
  Euro,
  Calendar
} from 'lucide-react';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useBookings, useLanes, useCenters } from '@/hooks/useDatabase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface MobileCalendarViewProps {
  selectedDate: Date;
  selectedCenter?: string;
}

const MobileCalendarView: React.FC<MobileCalendarViewProps> = ({ 
  selectedDate, 
  selectedCenter 
}) => {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [activeCenter, setActiveCenter] = useState(selectedCenter || '');

  const { bookings, loading: bookingsLoading } = useBookings();
  const { lanes } = useLanes();
  const { centers } = useCenters();

  // Update currentDate when selectedDate prop changes
  useEffect(() => {
    setCurrentDate(selectedDate);
  }, [selectedDate]);

  // Set default center
  useEffect(() => {
    if (centers.length > 0 && !activeCenter) {
      setActiveCenter(centers[0].id);
    }
  }, [centers, activeCenter]);

  // Generate time slots from 10:00 to 22:00 in 5-minute intervals
  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 10;
    const endHour = 22;
    
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 5) {
        if (hour === endHour && minute > 0) break;
        
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeStr);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Get lanes for the active center
  const centerLanes = lanes?.filter(lane => lane.center_id === activeCenter) || [];

  // Filter bookings for current date and center
  const filteredBookings = bookings?.filter(booking => {
    if (!booking.booking_datetime || !booking.center_id) return false;
    
    try {
      const bookingDate = parseISO(booking.booking_datetime);
      const isToday = format(bookingDate, 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd');
      const isSameCenter = booking.center_id === activeCenter;
      
      return isToday && isSameCenter;
    } catch (error) {
      console.error('Error parsing booking date:', booking.booking_datetime, error);
      return false;
    }
  }) || [];

  // Get booking for specific lane and time
  const getBookingForSlot = (laneId: string, timeStr: string) => {
    return filteredBookings.find(booking => {
      if (!booking.booking_datetime) return false;
      
      try {
        const bookingTime = parseISO(booking.booking_datetime);
        const bookingTimeStr = format(bookingTime, 'HH:mm');
        const duration = booking.duration_minutes || 60;
        
        // Check if the booking overlaps with this time slot
        const slotTime = new Date();
        const [hours, minutes] = timeStr.split(':');
        slotTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        const bookingStart = new Date();
        bookingStart.setHours(bookingTime.getHours(), bookingTime.getMinutes(), 0, 0);
        
        const bookingEnd = new Date(bookingStart.getTime() + duration * 60000);
        
        return (
          booking.lane_id === laneId &&
          slotTime >= bookingStart &&
          slotTime < bookingEnd
        );
      } catch (error) {
        return false;
      }
    });
  };

  // Get status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-500/20 border-blue-500 text-blue-700';
      case 'pending': return 'bg-yellow-500/20 border-yellow-500 text-yellow-700';
      case 'cancelled': return 'bg-red-500/20 border-red-500 text-red-700';
      case 'completed': return 'bg-green-500/20 border-green-500 text-green-700';
      case 'no_show': return 'bg-gray-500/20 border-gray-500 text-gray-700';
      default: return 'bg-gray-500/20 border-gray-500 text-gray-700';
    }
  };

  const handleBookingClick = (booking: any) => {
    setSelectedBooking(booking);
    setShowBookingDetails(true);
  };

  const goToPreviousDay = () => setCurrentDate(subDays(currentDate, 1));
  const goToNextDay = () => setCurrentDate(addDays(currentDate, 1));

  const currentCenter = centers.find(c => c.id === activeCenter);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 safe-area-top">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            <div>
              <h1 className="text-lg font-semibold">The Nook Madrid</h1>
              <p className="text-sm opacity-90">{currentCenter?.name || 'Centro'}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">
              {format(currentDate, 'd')}
            </p>
            <p className="text-sm opacity-90">
              {format(currentDate, 'MMM', { locale: es })}
            </p>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousDay}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center">
            <p className="text-lg font-medium">
              {format(currentDate, "EEEE, d 'de' MMMM", { locale: es })}
            </p>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextDay}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Center Selection */}
        {centers.length > 1 && (
          <div className="mt-3">
            <Select value={activeCenter} onValueChange={setActiveCenter}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Seleccionar centro" />
              </SelectTrigger>
              <SelectContent>
                {centers.map((center) => (
                  <SelectItem key={center.id} value={center.id}>
                    {center.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Lane Headers */}
      <div className="grid grid-cols-5 border-b bg-muted/30">
        <div className="p-2 text-xs font-medium text-center border-r">
          Hora
        </div>
        {centerLanes.slice(0, 4).map((lane, index) => (
          <div key={lane.id} className="p-2 text-center border-r last:border-r-0">
            <div className="text-xs font-medium">Carril {index + 1}</div>
            <div className="text-[10px] text-muted-foreground">Cap: 1</div>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <ScrollArea className="flex-1">
        <div className="min-h-full">
          {timeSlots.map((timeStr) => {
            // Only show times from 10:10 onwards for display
            const [hour, minute] = timeStr.split(':').map(Number);
            if (hour < 10 || (hour === 10 && minute < 10)) return null;

            return (
              <div key={timeStr} className="grid grid-cols-5 border-b min-h-[60px]">
                {/* Time column */}
                <div className="p-2 text-xs font-medium border-r bg-muted/20 flex items-center justify-center">
                  {timeStr}
                </div>

                {/* Lane columns */}
                {centerLanes.slice(0, 4).map((lane) => {
                  const booking = getBookingForSlot(lane.id, timeStr);
                  
                  return (
                    <div 
                      key={`${lane.id}-${timeStr}`} 
                      className="border-r last:border-r-0 p-1 min-h-[60px] relative"
                    >
                      {booking && (
                        <div
                          onClick={() => handleBookingClick(booking)}
                          className={cn(
                            "w-full h-full rounded-md border cursor-pointer transition-all hover:shadow-md",
                            getStatusColor(booking.status)
                          )}
                        >
                          <div className="p-2 text-xs">
                            <div className="font-medium truncate">
                              {booking.profiles?.first_name || 'Cliente'}
                            </div>
                            <div className="text-[10px] opacity-75 truncate">
                              {booking.services?.name || 'Servicio'}
                            </div>
                            <div className="text-[10px] opacity-75">
                              €{((booking.total_price_cents || 0) / 100).toFixed(0)} - {format(parseISO(booking.booking_datetime), 'HH:mm')}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Booking Details Modal */}
      <Dialog open={showBookingDetails} onOpenChange={setShowBookingDetails}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Detalles de la Cita
            </DialogTitle>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{selectedBooking.profiles?.first_name || 'Cliente'}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {format(parseISO(selectedBooking.booking_datetime), "d 'de' MMMM 'a las' HH:mm", { locale: es })}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{selectedBooking.duration_minutes || 60} minutos</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Euro className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    €{((selectedBooking.total_price_cents || 0) / 100).toFixed(2)}
                  </span>
                </div>
              </div>
              
              <div className="pt-2 border-t">
                <Badge variant="outline" className={getStatusColor(selectedBooking.status)}>
                  {selectedBooking.status}
                </Badge>
              </div>
              
              {selectedBooking.notes && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">Notas:</p>
                  <p className="text-sm">{selectedBooking.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MobileCalendarView;