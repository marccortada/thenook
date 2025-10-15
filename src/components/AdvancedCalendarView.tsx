import React, { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileCalendarView from '@/components/MobileCalendarView';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  Save,
  X,
  Check,
  CheckCircle2,
  Ban,
  Trash2,
  Move
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, addDays, subDays, startOfDay, addMinutes, isSameDay, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

import { useBookings, useCenters, useLanes, useServices } from '@/hooks/useDatabase';
import { useTreatmentGroups } from '@/hooks/useTreatmentGroups';
import { useClients } from '@/hooks/useClients';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ClientSelector from '@/components/ClientSelector';
import RepeatClientSelector from './RepeatClientSelector';
import ClientSelectionModal from './ClientSelectionModal';
import { useLaneBlocks } from '@/hooks/useLaneBlocks';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import { useInternalCodes } from '@/hooks/useInternalCodes';

interface TimeSlot {
  time: Date;
  hour: string;
}

interface BookingFormData {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  centerId: string;
  laneId: string;
  serviceId: string;
  date: Date;
  timeSlot: Date;
  notes: string;
  isWalkIn?: boolean;
  saveAsClient?: boolean;
}

interface Booking {
  id: string;
  booking_datetime: string;
  duration_minutes: number;
  total_price_cents: number;
  status: string;
  payment_status: string;
  notes?: string;
  booking_codes?: string[];
  client_id?: string;
  service_id?: string;
  center_id?: string;
  lane_id?: string;
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

const AdvancedCalendarView = () => {
  console.log('🔍 AdvancedCalendarView RENDER - Location:', window.location.pathname);
  const { toast } = useToast();
  const { isAdmin, isEmployee } = useSimpleAuth();
  const isMobile = useIsMobile();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [selectedCenter, setSelectedCenter] = useState<string>('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const [selectedSlot, setSelectedSlot] = useState<{ centerId: string; laneId: string; timeSlot: Date } | null>(null);
  
  // Lane blocking / move state
  const [blockingMode, setBlockingMode] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [blockStartSlot, setBlockStartSlot] = useState<{ laneId: string; timeSlot: Date } | null>(null);
  const [blockEndSlot, setBlockEndSlot] = useState<{ laneId: string; timeSlot: Date } | null>(null);
  
  // Drag selection state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ centerId: string; laneId: string; timeSlot: Date } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ centerId: string; laneId: string; timeSlot: Date } | null>(null);
  const [dragMode, setDragMode] = useState<'booking' | 'block'>('booking'); // Modo de arrastre

  const [createClientId, setCreateClientId] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any | null>(null);
  const [editClientId, setEditClientId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editPaymentStatus, setEditPaymentStatus] = useState<'pending' | 'paid' | 'failed' | 'refunded' | 'partial_refund'>('pending');
  const [editBookingStatus, setEditBookingStatus] = useState<'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | 'requested' | 'new' | 'online'>('pending');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editServiceId, setEditServiceId] = useState<string>('');
  const [editDuration, setEditDuration] = useState<number>(60);
  const [editTime, setEditTime] = useState<Date>(new Date());
  const [editBookingCodes, setEditBookingCodes] = useState<string[]>([]);
  
  // Form state
  const [bookingForm, setBookingForm] = useState<BookingFormData>({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    centerId: '',
    laneId: '',
    serviceId: '',
    date: new Date(),
    timeSlot: new Date(),
    notes: ''
  });

  // Canje en flujo de reserva
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemAmountEUR, setRedeemAmountEUR] = useState<number | undefined>(undefined);
  const [redeemNotes, setRedeemNotes] = useState('');
  const [redeemOnCreate, setRedeemOnCreate] = useState(false);

  const { bookings, loading: bookingsLoading, refetch: refetchBookings } = useBookings();
  
  // Debug bookings
  useEffect(() => {
    console.log('AdvancedCalendarView - Bookings loaded:', bookings.length, bookings);
    console.log('AdvancedCalendarView - Selected center:', selectedCenter);
  }, [bookings, selectedCenter]);
  const { centers } = useCenters();
  const { lanes } = useLanes();
  const { services } = useServices();
  const { updateClient } = useClients();
  const { laneBlocks, createLaneBlock, deleteLaneBlock, isLaneBlocked } = useLaneBlocks();
  const { treatmentGroups } = useTreatmentGroups();
  const { codes, assignments, getAssignmentsByEntity } = useInternalCodes();


  // Function to get color for a lane based on its assigned treatment group (DEPRECATED - USE getServiceLaneColor instead)
  const getLaneColor = (laneId: string, centerId: string) => {
    // This function should no longer be used - use getServiceLaneColor with actual service data
    return '#3B82F6'; // Default blue
  };

  // Function to get lane assignment based on service treatment group
  const getLaneForService = (serviceId: string, centerId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service || !service.group_id) return null;

    const centerLanes = lanes.filter(l => l.center_id === centerId && l.active);
    const serviceGroup = treatmentGroups.find(tg => tg.id === service.group_id);
    
    if (!serviceGroup) return centerLanes[0] || null;

    // Map service groups to lane positions
    let laneIndex = 0;
    if (serviceGroup.name?.includes('Masajes') && !serviceGroup.name?.includes('Cuatro Manos')) {
      laneIndex = 0; // Carril 1 - Masajes (Azul)
    } else if (serviceGroup.name?.includes('Tratamientos')) {
      laneIndex = 1; // Carril 2 - Tratamientos (Verde)
    } else if (serviceGroup.name?.includes('Rituales')) {
      laneIndex = 2; // Carril 3 - Rituales (Lila)
    } else if (serviceGroup.name?.includes('Cuatro Manos')) {
      laneIndex = 3; // Carril 4 - Masajes a Cuatro Manos (Amarillo)
    }
    
    return centerLanes[laneIndex] || centerLanes[0];
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

  // Real-time subscription for bookings
  useEffect(() => {
    const channel = supabase
      .channel('calendar-bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          console.log('Calendar: Booking change detected:', payload);
          refetchBookings(); // Refetch bookings when changes occur
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchBookings]);

  // Set initial center when centers load
  useEffect(() => {
    if (centers.length > 0 && !selectedCenter) {
      const firstCenter = centers[0].id;
      setSelectedCenter(firstCenter);
      console.log('🏢 Setting initial center:', firstCenter, centers[0].name);
    }
  }, [centers, selectedCenter]);

  // Reset drag state when dragging stops globally
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setDragStart(null);
        setDragEnd(null);
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging]);

  // Check if a slot is in the drag selection
  const isSlotInDragSelection = (laneId: string, timeSlot: Date) => {
    if (!isDragging || !dragStart || !dragEnd || dragStart.laneId !== laneId) return false;
    
    const startTime = dragStart.timeSlot < dragEnd.timeSlot ? dragStart.timeSlot : dragEnd.timeSlot;
    const endTime = dragStart.timeSlot < dragEnd.timeSlot ? dragEnd.timeSlot : dragStart.timeSlot;
    
    return timeSlot >= startTime && timeSlot <= endTime;
  };

  // Generate time slots from 10:00 to 22:00 every 5 minutes
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const base = startOfDay(selectedDate);
    for (let hour = 10; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 5) {
        if (hour === 22 && minute > 0) break; // Stop at 22:00 exactly
        const time = new Date(base);
        time.setHours(hour, minute, 0, 0);
        slots.push({
          time,
          hour: format(time, 'HH:mm')
        });
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Time options for selects: every 5 minutes from 10:00 to 22:00
  const timeOptions5m = React.useMemo(() => {
    const opts: string[] = [];
    const base = startOfDay(selectedDate);
    const start = new Date(base); start.setHours(10, 0, 0, 0);
    const end = new Date(base); end.setHours(22, 0, 0, 0);
    const cur = new Date(start);
    while (cur <= end) {
      opts.push(format(cur, 'HH:mm'));
      cur.setMinutes(cur.getMinutes() + 5);
    }
    return opts;
  }, [selectedDate]);

  // Get dates for week view
  const getWeekDates = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Start on Monday
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  };

  // Get lanes for selected center (show all active lanes for better view)
  const getCenterLanes = (centerId: string) => {
    return lanes
      .filter(lane => lane.center_id === centerId && lane.active)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  // Get booking for specific slot - now with filtering
  const getBookingForSlot = (centerId: string, laneId: string, date: Date, timeSlot: Date) => {
    console.log('Looking for booking:', { centerId, laneId, date: date.toISOString(), timeSlot: timeSlot.toISOString() });
    console.log('Available bookings:', bookings.length);
    
    const booking = bookings.find(booking => {
      if (!booking.booking_datetime || booking.center_id !== centerId) {
        return false;
      }
      
      const bookingDateTime = parseISO(booking.booking_datetime);
      const bookingDate = new Date(bookingDateTime.getFullYear(), bookingDateTime.getMonth(), bookingDateTime.getDate());
      const selectedDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      if (!isSameDay(bookingDate, selectedDateOnly)) {
        return false;
      }
      
      const bookingStart = bookingDateTime;
      const bookingEnd = addMinutes(bookingStart, booking.duration_minutes || 60);
      
      // Para 55 minutos: ocupar las 11 slots correctas (10:00 hasta 10:50)
      // Pero visualmente llegar hasta 10:55 con la altura
      const isTimeMatch = timeSlot >= bookingStart && timeSlot < bookingEnd;
      if (!isTimeMatch) return false;
      
      // Check if booking is specifically assigned to this lane (if lane_id exists)
      if (booking.lane_id) {
        return booking.lane_id === laneId;
      }
      
      // If no lane_id, show in the lane based on treatment group (legacy behavior)
      const service = services.find(s => s.id === booking.service_id);
      const serviceGroup = service?.group_id ? treatmentGroups.find(tg => tg.id === service.group_id) : null;
      
      // Get the expected lane index for this service's group
      let expectedLaneIndex = 0;
      if (serviceGroup?.name) {
        if (serviceGroup.name.includes('Masajes') && !serviceGroup.name.includes('Cuatro Manos')) {
          expectedLaneIndex = 0; // Carril 1 - Masajes (Azul)
        } else if (serviceGroup.name.includes('Tratamientos')) {
          expectedLaneIndex = 1; // Carril 2 - Tratamientos (Verde)
        } else if (serviceGroup.name.includes('Rituales')) {
          expectedLaneIndex = 2; // Carril 3 - Rituales (Lila)
        } else if (serviceGroup.name.includes('Cuatro Manos')) {
          expectedLaneIndex = 3; // Carril 4 - Masajes a Cuatro Manos (Amarillo)
        }
      }
      
      // Get the current lane index
      const centerLanes = lanes.filter(l => l.center_id === centerId && l.active);
      const currentLaneIndex = centerLanes.findIndex(l => l.id === laneId);
      
      // Show booking in the expected lane for its service group only if no specific lane assigned
      return currentLaneIndex === expectedLaneIndex;
    });

    console.log('Found booking:', booking ? booking.id : 'none');

    // Always show all bookings
    return booking;
  };

  // Calculate availability for a time slot considering both bookings and blocks
  const getSlotAvailability = (centerId: string, date: Date, timeSlot: Date) => {
    const centerLanes = getCenterLanes(centerId);
    const totalLanes = centerLanes.length;
    
    // Count booked lanes for this time slot
    const bookedLanes = centerLanes.filter(lane => 
      getBookingForSlot(centerId, lane.id, date, timeSlot)
    ).length;
    
    // Count blocked lanes for this time slot
    const blockedLanes = centerLanes.filter(lane => 
      isLaneBlocked(lane.id, timeSlot)
    ).length;
    
    const availableLanes = totalLanes - bookedLanes - blockedLanes;
    
    return {
      total: totalLanes,
      booked: bookedLanes,
      blocked: blockedLanes,
      available: Math.max(0, availableLanes),
      isFullyBooked: availableLanes <= 0
    };
  };

  // Handle mouse down for drag start
  const handleSlotMouseDown = (centerId: string, laneId: string, date: Date, timeSlot: Date, event: React.MouseEvent) => {
    if (moveMode) {
      return;
    }

    event.preventDefault();
    
    // Si estamos en modo bloqueo tradicional
    if (blockingMode) {
      handleBlockingSlotClick(laneId, timeSlot);
      return;
    }

    // Verificar si hay una reserva existente
    const existingBooking = getBookingForSlot(centerId, laneId, date, timeSlot);
    if (existingBooking) {
      // Abrir modal de edición
      handleSlotClick(centerId, laneId, date, timeSlot, event);
      return;
    }

    // Iniciar drag selection
    setIsDragging(true);
    setDragStart({ centerId, laneId, timeSlot });
    setDragEnd({ centerId, laneId, timeSlot });
    
    // Determinar modo de arrastre basado en las teclas modificadoras
    setDragMode(event.shiftKey ? 'block' : 'booking');
  };

  // Handle mouse enter for drag
  const handleSlotMouseEnter = (centerId: string, laneId: string, date: Date, timeSlot: Date) => {
    if (moveMode) return;
    if (isDragging && dragStart && dragStart.laneId === laneId) {
      setDragEnd({ centerId, laneId, timeSlot });
    }
  };

  const updateModalPosition = React.useCallback((target?: HTMLElement | null) => {
    if (typeof window === 'undefined') {
      setModalPosition({ top: 100, left: 100 });
      return;
    }

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + windowHeight;

    const modalWidth = windowWidth < 768 ? Math.max(280, windowWidth - 32) : Math.min(520, windowWidth - 48);
    const modalHeight = Math.min(windowHeight - 40, windowWidth < 768 ? windowHeight - 32 : 720);

    let top = scrollTop + (windowHeight - modalHeight) / 2;
    let left = (windowWidth - modalWidth) / 2;

    top = Math.max(viewportTop + 16, Math.min(top, viewportBottom - modalHeight - 16));
    left = Math.max(16, Math.min(left, windowWidth - modalWidth - 16));

    setModalPosition({ top, left });
  }, []);

  const getModalStyle = React.useCallback((): React.CSSProperties => {
    if (typeof window === 'undefined') {
      return {
        top: `${modalPosition.top}px`,
        left: `${modalPosition.left}px`,
        width: '520px',
        maxHeight: '85vh'
      };
    }

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const width = windowWidth < 768 ? Math.max(280, windowWidth - 32) : Math.min(520, windowWidth - 48);
    const maxHeight = Math.min(windowHeight - 40, windowWidth < 768 ? windowHeight - 32 : 720);

    return {
      top: `${modalPosition.top}px`,
      left: `${modalPosition.left}px`,
      width: `${width}px`,
      maxHeight: `${maxHeight}px`
    };
  }, [modalPosition]);

  // Handle mouse up for drag end
  const handleSlotMouseUp = (centerId: string, laneId: string, date: Date, timeSlot: Date, event: React.MouseEvent) => {
    if (moveMode) return;
    if (!isDragging || !dragStart) return;
    
    setIsDragging(false);
    
    // Si solo se hizo click sin arrastrar
    if (dragStart.timeSlot.getTime() === timeSlot.getTime()) {
      handleSlotClick(centerId, laneId, date, timeSlot, event);
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    // Determinar rango de tiempo
    const startTime = dragStart.timeSlot < timeSlot ? dragStart.timeSlot : timeSlot;
    const endTime = dragStart.timeSlot < timeSlot ? timeSlot : dragStart.timeSlot;
    
    if (dragMode === 'block') {
      // Crear bloqueo
      const blockEndTime = new Date(endTime);
      blockEndTime.setMinutes(blockEndTime.getMinutes() + 5); // Añadir 5 min para que sea un rango
      createLaneBlock(selectedCenter, laneId, startTime, blockEndTime, 'Bloqueo por arrastre');
    } else {
      // Crear reserva con duración calculada
      const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60) + 5; // +5 para incluir el slot final
      
      // Calcular posición del modal
      updateModalPosition(event?.currentTarget as HTMLElement | null);

      // Configurar formulario de reserva
      setSelectedSlot({ centerId, laneId, timeSlot: startTime });
      setBookingForm({
        ...bookingForm,
        centerId,
        laneId,
        date,
        timeSlot: startTime,
      });
      
      // Preseleccionar duración basada en el arrastre
      const suggestedService = services.find(s => 
        Math.abs((s.duration_minutes || 60) - durationMinutes) <= 10
      );
      if (suggestedService) {
        setBookingForm(prev => ({ ...prev, serviceId: suggestedService.id }));
      }
      
      setShowBookingModal(true);
    }
    
    setDragStart(null);
    setDragEnd(null);
  };

  // Handle slot click
  const handleSlotClick = (centerId: string, laneId: string, date: Date, timeSlot: Date, event?: React.MouseEvent) => {
    // Si estamos en modo bloqueo
    if (blockingMode) {
      handleBlockingSlotClick(laneId, timeSlot);
      return;
    }

    if (moveMode) {
      return;
    }

    // Calcular posición del modal basada en el elemento clickeado
    updateModalPosition(event?.currentTarget as HTMLElement | null);

    const existingBooking = getBookingForSlot(centerId, laneId, date, timeSlot);
    
    if (existingBooking) {
      setEditingBooking(existingBooking);
      setEditClientId(existingBooking.client_id || null);
      setEditNotes(existingBooking.notes || '');
      setEditPaymentStatus(existingBooking.payment_status || 'pending');
      setEditBookingStatus(existingBooking.status || 'pending');
      setEditServiceId(existingBooking.service_id || '');
      setEditDuration(existingBooking.duration_minutes || 60);
      const dt = parseISO(existingBooking.booking_datetime);
      setEditTime(dt);
      setEditName(`${existingBooking.profiles?.first_name || ''} ${existingBooking.profiles?.last_name || ''}`.trim());
      setEditEmail(existingBooking.profiles?.email || '');
      setEditPhone(existingBooking.profiles?.phone || '');
      setEditBookingCodes(existingBooking.booking_codes || []);
      setShowEditModal(true);
      return;
    }

    // Open new booking modal
    setSelectedSlot({ centerId, laneId, timeSlot });
    setBookingForm({
      ...bookingForm,
      centerId,
      laneId,
      date,
      timeSlot,
    });
    setShowBookingModal(true);
  };

  // Handle blocking mode slot clicks
  const handleBlockingSlotClick = (laneId: string, timeSlot: Date) => {
    if (!blockStartSlot) {
      setBlockStartSlot({ laneId, timeSlot });
    } else if (blockStartSlot.laneId === laneId) {
      // Same lane, set end slot and create block
      const startTime = blockStartSlot.timeSlot < timeSlot ? blockStartSlot.timeSlot : timeSlot;
      const endTime = blockStartSlot.timeSlot < timeSlot ? timeSlot : blockStartSlot.timeSlot;
      
      // Add 30 minutes to end time to make it a proper time range
      const blockEndTime = new Date(endTime);
      blockEndTime.setMinutes(blockEndTime.getMinutes() + 30);
      
      createLaneBlock(selectedCenter, laneId, startTime, blockEndTime, 'Bloqueo manual');
      
      // Reset blocking mode
      setBlockingMode(false);
      setBlockStartSlot(null);
      setBlockEndSlot(null);
    } else {
      // Different lane, reset and start new selection
      setBlockStartSlot({ laneId, timeSlot });
    }
  };

  // Create booking
  const createBooking = async () => {
    try {
      if (!bookingForm.serviceId) {
        toast({ title: 'Error', description: 'Selecciona un servicio', variant: 'destructive' });
        return;
      }
      if (!bookingForm.isWalkIn && !createClientId && !bookingForm.clientEmail) {
        toast({ title: 'Error', description: 'Selecciona un cliente o introduce email', variant: 'destructive' });
        return;
      }
      // If WALK IN without a name, use a sensible default so it can be saved
      const walkInName = bookingForm.isWalkIn ? (bookingForm.clientName?.trim() || 'Walk-in') : bookingForm.clientName;

      // Check availability before creating booking
      const availability = getSlotAvailability(bookingForm.centerId, bookingForm.date, bookingForm.timeSlot);
      if (availability.isFullyBooked) {
        toast({ 
          title: 'No disponible', 
          description: 'No hay carriles disponibles en esta hora. Selecciona otra hora.', 
          variant: 'destructive' 
        });
        return;
      }

      // Determine client profile
      let clientIdToUse: string | null = createClientId;
      
      // For walk-in bookings, decide if we need to create a client profile
      if (bookingForm.isWalkIn) {
        if (bookingForm.saveAsClient) {
          console.log('🏃‍♂️ Creando perfil de cliente para WALK IN:', {
            name: bookingForm.clientName,
            phone: bookingForm.clientPhone,
            email: bookingForm.clientEmail
          });
          
          // Create a new client profile for the walk-in
          const { data: newProfile, error: profileError } = await supabase
            .from('profiles')
            .insert([{
              first_name: bookingForm.clientName.split(' ')[0],
              last_name: bookingForm.clientName.split(' ').slice(1).join(' ') || '',
              phone: bookingForm.clientPhone || null,
              email: bookingForm.clientEmail || null,
              role: 'client'
            }])
            .select('id')
            .single();
          
          if (profileError) {
            console.error('❌ Error al crear cliente WALK IN:', profileError);
            throw profileError;
          }
          
          console.log('✅ Cliente WALK IN creado exitosamente:', newProfile);
          clientIdToUse = (newProfile as any).id as string;
        } else {
          console.log('🚶‍♂️ WALK IN sin guardar como cliente:', bookingForm.clientName);
          // Walk-in without saving as client - no client profile needed
          clientIdToUse = null;
        }
      } else {
        // Regular booking logic - create/find client profile
        if (!clientIdToUse && bookingForm.clientEmail) {
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', bookingForm.clientEmail)
            .maybeSingle();
          if (existingProfile) {
            clientIdToUse = existingProfile.id as string;
            await updateClient(existingProfile.id as string, {
              first_name: bookingForm.clientName.split(' ')[0],
              last_name: bookingForm.clientName.split(' ').slice(1).join(' '),
              phone: bookingForm.clientPhone,
              email: bookingForm.clientEmail,
            });
          } else {
            const { data: newProfile, error: profileError } = await supabase
              .from('profiles')
              .insert([{
                email: bookingForm.clientEmail,
                first_name: bookingForm.clientName.split(' ')[0],
                last_name: bookingForm.clientName.split(' ').slice(1).join(' '),
                phone: bookingForm.clientPhone,
                role: 'client'
              }])
              .select('id')
              .single();
            if (profileError) throw profileError;
            clientIdToUse = (newProfile as any).id as string;
          }
        }
      }

      // Get service details
      const selectedService = services.find(s => s.id === bookingForm.serviceId);
      if (!selectedService) throw new Error('Servicio no encontrado');

      // Use the specific lane and time slot that the user clicked on
      let assignedLaneId = bookingForm.laneId;
      
      // Only auto-assign lane if no specific lane was selected (shouldn't happen with slot clicks)
      if (!assignedLaneId) {
        const recommendedLane = getLaneForService(bookingForm.serviceId, bookingForm.centerId);
        if (recommendedLane) {
          assignedLaneId = recommendedLane.id;
          console.log('Auto-assigned lane for service (no specific slot):', { serviceId: bookingForm.serviceId, laneId: assignedLaneId, laneName: recommendedLane.name });
        }
      } else {
        console.log('Using user-selected lane from slot click:', { laneId: assignedLaneId, timeSlot: bookingForm.timeSlot });
      }

      // Create booking datetime
      const bookingDateTime = new Date(bookingForm.date);
      const timeSlotHours = bookingForm.timeSlot.getHours();
      const timeSlotMinutes = bookingForm.timeSlot.getMinutes();
      bookingDateTime.setHours(timeSlotHours, timeSlotMinutes, 0, 0);

      const { data: created, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          client_id: clientIdToUse,
          service_id: bookingForm.serviceId,
          center_id: bookingForm.centerId,
          lane_id: assignedLaneId,
          booking_datetime: bookingDateTime.toISOString(),
          duration_minutes: selectedService.duration_minutes,
          total_price_cents: selectedService.price_cents,
          status: 'confirmed' as const,
          channel: 'web' as const,
          notes: bookingForm.notes || null,
          payment_status: 'pending' as const
        })
        .select('id')
        .single();

      if (bookingError) throw bookingError;

      // Canjear código si procede
      if (redeemOnCreate && redeemCode) {
        try {
          const amountCents = redeemAmountEUR && redeemAmountEUR > 0 ? Math.round(redeemAmountEUR * 100) : null;
          const { data: redeemData, error: redeemError } = await (supabase as any).rpc('redeem_voucher_code', {
            p_code: redeemCode.trim(),
            p_booking_id: created?.id || null,
            p_amount_cents: amountCents,
            p_notes: redeemNotes || null,
          });
          if (redeemError) throw redeemError;
          toast({ title: '🎫 Canje aplicado', description: 'Se aplicó el bono/tarjeta a la reserva.' });

          if (redeemData?.kind === 'package' && redeemData?.client_package_id) {
            try {
              await supabase.functions.invoke('send-voucher-remaining', {
                body: { client_package_id: redeemData.client_package_id },
              });
            } catch (notifyErr) {
              console.warn('No se pudo enviar email de saldo del bono:', notifyErr);
            }
          }
        } catch (e: any) {
          toast({ title: 'Canje no aplicado', description: e.message || 'Revisa el código o el importe', variant: 'destructive' });
        }
      }

      const successMessage = bookingForm.isWalkIn 
        ? (bookingForm.saveAsClient 
            ? `✅ Reserva WALK IN creada y cliente ${walkInName} guardado para futuras visitas`
            : `✅ Reserva WALK IN creada${walkInName ? ` para ${walkInName}` : ''}`)
        : '✅ Reserva Creada';
      
      toast({ title: successMessage, description: 'Reserva creada correctamente.' });

      setShowBookingModal(false);
      setSelectedSlot(null);
      setCreateClientId(null);
      setRedeemCode('');
      setRedeemAmountEUR(undefined);
      setRedeemNotes('');
      setRedeemOnCreate(false);
      setBookingForm({
        clientName: '',
        clientPhone: '',
        clientEmail: '',
        centerId: '',
        laneId: '',
        serviceId: '',
        date: new Date(),
        timeSlot: new Date(),
        notes: ''
      });

      await refetchBookings();
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({ title: 'Error', description: 'No se pudo crear la reserva.', variant: 'destructive' });
    }
  };

  // Move booking to new slot
  const moveBooking = async (bookingId: string, newCenterId: string, newLaneId: string, newDate: Date, newTime: Date) => {
    try {
      // Create the exact datetime for the new position
      const newDateTime = new Date(newDate);
      newDateTime.setHours(newTime.getHours(), newTime.getMinutes(), 0, 0);

      console.log('📍 Moving booking:', {
        bookingId,
        from: bookings.find(b => b.id === bookingId)?.booking_datetime,
        to: newDateTime.toISOString(),
        lane: newLaneId
      });

      const { error } = await supabase
        .from('bookings')
        .update({
          center_id: newCenterId,
          lane_id: newLaneId,
          booking_datetime: newDateTime.toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;

      toast({ title: 'Reserva movida', description: 'La reserva se ha movido correctamente.' });
      await refetchBookings();
    } catch (error) {
      console.error('Error moving booking:', error);
      toast({ title: 'Error', description: 'No se pudo mover la reserva.', variant: 'destructive' });
    }
  };


  // Edit existing booking
  const saveBookingEdits = async (overrides?: { paymentStatus?: typeof editPaymentStatus; bookingStatus?: typeof editBookingStatus }) => {
    try {
      if (!editingBooking) return;

      // Update client profile if requested
      if (editClientId) {
        const [first, ...rest] = editName.trim().split(' ');
        await updateClient(editClientId, {
          first_name: first || undefined,
          last_name: rest.join(' ') || undefined,
          phone: editPhone || undefined,
          email: editEmail || undefined,
        });
      }

      // Build booking updates
      const baseDate = parseISO(editingBooking.booking_datetime);
      const newDateTime = new Date(baseDate);
      newDateTime.setHours(editTime.getHours(), editTime.getMinutes(), 0, 0);

      const paymentStatusToSave = overrides?.paymentStatus ?? editPaymentStatus;
      const bookingStatusToSave = overrides?.bookingStatus ?? editBookingStatus;

      if (editingBooking.payment_status === 'paid' && paymentStatusToSave === 'paid') {
        toast({ title: 'Pago ya registrado', description: 'Esta reserva ya fue marcada como cobrada.', variant: 'destructive' });
        return;
      }

      const updates: any = {
        notes: editNotes || null,
        payment_status: paymentStatusToSave,
        status: bookingStatusToSave,
        service_id: editServiceId || editingBooking.service_id,
        duration_minutes: editDuration || editingBooking.duration_minutes,
        booking_datetime: newDateTime.toISOString(),
        booking_codes: editBookingCodes,
      };
      if (editClientId) updates.client_id = editClientId;

      const { error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', editingBooking.id);
      if (error) throw error;

      if (overrides?.paymentStatus) setEditPaymentStatus(overrides.paymentStatus);
      if (overrides?.bookingStatus) setEditBookingStatus(overrides.bookingStatus);

      toast({ title: 'Reserva actualizada', description: 'Los cambios se han guardado correctamente.' });
      setShowEditModal(false);
      setEditingBooking(null);
      await refetchBookings();
    } catch (err) {
      console.error('Error updating booking', err);
      toast({ title: 'Error', description: 'No se pudo actualizar la reserva.', variant: 'destructive' });
    }
  };

  // Delete booking completely
  const deleteBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);
      if (error) throw error;
      toast({ title: '✅ Reserva borrada', description: 'Se eliminó la reserva.' });
      setShowEditModal(false);
      setEditingBooking(null);
      await refetchBookings();
    } catch (err) {
      console.error('Error deleting booking', err);
      toast({ title: 'Error', description: 'No se pudo borrar la reserva.', variant: 'destructive' });
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/20 border-l-green-500 text-green-700';
      case 'pending': return 'bg-yellow-500/20 border-l-yellow-500 text-yellow-700';
      case 'cancelled': return 'bg-red-500/20 border-l-red-500 text-red-700';
      case 'completed': return 'bg-blue-500/20 border-l-blue-500 text-blue-700';
      default: return 'bg-gray-500/20 border-l-gray-500 text-gray-700';
    }
  };

  // Navigation functions
  const goToPrevious = () => {
    if (viewMode === 'day') {
      setSelectedDate(subDays(selectedDate, 1));
    } else {
      setSelectedDate(subDays(selectedDate, 7));
    }
  };

  const goToNext = () => {
    if (viewMode === 'day') {
      setSelectedDate(addDays(selectedDate, 1));
    } else {
      setSelectedDate(addDays(selectedDate, 7));
    }
  };

  const goToToday = () => setSelectedDate(new Date());

  // Handle unblock lane
  const handleUnblockLane = async (blockId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    await deleteLaneBlock(blockId);
  };

  // Render day view
  const renderDayView = () => {
    if (!selectedCenter) return null;

    const centerLanes = getCenterLanes(selectedCenter);
    const centerName = centers.find(c => c.id === selectedCenter)?.name || 'Centro';

    return (
      <Card className="w-full rounded-none border-0 sm:rounded-md sm:border">
        <CardHeader className="p-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              <span className="text-sm">{centerName}</span>
              <Badge variant="secondary" className="ml-2 text-xs">
                {format(selectedDate, "d MMM", { locale: es })}
              </Badge>
            </div>
            {(isAdmin || isEmployee) && (
              <div className="flex items-center gap-2">
                <Button
                  variant={blockingMode ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => {
                    const next = !blockingMode;
                    setBlockingMode(next);
                    if (next) {
                      setMoveMode(false);
                    }
                    setBlockStartSlot(null);
                    setBlockEndSlot(null);
                  }}
                >
                  <Ban className="w-3 h-3 mr-1" />
                  {blockingMode ? 'Cancelar' : 'Bloquear'}
                </Button>
                <Button
                  variant={moveMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    const next = !moveMode;
                    setMoveMode(next);
                    if (next) {
                      setBlockingMode(false);
                      setIsDragging(false);
                      setDragStart(null);
                      setDragEnd(null);
                    }
                  }}
                >
                  <Move className="w-3 h-3 mr-1" />
                  {moveMode ? 'Mover (on)' : 'Mover'}
                </Button>
              </div>
            )}
          </CardTitle>
          {(blockingMode || moveMode) && (
            <div className="text-xs text-muted-foreground">
              {blockingMode
                ? 'Haz clic en una franja para empezar, luego en otra para definir el rango.'
                : 'Modo mover activo: arrastra una reserva y suéltala en otro carril u horario.'}
            </div>
          )}
          {!blockingMode && !moveMode && (
            <div className="text-xs text-muted-foreground">
              💡 <strong>Click y arrastra</strong> para crear reservas o <strong>Shift + arrastra</strong> para bloquear intervalos
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[85vh]">
            {/* Responsive grid based on number of lanes */}
            <div className={cn(
              "gap-0 min-w-fit select-none",
              isDragging && "cursor-grabbing",
              centerLanes.length === 1 ? "grid grid-cols-[60px_1fr]" :
              centerLanes.length === 2 ? "grid grid-cols-[60px_repeat(2,1fr)]" :
              centerLanes.length === 3 ? "grid grid-cols-[60px_repeat(3,1fr)]" :
              "grid grid-cols-[60px_repeat(4,1fr)]"
            )}>
              {/* Header */}
              <div className="sticky top-0 z-10 bg-background border-b">
                <div className="p-2 text-center font-medium border-r bg-muted/50 text-sm">
                  Hora
                </div>
              </div>
              {centerLanes.slice(0, 4).map((lane) => (
                <div key={lane.id} className="sticky top-0 z-10 bg-background border-b">
                  <div 
                    className="p-2 text-center font-medium border-r"
                    style={{ backgroundColor: `#f1f5f920`, borderLeft: `4px solid #6b7280` }}
                  >
                    <div className="font-semibold text-sm">{(lane.name || '').replace(/ra[ií]l/gi, 'Carril')}</div>
                    <div className="text-xs text-muted-foreground">Cap: {lane.capacity}</div>
                  </div>
                </div>
              ))}

              {/* Time slots */}
              {timeSlots.map((timeSlot, timeIndex) => (
                <div key={timeIndex} className="contents">
                  {/* Time label */}
                  <div className="p-1 text-center text-xs border-r border-b bg-muted/30 font-medium h-6 flex items-center justify-center">
                    {timeSlot.hour}
                  </div>

                   {/* Lane slots */}
                   {centerLanes.slice(0, 4).map((lane) => {
                     let booking = getBookingForSlot(selectedCenter, lane.id, selectedDate, timeSlot.time);
                     if (!booking && lane.id === centerLanes[0].id) {
                        const fallback = bookings.find(b => {
                          if (!b.booking_datetime || b.center_id !== selectedCenter || b.lane_id) return false;
                          const start = parseISO(b.booking_datetime);
                          const end = addMinutes(start, b.duration_minutes || 60);
                          const sameDay = isSameDay(start, selectedDate);
                          return sameDay && timeSlot.time >= start && timeSlot.time < end;
                        });
                       if (fallback) booking = fallback;
                     }
                     const isBlocked = isLaneBlocked(lane.id, timeSlot.time);
                     const isFirstSlotOfBooking = booking &&
                      format(timeSlot.time, 'HH:mm') === format(parseISO(booking.booking_datetime), 'HH:mm');

                       const isInDragSelection = isSlotInDragSelection(lane.id, timeSlot.time);
                       
                       return (
                          <div
                            key={lane.id}
                            className={cn(
                              "relative h-6 border-r border-b cursor-pointer transition-colors",
                              !booking && !isBlocked && "hover:bg-muted/20",
                              isInDragSelection && dragMode === 'booking' && "bg-blue-200/50 border-blue-400",
                              isInDragSelection && dragMode === 'block' && "bg-red-200/50 border-red-400"
                            )}
                            onMouseDown={(e) => handleSlotMouseDown(selectedCenter, lane.id, selectedDate, timeSlot.time, e)}
                            onMouseEnter={() => handleSlotMouseEnter(selectedCenter, lane.id, selectedDate, timeSlot.time)}
                            onMouseUp={(e) => handleSlotMouseUp(selectedCenter, lane.id, selectedDate, timeSlot.time, e)}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                            }}
                            onDrop={(e) => {
                              if (!moveMode) return;
                              e.preventDefault();
                              const bookingData = e.dataTransfer.getData('booking');
                              if (bookingData) {
                                const draggedBooking = JSON.parse(bookingData);
                                const laneCenterId = lane.center_id || draggedBooking.center_id || selectedCenter;
                                const dropDate = new Date(selectedDate);
                                dropDate.setHours(timeSlot.time.getHours(), timeSlot.time.getMinutes(), 0, 0);
                                console.log('🖱️ Drop detected (day view):', {
                                  bookingId: draggedBooking.id,
                                  targetLane: lane.id,
                                  targetCenter: laneCenterId,
                                  dropDate: dropDate.toISOString()
                                });
                                moveBooking(
                                  draggedBooking.id,
                                  laneCenterId,
                                  lane.id,
                                  dropDate,
                                  timeSlot.time
                                );
                              }
                            }}
                          >
                           {booking && isFirstSlotOfBooking && (
                             <div
                                className={cn(
                                  "absolute top-1 left-1 right-1 rounded border-l-4 p-2 transition-all hover:shadow-md",
                                  moveMode ? "cursor-move" : "cursor-pointer"
                                )}
                                 style={{ 
                                   backgroundColor: `${getServiceLaneColor(booking.service_id)}20`,
                                   borderLeftColor: getServiceLaneColor(booking.service_id),
                                   color: getServiceLaneColor(booking.service_id),
                                   height: `${((booking.duration_minutes || 60) / 5) * 24}px`,
                                   zIndex: 2
                                 }}
                                draggable={moveMode}
                                onDragStart={(e) => {
                                  if (!moveMode) return;
                                  // Store both booking data and the original time slot for reference
                                  const dragData = {
                                    ...booking,
                                    originalTimeSlot: timeSlot.time.toISOString()
                                  };
                                  e.dataTransfer.setData('booking', JSON.stringify(dragData));
                                  e.dataTransfer.setData('text/plain', booking.id);
                                  e.dataTransfer.effectAllowed = 'move';
                                  // Set drag image to be the booking card itself for better visual feedback
                                  e.dataTransfer.setDragImage(e.currentTarget as HTMLElement, 10, 10);
                                }}
                             >
                               <div className="flex items-start">
                                 <div className="flex-1">
                                   <div className="text-sm font-semibold truncate">{booking.profiles?.first_name} {booking.profiles?.last_name}</div>
                                   <div className="text-xs text-muted-foreground truncate">
                                     {booking.services?.name}
                                   </div>
                                   <div className="text-xs font-medium">
                                     €{((booking.total_price_cents || 0) / 100).toFixed(0)} - {format(parseISO(booking.booking_datetime), 'HH:mm')}
                                   </div>
                                   {booking.notes && (
                                     <div className="text-xs text-muted-foreground truncate italic mt-1">
                                       "📝 {booking.notes}"
                                     </div>
                                   )}
                                   {booking.client_notes && booking.client_notes.length > 0 && (
                                     <div className="text-xs text-orange-600 truncate italic mt-1">
                                       "🔔 {booking.client_notes[0].content}"
                                     </div>
                                   )}
                                 </div>
                                 {booking.payment_status === 'paid' && (
                                   <CheckCircle2 className="h-4 w-4 text-green-600" />
                                 )}
                               </div>
                           </div>
                         )}
                          {isBlocked && !booking && (
                            <div 
                              className="absolute top-1 left-1 right-1 bottom-1 rounded bg-gray-400/40 border border-gray-500/60 flex items-center justify-center"
                              onMouseDown={(e) => e.stopPropagation()}
                              onMouseEnter={(e) => e.stopPropagation()}
                              onMouseUp={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-700">BLOQUEADO</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 hover:bg-red-600 hover:text-white"
                                  onClick={(e) => handleUnblockLane(isBlocked.id, e)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                         {blockingMode && !booking && !isBlocked && (
                           <div className={cn(
                             "absolute top-1 left-1 right-1 bottom-1 rounded border-2 border-dashed transition-all",
                             blockStartSlot?.laneId === lane.id && blockStartSlot?.timeSlot.getTime() === timeSlot.time.getTime() 
                               ? "border-blue-500 bg-blue-500/10" 
                               : "border-blue-300 hover:border-blue-500 hover:bg-blue-500/5"
                           )}>
                             <div className="absolute inset-0 flex items-center justify-center">
                               <Ban className="h-4 w-4 text-blue-600" />
                             </div>
                           </div>
                         )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  };

  // Render week view - now with full functionality like day view
  const renderWeekView = () => {
    if (!selectedCenter) return null;

    const weekDates = getWeekDates();
    const centerLanes = getCenterLanes(selectedCenter);
    const centerName = centers.find(c => c.id === selectedCenter)?.name || 'Centro';

    return (
      <Card className="w-full rounded-none border-0 sm:rounded-md sm:border">
        <CardHeader className="p-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              <span className="text-sm">Vista Semanal - {centerName}</span>
              <Badge variant="secondary" className="ml-2 text-xs">
                {format(weekDates[0], "d MMM", { locale: es })} - {format(weekDates[6], "d MMM", { locale: es })}
              </Badge>
            </div>
            {(isAdmin || isEmployee) && (
              <Button
                variant={blockingMode ? "destructive" : "outline"}
                size="sm"
                onClick={() => {
                  setBlockingMode(!blockingMode);
                  setBlockStartSlot(null);
                  setBlockEndSlot(null);
                }}
              >
                <Ban className="w-3 h-3 mr-1" />
                {blockingMode ? 'Cancelar' : 'Bloquear'}
              </Button>
            )}
          </CardTitle>
          {blockingMode && (
            <div className="text-xs text-muted-foreground">
              Haz clic en una franja para empezar, luego en otra para definir el rango.
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[85vh]">
            <div className="grid grid-cols-[50px_repeat(28,1fr)] gap-0 min-w-[1200px]">
              {/* Week header */}
              <div className="sticky top-0 z-10 bg-background border-b">
                <div className="p-1 text-center font-medium border-r bg-muted/50 text-xs">Hora</div>
              </div>
              {weekDates.map((date) => 
                centerLanes.map((lane) => (
                  <div key={`${date.toISOString()}-${lane.id}`} className="sticky top-0 z-10 bg-background border-b">
                    <div 
                      className="p-1 text-center font-medium border-r"
                      style={{ backgroundColor: `#f1f5f920`, borderLeft: `3px solid #6b7280` }}
                    >
                      <div className="font-semibold text-[9px]">
                        {format(date, "EEE", { locale: es })} - {(lane.name || '').replace(/ra[ií]l/gi, 'C')}
                      </div>
                      <div className="text-[8px] text-muted-foreground">
                        {format(date, "d/M", { locale: es })}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Time slots for week view */}
              {timeSlots.map((timeSlot, timeIndex) => (
                <div key={timeIndex} className="contents">
                  {/* Time label */}
                  <div className="p-0.5 text-center text-[10px] border-r border-b bg-muted/30 font-medium h-6 flex items-center justify-center">
                    {timeSlot.hour}
                  </div>

                   {/* Week day-lane slots */}
                   {weekDates.map((date) => 
                     centerLanes.map((lane) => {
                       // Create the correct datetime for this specific day and time slot
                       const slotDateTime = new Date(date);
                       slotDateTime.setHours(timeSlot.time.getHours(), timeSlot.time.getMinutes(), 0, 0);
                       
                       const booking = getBookingForSlot(selectedCenter, lane.id, date, slotDateTime);
                       const isBlocked = isLaneBlocked(lane.id, slotDateTime);
                       const isFirstSlotOfBooking = booking &&
                         format(slotDateTime, 'HH:mm') === format(parseISO(booking.booking_datetime), 'HH:mm');

                      return (
                         <div
                           key={`${date.toISOString()}-${lane.id}`}
                           className="relative h-6 border-r border-b hover:bg-muted/30 cursor-pointer transition-colors"
                           onClick={(e) => handleSlotClick(selectedCenter, lane.id, date, slotDateTime, e)}
                           onDragOver={(e) => {
                             e.preventDefault();
                             e.dataTransfer.dropEffect = 'move';
                           }}
                           onDrop={(e) => {
                             if (!moveMode) return;
                             e.preventDefault();
                             const bookingData = e.dataTransfer.getData('booking');
                             if (bookingData) {
                               const droppedBooking = JSON.parse(bookingData);
                               const laneCenterId = lane.center_id || droppedBooking.center_id || selectedCenter;
                               console.log('🖱️ Drop detected (week view):', {
                                 bookingId: droppedBooking.id,
                                 targetLane: lane.id,
                                 targetCenter: laneCenterId,
                                 date: date.toISOString(),
                                 time: slotDateTime.toISOString()
                               });
                               moveBooking(
                                 droppedBooking.id,
                                 laneCenterId,
                                 lane.id,
                                 date,
                                 slotDateTime
                               );
                             }
                           }}
                         >
                           {booking && isFirstSlotOfBooking && (
                              <div
                                className={cn(
                                  "absolute inset-0 rounded-sm text-[8px] p-0.5 border-l-2 truncate z-10",
                                  moveMode ? "cursor-move" : "cursor-pointer"
                                )}
                                 style={{ 
                                   backgroundColor: `${getServiceLaneColor(booking.service_id)}40`,
                                   borderLeftColor: getServiceLaneColor(booking.service_id),
                                   color: getServiceLaneColor(booking.service_id),
                                    height: `${(booking.duration_minutes || 60) / 5 * 24}px`,
                                   minHeight: '24px'
                                 }}
                               draggable={moveMode}
                               onDragStart={(e) => {
                                 if (!moveMode) return;
                                 e.dataTransfer.setData('booking', JSON.stringify(booking));
                                 e.dataTransfer.setData('text/plain', booking.id);
                                 e.dataTransfer.effectAllowed = 'move';
                               }}
                             >
                               <div className="flex justify-between items-start h-full">
                                 <div className="flex-1">
                                   <div className="font-medium truncate">
                                     {booking.profiles?.first_name?.[0]}{booking.profiles?.last_name?.[0]}
                                   </div>
                                 </div>
                                 <div className="flex items-center">
                                   {booking.payment_status === 'paid' && (
                                     <CheckCircle2 className="h-2 w-2 text-green-600" />
                                   )}
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     className="h-3 w-3 p-0 hover:bg-red-500 hover:text-white ml-1"
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       deleteBooking(booking.id);
                                     }}
                                   >
                                     <X className="h-2 w-2" />
                                   </Button>
                                 </div>
                               </div>
                             </div>
                           )}
                          
                          {isBlocked && !booking && (
                            <div className="absolute inset-0 bg-gray-400/30 rounded-sm flex items-center justify-center">
                              <span className="text-[8px] font-medium text-gray-600 rotate-45">BLOCK</span>
                              {(isAdmin || isEmployee) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="absolute top-0 right-0 w-4 h-4 p-0 hover:bg-red-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const block = laneBlocks.find(block => 
                                      block.lane_id === lane.id && 
                                      timeSlot.time >= new Date(block.start_datetime) && 
                                      timeSlot.time < new Date(block.end_datetime)
                                    );
                                    if (block) {
                                      deleteLaneBlock(block.id);
                                    }
                                  }}
                                >
                                  <X className="h-2 w-2" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  };

  if (bookingsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3">Cargando calendario...</span>
      </div>
    );
  }

  // Debug info
  console.log('📅 Calendar render - Mobile:', isMobile, 'Selected center:', selectedCenter, 'Centers:', centers.length);

  // Build main view depending on viewport so mobile reuses shared modals
  const mainView = isMobile ? (
    <MobileCalendarView
      selectedDate={selectedDate}
      selectedCenter={selectedCenter}
      onCenterChange={setSelectedCenter}
      onSlotSelect={handleSlotClick}
    />
  ) : (
    <div className="space-y-4">
      {/* Header Controls - Mobile Optimized */}
      <div className="space-y-3">
        {/* Date Navigation and Mode Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoy
            </Button>
          </div>

          <div className="text-lg sm:text-xl font-semibold text-center sm:text-left">
            {viewMode === 'day'
              ? format(selectedDate, "EEEE, d 'de' MMMM yyyy", { locale: es })
              : `${format(getWeekDates()[0], "d MMM", { locale: es })} - ${format(getWeekDates()[6], "d MMM yyyy", { locale: es })}`
            }
          </div>
        </div>

        {/* Filters and Controls - Mobile Stack */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Center Selection */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Centro</label>
            <div className="space-y-2">
              {centers.map((center) => {
                const isSelected = selectedCenter === center.id;
                return (
                  <div
                    key={center.id}
                    onClick={() => {
                      console.log('🏢 Center changed:', center.id);
                      setSelectedCenter(center.id);
                    }}
                    className={cn(
                      "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all duration-200",
                      isSelected
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-background border-border hover:bg-accent/50"
                    )}
                  >
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{center.name}</p>
                    </div>
                    {isSelected && (
                      <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-white"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* View Mode Toggle - Better Mobile Layout */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Vista</label>
            <div className="flex gap-1">
              <Button
                variant={viewMode === 'day' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setViewMode('day')}
              >
                Día
              </Button>
              <Button
                variant={viewMode === 'week' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setViewMode('week')}
              >
                Semana
              </Button>
            </div>
          </div>
        </div>

        {/* Blocking Mode Info */}
        {blockingMode && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              📍 Modo bloqueo activo: Haz clic en una franja para empezar, luego en otra para definir el rango.
            </p>
          </div>
        )}
      </div>

      {/* Calendar View */}
      {viewMode === 'day' ? renderDayView() : renderWeekView()}
    </div>
  );


  const bookingModal = showBookingModal ? (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={() => setShowBookingModal(false)}
      />
      <div
        className="fixed z-50 flex"
        data-new-booking-modal
        style={{ ...getModalStyle(), maxHeight: "95vh" }}
      >
        <div className="bg-background rounded-xl shadow-2xl border border-border/60 overflow-hidden flex flex-col w-full max-h-full">
          <div className="px-6 pt-6 pb-4 border-b flex-shrink-0 bg-background relative">
            <button
              onClick={() => setShowBookingModal(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </button>
            <h3 className="text-xl font-semibold">Nueva Reserva</h3>
            <p className="text-sm text-gray-600">
              Crear una nueva reserva para el {selectedSlot && format(selectedSlot.timeSlot, 'HH:mm')} del {selectedSlot && format(bookingForm.date, "d 'de' MMMM", { locale: es })}
            </p>
            {createClientId && (
              <p className="text-sm text-primary font-medium mt-2">
                Cliente seleccionado: {bookingForm.clientName}
              </p>
            )}
          </div>

          <div className="px-6 py-6 overflow-y-auto flex-1 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="walkIn"
                  checked={bookingForm.isWalkIn || false}
                  onChange={(e) => {
                    const isWalkIn = e.target.checked;
                    setBookingForm((prev) => ({
                      ...prev,
                      isWalkIn,
                      clientName: isWalkIn ? '' : prev.clientName,
                      clientPhone: isWalkIn ? '' : prev.clientPhone,
                      clientEmail: isWalkIn ? '' : prev.clientEmail,
                    }));
                    if (isWalkIn) {
                      setCreateClientId(null);
                    }
                  }}
                  className="h-4 w-4"
                />
                <Label htmlFor="walkIn" className="text-sm font-medium">
                  WALK IN (cliente sin datos previos)
                </Label>
              </div>
              
              {bookingForm.isWalkIn && (
                <div className="flex items-center space-x-2 pl-6">
                  <input
                    type="checkbox"
                    id="saveAsClient"
                    checked={bookingForm.saveAsClient || false}
                    onChange={(e) => setBookingForm((prev) => ({
                      ...prev,
                      saveAsClient: e.target.checked
                    }))}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="saveAsClient" className="text-sm text-muted-foreground">
                    Guardar como cliente futuro
                  </Label>
                </div>
              )}
            </div>

            {!bookingForm.isWalkIn && (
              <>
                <div className="space-y-2">
                  <RepeatClientSelector
                    label="Cliente habitual (opcional)"
                    placeholder="Buscar cliente que haya venido más de una vez..."
                    onSelect={(c) => {
                      setCreateClientId(c.id);
                      setBookingForm((prev) => ({
                        ...prev,
                        clientName: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
                        clientPhone: c.phone || '',
                        clientEmail: c.email || '',
                      }));
                    }}
                  />
                </div>

                <div className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
                  <span>O crear nueva reserva para cliente nuevo:</span>
                  <ClientSelectionModal
                    onSelect={(c) => {
                      setCreateClientId(c.id);
                      setBookingForm((prev) => ({
                        ...prev,
                        clientName: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
                        clientPhone: c.phone || '',
                        clientEmail: c.email || '',
                      }));
                    }}
                  >
                    <Button 
                      variant="outline" 
                      size="sm" 
                      type="button"
                    >
                      <User className="w-4 h-4 mr-2" />
                      Ver todos los clientes
                    </Button>
                  </ClientSelectionModal>
                </div>
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName" className="text-sm font-medium">
                  {bookingForm.isWalkIn ? 'Nombre Walk-In' : 'Nombre del cliente'} {!bookingForm.isWalkIn && '*'}
                </Label>
                <Input
                  id="clientName"
                  value={bookingForm.clientName}
                  onChange={(e) => setBookingForm({ ...bookingForm, clientName: e.target.value })}
                  placeholder={bookingForm.isWalkIn ? "Nombre del cliente walk-in" : "Nombre y apellidos"}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientPhone" className="text-sm font-medium">Teléfono</Label>
                <Input
                  id="clientPhone"
                  value={bookingForm.clientPhone}
                  onChange={(e) => setBookingForm({ ...bookingForm, clientPhone: e.target.value })}
                  placeholder="+34 600 000 000"
                  className="h-11"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="clientEmail" className="text-sm font-medium">Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={bookingForm.clientEmail}
                  onChange={(e) => setBookingForm({ ...bookingForm, clientEmail: e.target.value })}
                  placeholder="cliente@example.com"
                  className="h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceId" className="text-sm font-medium">Servicio *</Label>
              <Select value={bookingForm.serviceId || undefined} onValueChange={(value) => setBookingForm({ ...bookingForm, serviceId: value })}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Seleccionar servicio" />
                </SelectTrigger>
                <SelectContent 
                  position="popper"
                  side="bottom"
                  align="center"
                  sideOffset={2}
                  avoidCollisions={true}
                  collisionPadding={8}
                  sticky="always"
                >
                  {services.filter(s => s.center_id === bookingForm.centerId || !s.center_id).map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} - {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(service.price_cents / 100)} ({service.duration_minutes} min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas internas</Label>
              <Textarea
                id="notes"
                value={bookingForm.notes || ''}
                onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                rows={3}
                placeholder="Añade notas internas..."
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t bg-background flex-shrink-0">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowBookingModal(false)}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button 
                onClick={createBooking}
                className="flex-1"
                disabled={!bookingForm.serviceId || (!bookingForm.isWalkIn && !bookingForm.clientName.trim())}
              >
                <Check className="h-4 w-4 mr-2" />
                Crear Reserva
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  ) : null;

  const editBookingModal = showEditModal && editingBooking ? (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={() => {
          setShowEditModal(false);
          setEditingBooking(null);
        }}
      />
      <div
        className="fixed z-50 bg-background rounded-lg shadow-2xl border overflow-hidden flex flex-col"
        style={getModalStyle()}
      >
        <div className="flex flex-col h-full max-h-[95vh]">
          <div className="px-6 pt-6 pb-4 border-b flex-shrink-0 bg-background">
            <h3 className="text-xl font-semibold">Editar Reserva</h3>
            <p className="text-sm text-gray-600">
              Editar reserva de {editName} para el {format(editTime, 'HH:mm')} del {format(editTime, "d 'de' MMMM", { locale: es })}
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto px-6 py-4 pb-28 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceId" className="text-sm font-medium">Servicio *</Label>
              <Select value={bookingForm.serviceId || undefined} onValueChange={(value) => setBookingForm({ ...bookingForm, serviceId: value })}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Seleccionar servicio" />
                </SelectTrigger>
                <SelectContent 
                  position="popper"
                  side="bottom"
                  align="center"
                  sideOffset={2}
                  avoidCollisions={true}
                  collisionPadding={8}
                  sticky="always"
                >
                  {services.filter(s => s.center_id === (editingBooking?.center_id || bookingForm.centerId) || !s.center_id).map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} - {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(service.price_cents / 100)} ({service.duration_minutes} min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Hora</Label>
              <Select value={format(editTime, 'HH:mm')} onValueChange={(val) => {
                const [h, m] = val.split(':').map(Number);
                const d = new Date(editTime);
                d.setHours(h, m, 0, 0);
                setEditTime(d);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent 
                  position="popper"
                  side="bottom"
                  align="center"
                  sideOffset={2}
                  avoidCollisions={true}
                  collisionPadding={8}
                  sticky="always"
                >
                  {timeOptions5m.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Duración (min)</Label>
              <Input type="number" min={15} step={15} value={editDuration} onChange={(e) => setEditDuration(parseInt(e.target.value || '60', 10))} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment">Estado de pago</Label>
                <Select value={editPaymentStatus} onValueChange={(v) => setEditPaymentStatus(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent 
                    position="popper"
                    side="bottom"
                    align="center"
                    sideOffset={2}
                    avoidCollisions={true}
                    collisionPadding={8}
                    sticky="always"
                  >
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="paid">Pagado</SelectItem>
                    <SelectItem value="failed">Fallido</SelectItem>
                    <SelectItem value="refunded">Reembolsado</SelectItem>
                    <SelectItem value="partial_refund">Reembolso Parcial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bookingStatus">Estado de reserva</Label>
                <Select value={editBookingStatus} onValueChange={(v) => setEditBookingStatus(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent 
                    position="popper"
                    side="bottom"
                    align="center"
                    sideOffset={2}
                    avoidCollisions={true}
                    collisionPadding={8}
                    sticky="always"
                  >
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="requested">Solicitada</SelectItem>
                    <SelectItem value="confirmed">Confirmada</SelectItem>
                    <SelectItem value="new">Nueva</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="completed">Completada</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                    <SelectItem value="no_show">No Show</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Códigos de la Reserva
              </Label>
              
              <div className="flex flex-wrap gap-2">
                {codes.map((code) => (
                  <Badge
                    key={code.id}
                    variant={editBookingCodes.includes(code.code) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    style={{
                      backgroundColor: editBookingCodes.includes(code.code) ? code.color : 'transparent',
                      borderColor: code.color,
                      color: editBookingCodes.includes(code.code) ? 'white' : code.color
                    }}
                    onClick={() => {
                      const newCodes = editBookingCodes.includes(code.code)
                        ? editBookingCodes.filter(c => c !== code.code)
                        : [...editBookingCodes, code.code];
                      setEditBookingCodes(newCodes);
                    }}
                  >
                    {code.code} - {code.name}
                  </Badge>
                ))}
              </div>
              
              {editingBooking?.profiles?.id && (
                <div>
                  <Label className="text-xs text-muted-foreground">Códigos del cliente:</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {getAssignmentsByEntity('client', editingBooking.profiles.id).map((assignment) => (
                      <Badge 
                        key={assignment.id}
                        variant="outline"
                        className="text-xs"
                        style={{ 
                          borderColor: assignment.code_color,
                          color: assignment.code_color,
                          backgroundColor: `${assignment.code_color}10`
                        }}
                      >
                        {assignment.code}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notesEdit">Notas internas</Label>
              <Textarea
                id="notesEdit"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={4}
                placeholder="Añade notas internas..."
              />
            </div>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  size="sm" 
                  variant="default"
                  className="flex-1"
                  onClick={() => {
                    saveBookingEdits({ paymentStatus: 'paid', bookingStatus: 'confirmed' });
                  }}
                >
                  💳 Cobrar
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive" className="flex-1">
                      <Trash2 className="h-4 w-4 mr-2" /> Borrar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="mx-4 sm:mx-auto">
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Borrar reserva?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción elimina la reserva definitivamente. No se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                      <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => deleteBooking(editingBooking?.id)}
                        className="w-full sm:w-auto"
                      >
                        Sí, borrar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => { setShowEditModal(false); setEditingBooking(null); }}
                >
                  <X className="h-4 w-4 mr-2" /> Cancelar
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => saveBookingEdits()}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" /> Guardar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  ) : null;

  return (
    <>
      {mainView}
      {bookingModal}
      {editBookingModal}
    </>
  );
};

export default AdvancedCalendarView;
