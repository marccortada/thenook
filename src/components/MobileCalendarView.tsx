import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ChevronLeft, 
  ChevronRight, 
  X,
  Clock,
  MapPin,
  User,
  Euro,
  Calendar,
  Settings,
  Lock
} from 'lucide-react';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useBookings, useLanes, useCenters, useServices } from '@/hooks/useDatabase';
import { useTreatmentGroups } from '@/hooks/useTreatmentGroups';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface MobileCalendarViewProps {
  selectedDate: Date;
  selectedCenter?: string;
  onCenterChange?: (centerId: string) => void;
}

const MobileCalendarView: React.FC<MobileCalendarViewProps> = ({ 
  selectedDate, 
  selectedCenter,
  onCenterChange 
}) => {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [activeCenter, setActiveCenter] = useState(selectedCenter || '');
  const [blockingMode, setBlockingMode] = useState(false);

  const { bookings, loading: bookingsLoading } = useBookings();
  const { lanes } = useLanes();
  const { centers } = useCenters();
  const { services } = useServices();
  const { treatmentGroups } = useTreatmentGroups();

  // Update currentDate when selectedDate prop changes
  useEffect(() => {
    setCurrentDate(selectedDate);
  }, [selectedDate]);

  // Set center from props or default
  useEffect(() => {
    if (selectedCenter) {
      setActiveCenter(selectedCenter);
      console.log('📱 Mobile: Using selected center from props:', selectedCenter);
    } else if (centers.length > 0 && !activeCenter) {
      const firstCenter = centers[0].id;
      setActiveCenter(firstCenter);
      console.log('📱 Mobile: Setting initial center:', firstCenter, centers[0].name);
    }
  }, [centers, selectedCenter, activeCenter]);

  // Generate time slots from 10:00 to 22:55 in 5-minute intervals
  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 10;  // Cambio: empezar a las 10 AM
    const endHour = 22;
    
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 5) {
        if (hour === endHour && minute > 55) break;
        
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

  console.log('📱 Mobile Calendar Debug:', {
    activeCenter,
    currentDate: format(currentDate, 'yyyy-MM-dd'),
    totalBookings: bookings?.length || 0,
    filteredBookings: filteredBookings.length,
    centerLanes: centerLanes.length
  });

  // Get booking for specific lane and time
  const getBookingForSlot = (laneId: string, timeStr: string) => {
    return filteredBookings.find(booking => {
      if (!booking.booking_datetime || booking.lane_id !== laneId) return false;
      
      try {
        const bookingTime = parseISO(booking.booking_datetime);
        const bookingTimeStr = format(bookingTime, 'HH:mm');
        
        return bookingTimeStr === timeStr;
      } catch (error) {
        return false;
      }
    });
  };

  // Check if a slot is occupied by a booking
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

  // Function to get lane color for a specific service (based on its treatment group)
  const getServiceLaneColor = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service || !service.group_id) return '#3B82F6';

    const serviceGroup = treatmentGroups.find(tg => tg.id === service.group_id);
    if (!serviceGroup) return '#3B82F6';

    console.log('🎨 MOBILE - Service:', service.name, 'Group:', serviceGroup.name, 'Color:', serviceGroup.color);
    // Use the actual color from the treatment group
    return serviceGroup.color || '#3B82F6';
  };

  // Convert hex color to Tailwind classes
  const getBookingColorClasses = (serviceId: string) => {
    const color = getServiceLaneColor(serviceId);
    // Return inline styles instead of Tailwind classes for dynamic colors
    return {
      backgroundColor: `${color}20`,
      borderLeftColor: color,
      color: color
    };
  };

  // Get lane colors for headers (keep simple for headers)
  const getLaneColor = (index: number) => {
    const colors = [
      'border-l-4 border-l-blue-500 bg-blue-50',
      'border-l-4 border-l-green-500 bg-green-50',
      'border-l-4 border-l-purple-500 bg-purple-50',
      'border-l-4 border-l-orange-500 bg-orange-50'
    ];
    return colors[index] || colors[0];
  };

  const handleBookingClick = (booking: any) => {
    setSelectedBooking(booking);
    setShowBookingDetails(true);
  };

  const handleBlockSlot = (laneId: string, timeStr: string) => {
    toast({
      title: "Modo bloqueo",
      description: `Bloqueando carril en ${timeStr}`,
    });
  };

  const goToPreviousDay = () => setCurrentDate(subDays(currentDate, 1));
  const goToNextDay = () => setCurrentDate(addDays(currentDate, 1));

  const currentCenter = centers.find(c => c.id === activeCenter);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header compacto y sticky */}
      <div className="bg-white p-3 border-b shadow-sm sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <div>
              <h1 className="text-sm font-semibold">The Nook Madrid</h1>
              <Select
                value={activeCenter}
                onValueChange={(value) => {
                  setActiveCenter(value);
                  onCenterChange?.(value);
                  const center = centers.find(c => c.id === value);
                  toast({
                    title: "Centro cambiado",
                    description: `Mostrando calendario de ${center?.name}`,
                  });
                }}
              >
                <SelectTrigger className="w-auto border-0 p-0 h-auto text-xs text-blue-600 bg-transparent shadow-none">
                  <SelectValue placeholder="Seleccionar centro" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                  {centers.map((center) => (
                    <SelectItem key={center.id} value={center.id} className="text-sm">
                      {center.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">{format(currentDate, 'd')}</p>
            <p className="text-xs text-gray-500">{format(currentDate, 'MMM', { locale: es })}</p>
          </div>
        </div>

        {/* Navegación de fecha */}
        <div className="flex items-center justify-center gap-4 mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPreviousDay}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center">
            <p className="text-sm font-medium">
              {format(currentDate, "EEEE, d 'de' MMMM", { locale: es })}
            </p>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextDay}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Headers de carriles - sticky */}
      <div className="bg-white border-b sticky top-[120px] z-40">
        <div className="grid grid-cols-5 text-xs">
          <div className="p-2 text-center border-r bg-gray-50">
            <span className="font-medium">Hora</span>
          </div>
          {centerLanes.slice(0, 4).map((lane, index) => (
            <div key={lane.id} className={`p-2 text-center border-r last:border-r-0 ${getLaneColor(index)}`}>
              <div className="font-semibold">C{index + 1}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Grid - scrollable */}
      <div className="bg-white">
        {centerLanes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No hay carriles configurados</p>
          </div>
        ) : (
          <div className="min-h-full">
            {timeSlots.map((timeStr, timeIndex) => {
              const [hour, minute] = timeStr.split(':').map(Number);
              // No filtrar por hora ya que generamos desde las 10 AM

              return (
                <div key={timeStr} className="grid grid-cols-5 border-b border-gray-100 min-h-[40px]">
                  {/* Columna de tiempo */}
                  <div className="p-2 text-center border-r border-gray-200 bg-gray-50 flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-700">{timeStr}</span>
                  </div>

                  {/* Columnas de carriles */}
                  {centerLanes.slice(0, 4).map((lane, laneIndex) => {
                    const booking = getBookingForSlot(lane.id, timeStr);
                    const isOccupied = isSlotOccupied(lane.id, timeStr);
                    const isStartOfBooking = !!booking;
                    
                    return (
                      <div 
                        key={`${lane.id}-${timeStr}`} 
                        className="border-r border-gray-200 last:border-r-0 p-1 min-h-[40px] relative bg-white hover:bg-gray-50"
                        onClick={blockingMode ? () => handleBlockSlot(lane.id, timeStr) : undefined}
                      >
                        {blockingMode && (
                          <div className="absolute top-1 right-1">
                            <Lock className="h-2 w-2 text-red-500" />
                          </div>
                        )}
                        {isStartOfBooking && booking && (
                          <div
                            onClick={() => !blockingMode && handleBookingClick(booking)}
                            className="w-full rounded text-left cursor-pointer p-1 border-l-4"
                            style={{
                              ...getBookingColorClasses(booking.service_id),
                              height: `${((booking.duration_minutes || 60) / 5) * 40}px`,
                              zIndex: 10
                            }}
                          >
                            <div className="text-xs font-semibold truncate">
                              {booking.profiles?.first_name || 'Cliente'}
                            </div>
                            <div className="text-xs text-gray-600 truncate">
                              {booking.services?.name || 'Servicio'}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              €{((booking.total_price_cents || 0) / 100).toFixed(0)}
                            </div>
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
            
            {/* Mensaje si no hay reservas */}
            {filteredBookings.length === 0 && (
              <div className="p-4 text-center text-gray-500 bg-gray-50 m-2 rounded">
                <Calendar className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No hay reservas para {format(currentDate, "d 'de' MMMM", { locale: es })}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Botones de acción flotantes */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2">
        <Button
          size="sm"
          variant="outline"
          className="bg-white shadow-lg"
          onClick={() => setBlockingMode(!blockingMode)}
        >
          <Lock className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          className="bg-blue-600 text-white shadow-lg"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Modal detalles de reserva */}
      <Dialog open={showBookingDetails} onOpenChange={setShowBookingDetails}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Detalles de la Cita
            </DialogTitle>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-3">
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
                <span className="text-sm">€{((selectedBooking.total_price_cents || 0) / 100).toFixed(2)}</span>
              </div>

              <div className="mt-3">
                <Badge 
                  variant="outline" 
                  style={getBookingColorClasses(selectedBooking.service_id)}
                  className="border-l-4"
                >
                  {selectedBooking.status}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MobileCalendarView;