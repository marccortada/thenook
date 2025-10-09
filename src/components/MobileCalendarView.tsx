import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  Lock,
  Move
} from 'lucide-react';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useBookings, useLanes, useCenters, useServices } from '@/hooks/useDatabase';
import { useTreatmentGroups } from '@/hooks/useTreatmentGroups';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { createClient } from '@supabase/supabase-js';
import { cn } from '@/lib/utils';

interface MobileCalendarViewProps {
  selectedDate: Date;
  selectedCenter?: string;
  onCenterChange?: (centerId: string) => void;
  onSlotSelect?: (
    centerId: string,
    laneId: string,
    date: Date,
    timeSlot: Date,
    event?: React.MouseEvent<HTMLDivElement>
  ) => void;
}

const MobileCalendarView: React.FC<MobileCalendarViewProps> = ({ 
  selectedDate, 
  selectedCenter,
  onCenterChange,
  onSlotSelect
}) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [activeCenter, setActiveCenter] = useState(selectedCenter || '');
  const [blockingMode, setBlockingMode] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const [draggedBooking, setDraggedBooking] = useState<any>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [touchStartTime, setTouchStartTime] = useState<number>(0);
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (!moveMode) {
      setDraggedBooking(null);
      setIsDragging(false);
    }
  }, [moveMode]);


  console.log('🚀 MOBILE CALENDAR VIEW LOADING!');

  const { bookings, loading: bookingsLoading } = useBookings();
  const { lanes } = useLanes();
  const { centers } = useCenters();
  const { services } = useServices();
  const { treatmentGroups } = useTreatmentGroups();

  console.log('📊 MOBILE DATA LOADED - bookings:', bookings.length, 'services:', services.length, 'groups:', treatmentGroups.length);

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

  // Generate time slots from 10:00 to 22:00 in 5-minute intervals (same as desktop)
  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 10;
    const endHour = 22;
    
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 5) {
        if (hour === endHour && minute > 0) break; // Stop at 22:00 exactly like desktop
        
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
    if (!service || !service.group_id) {
      return '#3B82F6'; // Default blue if no service or group
    }

    const serviceGroup = treatmentGroups.find(tg => tg.id === service.group_id);
    if (!serviceGroup) {
      return '#3B82F6'; // Default blue if no group found
    }

    return serviceGroup.color || '#3B82F6'; // Use group color or default
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

  // Get lane colors for headers (sin colores, solo gris neutro)
  const getLaneColor = (index: number) => {
    return 'bg-gray-50'; // Sin colores, solo fondo gris neutro
  };

  const handleBookingClick = (booking: any, event: React.MouseEvent | React.TouchEvent) => {
    event?.stopPropagation();
    console.log('🔥 BOOKING CLICKED:', booking.id, 'Mobile:', isMobile);
    
    // Calcular posición del modal basada en el elemento clicado
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    
    // Dimensiones del modal para móvil
    const modalWidth = Math.min(350, windowWidth - 20);
    const modalHeight = Math.min(400, windowHeight - 80);
    
    // Calcular posición - centrado horizontalmente, cerca del elemento clickeado
    let top = rect.top + scrollTop - 50;
    let left = (windowWidth - modalWidth) / 2;
    
    // Ajustar verticalmente para que esté siempre visible
    const viewportTop = scrollTop + 20;
    const viewportBottom = scrollTop + windowHeight - 20;
    
    if (top < viewportTop) {
      top = viewportTop;
    } else if (top + modalHeight > viewportBottom) {
      top = viewportBottom - modalHeight;
    }
    
    // Asegurar que no se salga horizontalmente
    if (left < 10) left = 10;
    if (left + modalWidth > windowWidth - 10) left = windowWidth - modalWidth - 10;
    
    console.log('📱 Modal position:', { top, left, elementTop: rect.top, scrollTop });
    
    setModalPosition({ top, left });
    setSelectedBooking(booking);
    setShowBookingDetails(true);
  };

  const closeModal = () => {
    setShowBookingDetails(false);
    setSelectedBooking(null);
  };

  // Simplified and robust touch handlers for drag & drop
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleTouchStart = (booking: any, event: React.TouchEvent) => {
    if (blockingMode || !moveMode) return;
    
    console.log('🖐️ Touch start:', booking.id);
    
    const touch = event.touches[0];
    const rect = event.currentTarget.getBoundingClientRect();
    
    setTouchStartTime(Date.now());
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    setDraggedBooking(null);
    setIsDragging(false);
    
    // Clear any existing timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    
    // Start long press timer - more aggressive timing
    longPressTimerRef.current = setTimeout(() => {
      console.log('🖐️ Long press detected - enabling drag for:', booking.id);
      setDraggedBooking(booking);
      setDragOffset({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      });
      
      // Add visual feedback
      const element = event.currentTarget as HTMLElement;
      element.style.transform = 'scale(1.1)';
      element.style.zIndex = '1000';
      
      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
      
      console.log('🎯 Drag enabled with offset:', { x: touch.clientX - rect.left, y: touch.clientY - rect.top });
    }, 200); // Even shorter - 200ms
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (!moveMode) return;
    console.log('✋ Touch move triggered');
    
    const touch = event.touches[0];
    const distance = Math.sqrt(
      Math.pow(touch.clientX - touchStartPos.x, 2) + 
      Math.pow(touch.clientY - touchStartPos.y, 2)
    );
    
    console.log('✋ Move distance:', distance);
    
    // If moved more than 5px, cancel long press timer (but only if no drag started)
    if (distance > 5 && longPressTimerRef.current && !draggedBooking) {
      console.log('✋ Canceling long press due to movement');
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    // If we have a dragged booking, we're in drag mode
    if (draggedBooking) {
      console.log('✋ Dragging confirmed - preventing scroll');
      setIsDragging(true);
      event.preventDefault(); // Prevent scrolling
      event.stopPropagation();
    }
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (!moveMode) return;
    console.log('🎯 Touch end triggered');
    
    // Reset visual feedback
    const element = event.currentTarget as HTMLElement;
    element.style.transform = '';
    element.style.zIndex = '';
    
    // Clear timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    const wasDragging = isDragging;
    const currentDraggedBooking = draggedBooking;
    
    console.log('🎯 Touch end state:', { wasDragging, hasDraggedBooking: !!currentDraggedBooking });
    
    if (currentDraggedBooking && wasDragging) {
      const touch = event.changedTouches[0];
      const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
      
      console.log('🎯 Looking for drop target at:', { x: touch.clientX, y: touch.clientY });
      console.log('🎯 Element below:', elementBelow);
      
      // Find target cell by traversing up the DOM
      let targetCell = elementBelow as HTMLElement;
      let attempts = 0;
      while (targetCell && !targetCell.dataset?.laneId && attempts < 10) {
        targetCell = targetCell.parentElement as HTMLElement;
        attempts++;
      }
      
      console.log('🎯 Target cell found:', targetCell?.dataset);
      
      if (targetCell && targetCell.dataset?.laneId && targetCell.dataset?.timeSlot) {
        const targetLaneId = targetCell.dataset.laneId;
        const targetTimeStr = targetCell.dataset.timeSlot;
        
        console.log('🎯 Valid drop target:', { targetLaneId, targetTimeStr });
        
        // Check if it's actually a different position
        const currentTime = format(parseISO(currentDraggedBooking.booking_datetime), 'HH:mm');
        if (targetLaneId !== currentDraggedBooking.lane_id || targetTimeStr !== currentTime) {
          console.log('🎯 Moving booking from', { 
            fromLane: currentDraggedBooking.lane_id, 
            fromTime: currentTime 
          }, 'to', { targetLaneId, targetTimeStr });
          handleMoveBooking(currentDraggedBooking, targetLaneId, targetTimeStr);
        } else {
          console.log('🎯 Same position - no move needed');
        }
      } else {
        console.log('🎯 No valid drop target found');
      }
    } else if (currentDraggedBooking && !wasDragging) {
      // Short tap - open modal
      console.log('🎯 Short tap detected - opening modal');
      handleBookingClick(currentDraggedBooking, event);
    }
    
    // Reset state
    setDraggedBooking(null);
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  };

  // Función para mover la reserva
  const handleMoveBooking = async (booking: any, newLaneId: string, newTimeStr: string) => {
    if (!moveMode) return;
    try {
      // Calcular nueva fecha/hora
      const currentDate = parseISO(booking.booking_datetime);
      const [newHours, newMinutes] = newTimeStr.split(':').map(Number);
      
      const newDateTime = new Date(currentDate);
      newDateTime.setHours(newHours, newMinutes, 0, 0);
      
      console.log('🚚 Moving booking:', {
        bookingId: booking.id,
        from: { laneId: booking.lane_id, time: format(parseISO(booking.booking_datetime), 'HH:mm') },
        to: { laneId: newLaneId, time: newTimeStr }
      });
      
      // Importar supabase client para actualizar la reserva
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { error } = await supabase
        .from('bookings')
        .update({ 
          lane_id: newLaneId,
          booking_datetime: newDateTime.toISOString()
        })
        .eq('id', booking.id);
      
      if (error) throw error;
      
      toast({
        title: "Reserva movida",
        description: `Reserva movida a ${newTimeStr} en carril ${centerLanes.findIndex(l => l.id === newLaneId) + 1}`,
        variant: "default"
      });
      
      // Recargar las reservas para reflejar el cambio
      window.location.reload();
      
    } catch (error) {
      console.error('Error moving booking:', error);
      toast({
        title: "Error",
        description: "No se pudo mover la reserva",
        variant: "destructive"
      });
    }
  };

  const handleBlockSlot = (laneId: string, timeStr: string, event?: React.MouseEvent | React.TouchEvent) => {
    event?.stopPropagation();
    console.log('🔒 SLOT BLOCKED:', laneId, timeStr);
    toast({
      title: "Carril bloqueado",
      description: `Carril bloqueado en ${timeStr}`,
      variant: "default"
    });
  };

  const goToPreviousDay = () => setCurrentDate(subDays(currentDate, 1));
  const goToNextDay = () => setCurrentDate(addDays(currentDate, 1));

  // Modal personalizado como en BookingManagement
  const BookingDetailsModal = () => {
    if (!selectedBooking || !showBookingDetails) return null;

    return (
      <>
        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={closeModal}
        />
        
        {/* Modal */}
        <div 
          className="fixed z-50 bg-white rounded-lg shadow-2xl border"
          style={{
            top: `${modalPosition.top}px`,
            left: `${modalPosition.left}px`,
            width: `${Math.min(350, window.innerWidth - 20)}px`,
            maxHeight: `${window.innerHeight - 40}px`,
            overflowY: 'auto'
          }}
        >
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-lg">Detalles de la Cita</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={closeModal}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Content */}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-500 text-xs">Cliente</p>
                    <p className="font-medium">{selectedBooking.profiles?.first_name || 'Cliente'}</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-500 text-xs">Servicio</p>
                    <p className="font-medium">{selectedBooking.services?.name || 'Servicio'}</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-500 text-xs">Fecha y Hora</p>
                    <p className="font-medium">
                      {format(parseISO(selectedBooking.booking_datetime), "d 'de' MMMM 'a las' HH:mm", { locale: es })}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-gray-500 text-xs">Duración</p>
                      <p className="font-medium">{selectedBooking.duration_minutes || 60} min</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Precio</p>
                      <p className="font-medium">€{((selectedBooking.total_price_cents || 0) / 100).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={closeModal}
                >
                  Cerrar
                </Button>
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => {
                    toast({
                      title: "Editar reserva",
                      description: "Función de edición en desarrollo",
                    });
                  }}
                >
                  Editar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  const currentCenter = centers.find(c => c.id === activeCenter);
  const validCenters = centers.filter(center => center.id && center.id.trim() !== '');

  const handleCenterSelect = React.useCallback((centerId: string) => {
    setActiveCenter(centerId);
    onCenterChange?.(centerId);
    const center = centers.find((c) => c.id === centerId);
    toast({
      title: "Centro cambiado",
      description: `Mostrando calendario de ${center?.name}`,
    });
  }, [centers, onCenterChange, toast]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header compacto y sticky */}
      <div className="bg-white p-3 border-b shadow-sm sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <div>
              <h1 className="text-sm font-semibold">The Nook Madrid</h1>
              <div className="mt-2 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Centro
                </p>
                {validCenters.map((center) => {
                  const isSelected = center.id === activeCenter;
                  return (
                    <button
                      key={center.id}
                      type="button"
                      onClick={() => handleCenterSelect(center.id!)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition shadow-sm",
                        isSelected
                          ? "border-blue-400 bg-blue-50 text-blue-600"
                          : "border-border bg-white text-foreground hover:bg-blue-50/40"
                      )}
                    >
                      <span className="flex flex-col gap-1 text-sm">
                        <span className="flex items-center gap-2 font-semibold">
                          <MapPin
                            className={cn(
                              "h-4 w-4",
                              isSelected ? "text-blue-500" : "text-muted-foreground"
                            )}
                          />
                          {center.name}
                        </span>
                        {center.address && (
                          <span className="text-xs font-normal text-muted-foreground">
                            {center.address}
                          </span>
                        )}
                      </span>
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full border-2",
                          isSelected ? "border-blue-500" : "border-muted-foreground/40"
                        )}
                      >
                        {isSelected ? (
                          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
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

      {/* Botones de modo - bloqueo / mover */}
      <div className="bg-white p-3 border-b shadow-sm sticky top-[120px] z-30">
        <div className="flex justify-center gap-2">
          <Button
            size="sm"
            variant={blockingMode ? "default" : "outline"}
            className={cn(
              "shadow-sm",
              blockingMode ? "bg-red-600 text-white" : "bg-white"
            )}
            onClick={() => {
              const next = !blockingMode;
              setBlockingMode(next);
              if (next) {
                setMoveMode(false);
              }
              toast({
                title: next ? "Modo bloqueo activado" : "Modo normal",
                description: next
                  ? "Toca los espacios vacíos para bloquearlos."
                  : "Puedes tocar reservas para editarlas.",
              });
            }}
          >
            <Lock className="h-4 w-4 mr-1" />
            {blockingMode ? "Desbloquear" : "Bloquear"}
          </Button>
          <Button
            size="sm"
            variant={moveMode ? "default" : "outline"}
            className={cn(
              "shadow-sm",
              moveMode ? "bg-blue-600 text-white" : "bg-white"
            )}
            onClick={() => {
              const next = !moveMode;
              setMoveMode(next);
              if (next) {
                setBlockingMode(false);
              } else {
                setDraggedBooking(null);
                setIsDragging(false);
              }
              toast({
                title: next ? "Modo mover activado" : "Modo mover desactivado",
                description: next
                  ? "Mantén pulsada una reserva y arrástrala a otro carril u hora."
                  : "Las reservas vuelven a editarse al tocarlas.",
              });
            }}
          >
            <Move className="h-4 w-4 mr-1" />
            {moveMode ? "Mover (on)" : "Mover"}
          </Button>
        </div>
        {(blockingMode || moveMode) && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {blockingMode
              ? "Pulsa los huecos libres para establecer bloqueos."
              : "Mantén pulsada una reserva y arrástrala hasta otra posición."}
          </p>
        )}
      </div>

      {/* Headers de carriles - sticky pero debajo del botón */}
      <div className="bg-white border-b sticky top-[170px] z-40">
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
                        data-lane-id={lane.id}
                        data-time-slot={timeStr}
                        className={cn(
                          "border-r border-gray-200 last:border-r-0 p-1 min-h-[40px] relative bg-white",
                          blockingMode ? "hover:bg-red-50 cursor-pointer" : "hover:bg-gray-50",
                          draggedBooking && "transition-colors duration-200"
                        )}
                        onClick={(e) => {
                          console.log('📱 CELL CLICKED:', { blockingMode, hasBooking: !!booking, moveMode });
                          if (moveMode) {
                            return;
                          }
                          if (blockingMode && !booking) {
                            handleBlockSlot(lane.id, timeStr, e);
                            return;
                          }

                          if (!blockingMode && !booking && onSlotSelect) {
                            if (!activeCenter) {
                              toast({
                                title: "Selecciona un centro",
                                description: "Elige un centro antes de crear una reserva.",
                              });
                              return;
                            }
                            const slotDate = new Date(currentDate);
                            slotDate.setHours(hour, minute, 0, 0);
                            onSlotSelect(activeCenter, lane.id, new Date(currentDate), slotDate, e);
                          }
                        }}
                      >
                        {blockingMode && !booking && (
                          <div className="absolute top-1 right-1">
                            <Lock className="h-3 w-3 text-red-500" />
                          </div>
                        )}
                        {isStartOfBooking && booking && (
                          <div
                            className={cn(
                              "w-full rounded text-left cursor-pointer p-1 border-l-4 absolute top-0 left-0 select-none touch-manipulation",
                              draggedBooking?.id === booking.id && "opacity-70 z-50 scale-105 shadow-lg"
                            )}
                            style={{
                              ...getBookingColorClasses(booking.service_id),
                              height: `${((booking.duration_minutes || 60) / 5) * 40}px`,
                              zIndex: draggedBooking?.id === booking.id ? 50 : 10,
                              transform: draggedBooking?.id === booking.id ? 'scale(1.05)' : 'scale(1)',
                              transition: 'transform 0.2s ease, opacity 0.2s ease'
                            }}
                            onTouchStart={(e) => handleTouchStart(booking, e)}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            onClick={(e) => {
                              // Only handle click if it wasn't a drag operation
                              if (moveMode) {
                                return;
                              }
                              if (!isDragging && !draggedBooking) {
                                e.stopPropagation();
                                console.log('📱 BOOKING CLICKED ON MOBILE:', booking);
                                handleBookingClick(booking, e);
                              }
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
                             {booking.notes && (
                               <div className="text-xs text-gray-500 mt-1 truncate italic">
                                 "📝 {booking.notes}"
                               </div>
                             )}
                             {booking.client_notes && booking.client_notes.length > 0 && (
                               <div className="text-xs text-orange-600 mt-1 truncate italic">
                                 "🔔 {booking.client_notes[0].content}"
                               </div>
                             )}
                          </div>
                        )}
                        {isOccupied && !isStartOfBooking && (
                          <div className="w-full h-full opacity-30 pointer-events-none" 
                               style={{ backgroundColor: `${getServiceLaneColor(filteredBookings.find(b => isSlotOccupied(lane.id, timeStr) && b.lane_id === lane.id)?.service_id || '')}20` }}>
                          </div>
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

      {/* Modal responsive */}
      <BookingDetailsModal />

    </div>
  );
};

export default MobileCalendarView;
