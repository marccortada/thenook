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

  // Get booking for specific lane and time - improved to handle duration
  const getBookingForSlot = (laneId: string, timeStr: string) => {
    return filteredBookings.find(booking => {
      if (!booking.booking_datetime || booking.lane_id !== laneId) return false;
      
      try {
        const bookingTime = parseISO(booking.booking_datetime);
        const bookingTimeStr = format(bookingTime, 'HH:mm');
        
        // Check if this is the start time of the booking
        return bookingTimeStr === timeStr;
      } catch (error) {
        return false;
      }
    });
  };

  // Check if a slot is occupied by a booking (for duration spanning)
  const isSlotOccupied = (laneId: string, timeStr: string) => {
    return filteredBookings.some(booking => {
      if (!booking.booking_datetime || booking.lane_id !== laneId) return false;
      
      try {
        const bookingTime = parseISO(booking.booking_datetime);
        const duration = booking.duration_minutes || 60;
        
        const slotTime = new Date();
        const [hours, minutes] = timeStr.split(':').map(Number);
        slotTime.setHours(hours, minutes, 0, 0);
        
        const bookingStart = new Date();
        bookingStart.setHours(bookingTime.getHours(), bookingTime.getMinutes(), 0, 0);
        
        const bookingEnd = new Date(bookingStart.getTime() + duration * 60000);
        
        return slotTime >= bookingStart && slotTime < bookingEnd;
      } catch (error) {
        return false;
      }
    });
  };

  // Get status colors - improved colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-100 border-l-4 border-l-blue-500 text-blue-800';
      case 'pending': return 'bg-yellow-100 border-l-4 border-l-yellow-500 text-yellow-800';
      case 'cancelled': return 'bg-red-100 border-l-4 border-l-red-500 text-red-800';
      case 'completed': return 'bg-green-100 border-l-4 border-l-green-500 text-green-800';
      case 'no_show': return 'bg-gray-100 border-l-4 border-l-gray-500 text-gray-800';
      default: return 'bg-blue-100 border-l-4 border-l-blue-500 text-blue-800';
    }
  };

  // Get lane colors for headers
  const getLaneColor = (index: number) => {
    const colors = [
      'border-l-4 border-l-blue-500 bg-blue-50',      // Carril 1 - Azul
      'border-l-4 border-l-green-500 bg-green-50',    // Carril 2 - Verde  
      'border-l-4 border-l-purple-500 bg-purple-50',  // Carril 3 - Morado
      'border-l-4 border-l-orange-500 bg-orange-50'   // Carril 4 - Naranja
    ];
    return colors[index] || colors[0];
  };

  const handleBookingClick = (booking: any) => {
    setSelectedBooking(booking);
    setShowBookingDetails(true);
  };

  const goToPreviousDay = () => setCurrentDate(subDays(currentDate, 1));
  const goToNextDay = () => setCurrentDate(addDays(currentDate, 1));

  const currentCenter = centers.find(c => c.id === activeCenter);

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header mejorado */}
      <div className="bg-white p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">The Nook Madrid</h1>
              <p className="text-sm text-gray-500">{currentCenter?.name || 'Zurbarán'}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              {format(currentDate, 'd')}
            </p>
            <p className="text-sm text-gray-500">
              {format(currentDate, 'MMM', { locale: es })}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200"
          >
            Bloquear
          </Button>
        </div>

        {/* Tabs de navegación Día/Semana */}
        <div className="flex bg-blue-100 rounded-lg p-1 mb-3">
          <button className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-md text-sm font-medium">
            Día
          </button>
          <button className="flex-1 py-2 px-4 text-blue-600 text-sm font-medium">
            Semana
          </button>
        </div>

        {/* Date Navigation mejorado */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPreviousDay}
            className="text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <div className="text-center min-w-[200px]">
            <p className="text-base font-medium text-gray-900">
              {format(currentDate, "EEEE, d 'de' MMMM", { locale: es })}
            </p>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextDay}
            className="text-gray-600 hover:text-gray-900"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Lane Headers mejorados */}
      <div className="grid grid-cols-5 bg-gray-50 border-b border-gray-200">
        <div className="p-3 text-center border-r border-gray-200">
          <div className="text-sm font-medium text-gray-700">Hora</div>
        </div>
        {centerLanes.slice(0, 4).map((lane, index) => (
          <div key={lane.id} className={`p-3 text-center border-r border-gray-200 last:border-r-0 ${getLaneColor(index)}`}>
            <div className="text-sm font-semibold text-gray-800">Carril {index + 1}</div>
            <div className="text-xs text-gray-600">Cap: 1</div>
          </div>
        ))}
      </div>

      {/* Calendar Grid mejorado */}
      <ScrollArea className="flex-1 bg-white">
        <div className="min-h-full">
          {timeSlots.map((timeStr, timeIndex) => {
            // Solo mostrar desde 10:10 en adelante
            const [hour, minute] = timeStr.split(':').map(Number);
            if (hour < 10 || (hour === 10 && minute < 10)) return null;

            return (
              <div key={timeStr} className="grid grid-cols-5 border-b border-gray-100 min-h-[48px]">
                {/* Columna de tiempo */}
                <div className="p-2 text-center border-r border-gray-200 bg-gray-50 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700">{timeStr}</span>
                </div>

                {/* Columnas de carriles */}
                {centerLanes.slice(0, 4).map((lane, laneIndex) => {
                  const booking = getBookingForSlot(lane.id, timeStr);
                  const isOccupied = isSlotOccupied(lane.id, timeStr);
                  const isStartOfBooking = !!booking;
                  
                  return (
                    <div 
                      key={`${lane.id}-${timeStr}`} 
                      className="border-r border-gray-200 last:border-r-0 p-1 min-h-[48px] relative bg-white"
                    >
                      {isStartOfBooking && booking && (
                        <div
                          onClick={() => handleBookingClick(booking)}
                          className={cn(
                            "w-full rounded-md cursor-pointer transition-all hover:shadow-md p-2 text-left",
                            getStatusColor(booking.status)
                          )}
                          style={{
                            height: `${Math.ceil((booking.duration_minutes || 60) / 5) * 48 - 8}px`,
                            zIndex: 10
                          }}
                        >
                          <div className="text-sm font-semibold truncate">
                            {booking.profiles?.first_name || 'sanju'}
                          </div>
                          <div className="text-xs text-gray-600 truncate">
                            {booking.services?.name || 'Anticelulítico / Reductor'}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            €{((booking.total_price_cents || 0) / 100).toFixed(0)} - {format(parseISO(booking.booking_datetime), 'HH:mm')}
                          </div>
                          <button 
                            className="absolute top-1 right-1 w-5 h-5 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle close/cancel
                            }}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      {isOccupied && !isStartOfBooking && (
                        <div className="w-full h-full bg-blue-50 opacity-50 pointer-events-none"></div>
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