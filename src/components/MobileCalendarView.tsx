import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  X,
  Clock,
  MapPin,
  User,
  Euro,
  Calendar,
  Settings,
  Lock,
  Eye,
  MoreVertical
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
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [activeCenter, setActiveCenter] = useState(selectedCenter || '');
  const [showCenterSelect, setShowCenterSelect] = useState(false);
  const [blockingMode, setBlockingMode] = useState(false);
  const [showDesktopView, setShowDesktopView] = useState(false);

  const { bookings, loading: bookingsLoading } = useBookings();
  const { lanes } = useLanes();
  const { centers } = useCenters();

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

  console.log('📱 Mobile Calendar Debug:', {
    activeCenter,
    currentDate: format(currentDate, 'yyyy-MM-dd'),
    totalBookings: bookings?.length || 0,
    filteredBookings: filteredBookings.length,
    centerLanes: centerLanes.length
  });

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

  const handleBlockSlot = (laneId: string, timeStr: string) => {
    toast({
      title: "Modo bloqueo",
      description: `Bloqueando carril en ${timeStr}`,
    });
  };

  const goToPreviousDay = () => setCurrentDate(subDays(currentDate, 1));
  const goToNextDay = () => setCurrentDate(addDays(currentDate, 1));

  // Función para renderizar vista día
  const renderDayView = () => {
    // Siempre mostrar la cuadrícula, incluso sin reservas
    return (
      <ScrollArea className="flex-1 bg-white">
        <div className="min-h-full">
          {centerLanes.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No hay carriles configurados para este centro</p>
            </div>
          ) : (
            timeSlots.map((timeStr, timeIndex) => {
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
                        className={`border-r border-gray-200 last:border-r-0 p-1 min-h-[48px] relative ${
                          blockingMode ? 'cursor-pointer hover:bg-red-100' : 'bg-white hover:bg-gray-50'
                        }`}
                        onClick={blockingMode ? () => handleBlockSlot(lane.id, timeStr) : undefined}
                      >
                        {blockingMode && (
                          <div className="absolute top-1 right-1">
                            <Lock className="h-3 w-3 text-red-500" />
                          </div>
                        )}
                        {isStartOfBooking && booking && (
                          <div
                            onClick={() => !blockingMode && handleBookingClick(booking)}
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
                              {booking.profiles?.first_name || 'Cliente'}
                            </div>
                            <div className="text-xs text-gray-600 truncate">
                              {booking.services?.name || 'Servicio'}
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
            })
          )}
          
          {/* Mensaje informativo si no hay reservas para esta fecha */}
          {centerLanes.length > 0 && filteredBookings.length === 0 && (
            <div className="p-4 text-center text-gray-500 bg-gray-50 m-4 rounded-lg">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">No hay reservas para {format(currentDate, "d 'de' MMMM", { locale: es })}</p>
              <p className="text-xs text-gray-400 mt-1">Navega a otras fechas o crea una nueva reserva</p>
            </div>
          )}
        </div>
      </ScrollArea>
    );
  };

  const currentCenter = centers.find(c => c.id === activeCenter);

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header mejorado con más controles */}
      <div className="bg-white p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">The Nook Madrid</h1>
              <button 
                onClick={() => setShowCenterSelect(true)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {currentCenter?.name || 'Seleccionar centro'} ▼
              </button>
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
          {/* Menú de opciones */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Opciones</AlertDialogTitle>
                <AlertDialogDescription>
                  Elige una acción:
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setBlockingMode(!blockingMode)}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  {blockingMode ? 'Salir del modo bloqueo' : 'Modo bloqueo'}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setShowDesktopView(true)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Vista escritorio
                </Button>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Tabs de navegación Día/Semana mejoradas */}
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'day' | 'week')} className="mb-3">
          <TabsList className="grid w-full grid-cols-2 bg-blue-100">
            <TabsTrigger value="day" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              Día
            </TabsTrigger>
            <TabsTrigger value="week" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              Semana
            </TabsTrigger>
          </TabsList>
        </Tabs>

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

      {/* Calendar Content con Tabs */}
      <TabsContent value="day" className="flex-1 m-0">
        {/* Lane Headers para vista día */}
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

        {/* Calendar Grid para vista día */}
        {renderDayView()}
      </TabsContent>

      <TabsContent value="week" className="flex-1 m-0">
        {/* Vista semana simplificada para móvil */}
        <div className="p-4 text-center text-gray-500">
          <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Vista de semana en desarrollo</p>
          <p className="text-xs">Por ahora usa la vista de día</p>
        </div>
      </TabsContent>

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

      {/* Modal de selección de centro */}
      <Dialog open={showCenterSelect} onOpenChange={setShowCenterSelect}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Seleccionar Centro</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {centers.map((center) => (
              <Button
                key={center.id}
                variant={activeCenter === center.id ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => {
                  setActiveCenter(center.id);
                  setShowCenterSelect(false);
                }}
              >
                <MapPin className="h-4 w-4 mr-2" />
                {center.name}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para cambiar a vista escritorio */}
      <AlertDialog open={showDesktopView} onOpenChange={setShowDesktopView}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vista de Escritorio</AlertDialogTitle>
            <AlertDialogDescription>
              Para acceder a todas las funcionalidades avanzadas, recarga la página en un navegador de escritorio o gira tu dispositivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => window.location.reload()}>
              Recargar página
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MobileCalendarView;