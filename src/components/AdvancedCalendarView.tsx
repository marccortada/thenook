import React, { useState, useEffect } from 'react';
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
  CheckCircle2,
  Ban,
  Trash2
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

const AdvancedCalendarView = () => {
  const { toast } = useToast();
  const { isAdmin, isEmployee } = useSimpleAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [selectedCenter, setSelectedCenter] = useState<string>('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const [selectedSlot, setSelectedSlot] = useState<{ centerId: string; laneId: string; timeSlot: Date } | null>(null);
  
  // Filter state
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  
  // Lane blocking state
  const [blockingMode, setBlockingMode] = useState(false);
  const [blockStartSlot, setBlockStartSlot] = useState<{ laneId: string; timeSlot: Date } | null>(null);
  const [blockEndSlot, setBlockEndSlot] = useState<{ laneId: string; timeSlot: Date } | null>(null);

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
    console.log('AdvancedCalendarView - Status filters:', statusFilters);
  }, [bookings, selectedCenter, statusFilters]);
  const { centers } = useCenters();
  const { lanes } = useLanes();
  const { services } = useServices();
  const { updateClient } = useClients();
  const { laneBlocks, createLaneBlock, deleteLaneBlock, isLaneBlocked } = useLaneBlocks();
  const { treatmentGroups } = useTreatmentGroups();

  // Function to get lane assignment for services based on treatment group
  const getLaneForService = (serviceId: string, centerId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service || !service.group_id) return null;

    const centerLanes = lanes.filter(l => l.center_id === centerId && l.active);
    const centerGroups = treatmentGroups.filter(tg => tg.center_id === centerId || !tg.center_id);
    
    // Find the group for this service
    const serviceGroup = centerGroups.find(tg => tg.id === service.group_id);
    if (!serviceGroup) return null;

    // Assign lanes based on group order: first group gets first lane, etc.
    const groupIndex = centerGroups.findIndex(tg => tg.id === serviceGroup.id);
    return centerLanes[groupIndex] || centerLanes[0];
  };

  // Function to get color for a lane based on its assigned treatment group
  const getLaneColor = (laneId: string, centerId: string) => {
    const centerLanes = lanes.filter(l => l.center_id === centerId && l.active);
    const laneIndex = centerLanes.findIndex(l => l.id === laneId);
    
    // Get treatment groups for this center
    const centerGroups = treatmentGroups.filter(tg => tg.center_id === centerId || !tg.center_id);
    
    // Assign each lane to a treatment group in order
    const assignedGroup = centerGroups[laneIndex];
    
    return assignedGroup?.color || '#3B82F6';
  };

  // Function to get lane color for a specific service (based on its treatment group)
  const getServiceLaneColor = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service || !service.group_id) return '#3B82F6';

    const serviceGroup = treatmentGroups.find(tg => tg.id === service.group_id);
    return serviceGroup?.color || '#3B82F6';
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
      setSelectedCenter(centers[0].id);
    }
  }, [centers, selectedCenter]);

  // Generate time slots from 9:00 to 23:00 every 5 minutes (like client's current system)
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const base = startOfDay(selectedDate);
    for (let hour = 9; hour <= 23; hour++) {
      for (let minute = 0; minute < 60; minute += 5) {
        if (hour === 23 && minute > 0) break; // Stop at 23:00
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

  // Time options for selects: every 5 minutes from 9:00 to 23:00
  const timeOptions5m = React.useMemo(() => {
    const opts: string[] = [];
    const base = startOfDay(selectedDate);
    const start = new Date(base); start.setHours(9, 0, 0, 0);
    const end = new Date(base); end.setHours(23, 0, 0, 0);
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
      if (!booking.booking_datetime || booking.center_id !== centerId || booking.lane_id !== laneId) {
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
      
      return timeSlot >= bookingStart && timeSlot < bookingEnd;
    });

    console.log('Found booking:', booking ? booking.id : 'none');

    // Apply status filters - if filters are active, only show matching bookings
    if (booking && statusFilters.length > 0) {
      console.log('Status filters active:', statusFilters, 'booking status:', booking.status);
      return statusFilters.includes(booking.status) ? booking : null;
    }

    // Always show bookings when no filters are active
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

  // Handle slot click
  const handleSlotClick = (centerId: string, laneId: string, date: Date, timeSlot: Date, event?: React.MouseEvent) => {
    // Si estamos en modo bloqueo
    if (blockingMode) {
      handleBlockingSlotClick(laneId, timeSlot);
      return;
    }

    // Calcular posición del modal basada en el elemento clickeado
    if (event?.currentTarget) {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      // Altura estimada del modal
      const estimatedModalHeight = 600;
      
      // Posición vertical: centrar en el viewport visible
      const viewportTop = scrollTop;
      const viewportBottom = scrollTop + windowHeight;
      const modalTop = Math.max(viewportTop + 20, Math.min(
        viewportTop + (windowHeight - estimatedModalHeight) / 2,
        viewportBottom - estimatedModalHeight - 20
      ));
      
      // En móvil, centrar perfectamente en la pantalla
      if (windowWidth < 768) {
        const modalWidth = windowWidth - 40; // 20px margin on each side
        setModalPosition({
          top: modalTop,
          left: (windowWidth - modalWidth) / 2 // Centrar perfectamente
        });
      } else {
        // En desktop, centrar basado en el slot clickeado
        const slotRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const slotCenterX = slotRect.left + (slotRect.width / 2);
        const modalWidth = Math.min(500, windowWidth - 40);
        setModalPosition({
          top: modalTop,
          left: Math.max(20, Math.min(slotCenterX - (modalWidth / 2), windowWidth - modalWidth - 20))
        });
      }
    }

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
      if (bookingForm.isWalkIn && !bookingForm.clientName.trim()) {
        toast({ title: 'Error', description: 'Introduce un nombre para el cliente walk-in', variant: 'destructive' });
        return;
      }

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

      // Auto-assign lane based on service treatment group
      let assignedLaneId = bookingForm.laneId;
      const recommendedLane = getLaneForService(bookingForm.serviceId, bookingForm.centerId);
      if (recommendedLane) {
        assignedLaneId = recommendedLane.id;
        console.log('Auto-assigned lane for service:', { serviceId: bookingForm.serviceId, laneId: assignedLaneId, laneName: recommendedLane.name });
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
          const { error: redeemError } = await (supabase as any).rpc('redeem_voucher_code', {
            p_code: redeemCode.trim(),
            p_booking_id: created?.id || null,
            p_amount_cents: amountCents,
            p_notes: redeemNotes || null,
          });
          if (redeemError) throw redeemError;
          toast({ title: '🎫 Canje aplicado', description: 'Se aplicó el bono/tarjeta a la reserva.' });
        } catch (e: any) {
          toast({ title: 'Canje no aplicado', description: e.message || 'Revisa el código o el importe', variant: 'destructive' });
        }
      }

      const successMessage = bookingForm.isWalkIn 
        ? (bookingForm.saveAsClient 
            ? `✅ Reserva WALK IN creada y cliente ${bookingForm.clientName} guardado para futuras visitas`
            : `✅ Reserva WALK IN creada para ${bookingForm.clientName}`)
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
      const newDateTime = new Date(newDate);
      newDateTime.setHours(newTime.getHours(), newTime.getMinutes(), 0, 0);

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
  const saveBookingEdits = async () => {
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

      const updates: any = {
        notes: editNotes || null,
        payment_status: editPaymentStatus,
        status: editBookingStatus,
        service_id: editServiceId || editingBooking.service_id,
        duration_minutes: editDuration || editingBooking.duration_minutes,
        booking_datetime: newDateTime.toISOString(),
      };
      if (editClientId) updates.client_id = editClientId;

      const { error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', editingBooking.id);
      if (error) throw error;

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
            {/* Responsive grid based on number of lanes */}
            <div className={cn(
              "gap-0 min-w-fit",
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
                    style={{ backgroundColor: `${getLaneColor(lane.id, selectedCenter)}20`, borderLeft: `4px solid ${getLaneColor(lane.id, selectedCenter)}` }}
                  >
                    <div className="font-semibold text-sm">{(lane.name || '').replace(/ra[ií]l/gi, 'Carril')}</div>
                    <div className="text-xs text-muted-foreground">Cap: {lane.capacity}</div>
                  </div>
                </div>
              ))}

              {/* Time slots */}
              {timeSlots.map((timeSlot, timeIndex) => (
                <React.Fragment key={timeIndex}>
                  {/* Time label */}
                  <div className="p-2 text-center text-sm border-r border-b bg-muted/30 font-medium h-12 flex items-center justify-center">
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

                     return (
                         <div
                           key={lane.id}
                           className="relative h-12 border-r border-b hover:bg-muted/20 cursor-pointer transition-colors"
                           onClick={(e) => handleSlotClick(selectedCenter, lane.id, selectedDate, timeSlot.time, e)}
                           onDragOver={(e) => {
                             e.preventDefault();
                             e.dataTransfer.dropEffect = 'move';
                           }}
                           onDrop={(e) => {
                             e.preventDefault();
                             const bookingData = e.dataTransfer.getData('booking');
                             if (bookingData) {
                               const booking = JSON.parse(bookingData);
                               moveBooking(booking.id, selectedCenter, lane.id, selectedDate, timeSlot.time);
                             }
                           }}
                         >
                          {booking && isFirstSlotOfBooking && (
                            <div
                               className="absolute top-1 left-1 right-1 rounded border-l-4 p-2 transition-all hover:shadow-md cursor-move"
                               style={{ 
                                 backgroundColor: `${getServiceLaneColor(booking.service_id)}20`,
                                 borderLeftColor: getServiceLaneColor(booking.service_id),
                                 color: getServiceLaneColor(booking.service_id),
                                 height: `${Math.ceil((booking.duration_minutes || 60) / 5) * 48 - 4}px`,
                                 zIndex: 2
                               }}
                              draggable={true}
                              onDragStart={(e) => {
                                e.dataTransfer.setData('booking', JSON.stringify(booking));
                                e.dataTransfer.effectAllowed = 'move';
                              }}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="text-sm font-semibold truncate">{booking.profiles?.first_name} {booking.profiles?.last_name}</div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {booking.services?.name}
                                  </div>
                                  <div className="text-xs font-medium">
                                    €{((booking.total_price_cents || 0) / 100).toFixed(0)} - {format(parseISO(booking.booking_datetime), 'HH:mm')}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  {booking.payment_status === 'paid' && (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 p-0 hover:bg-red-500 hover:text-white"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteBooking(booking.id);
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                           </div>
                         )}
                         {isBlocked && !booking && (
                           <div className="absolute top-1 left-1 right-1 bottom-1 rounded bg-gray-400/40 border border-gray-500/60 flex items-center justify-center">
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
                </React.Fragment>
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
                      style={{ backgroundColor: `${getLaneColor(lane.id, selectedCenter)}20`, borderLeft: `3px solid ${getLaneColor(lane.id, selectedCenter)}` }}
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
                <React.Fragment key={timeIndex}>
                  {/* Time label */}
                  <div className="p-0.5 text-center text-[10px] border-r border-b bg-muted/30 font-medium h-6 flex items-center justify-center">
                    {timeSlot.hour}
                  </div>

                  {/* Week day-lane slots */}
                  {weekDates.map((date) => 
                    centerLanes.map((lane) => {
                      const booking = getBookingForSlot(selectedCenter, lane.id, date, timeSlot.time);
                      const isBlocked = isLaneBlocked(lane.id, timeSlot.time);
                      const isFirstSlotOfBooking = booking &&
                        format(timeSlot.time, 'HH:mm') === format(parseISO(booking.booking_datetime), 'HH:mm');

                      return (
                         <div
                           key={`${date.toISOString()}-${lane.id}`}
                           className="relative h-6 border-r border-b hover:bg-muted/30 cursor-pointer transition-colors"
                           onClick={(e) => handleSlotClick(selectedCenter, lane.id, date, timeSlot.time, e)}
                           onDragOver={(e) => {
                             e.preventDefault();
                             e.dataTransfer.dropEffect = 'move';
                           }}
                           onDrop={(e) => {
                             e.preventDefault();
                             const bookingData = e.dataTransfer.getData('booking');
                             if (bookingData) {
                               const booking = JSON.parse(bookingData);
                               moveBooking(booking.id, selectedCenter, lane.id, date, timeSlot.time);
                             }
                           }}
                         >
                           {booking && isFirstSlotOfBooking && (
                              <div
                                className="absolute inset-0 rounded-sm text-[8px] p-0.5 border-l-2 truncate z-10 cursor-move"
                                 style={{ 
                                   backgroundColor: `${getServiceLaneColor(booking.service_id)}40`,
                                   borderLeftColor: getServiceLaneColor(booking.service_id),
                                   color: getServiceLaneColor(booking.service_id),
                                   height: `${(booking.duration_minutes || 60) / 5 * 24}px`,
                                   minHeight: '24px'
                                 }}
                               draggable={true}
                               onDragStart={(e) => {
                                 e.dataTransfer.setData('booking', JSON.stringify(booking));
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
                </React.Fragment>
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

  return (
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
            <Select value={selectedCenter} onValueChange={setSelectedCenter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona centro" />
              </SelectTrigger>
               <SelectContent 
                 position="popper"
                 side="bottom"
                 align="start"
                 sideOffset={4}
                 avoidCollisions={true}
                 collisionPadding={20}
               >
                 {centers.map((center) => (
                   <SelectItem key={center.id} value={center.id}>
                     <div className="flex items-center gap-2">
                       <MapPin className="w-4 h-4" />
                       {center.name}
                     </div>
                   </SelectItem>
                 ))}
               </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          {(isAdmin || isEmployee) && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Estado</label>
              <Select value={statusFilters.length === 0 ? "all" : statusFilters.join(',')} onValueChange={(value) => {
                if (value === "all") {
                  setStatusFilters([]);
                } else {
                  setStatusFilters(value.split(',').filter(Boolean));
                }
              }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                 <SelectContent 
                   position="popper"
                   side="bottom"
                   align="start"
                   sideOffset={4}
                   avoidCollisions={true}
                   collisionPadding={20}
                 >
                   <SelectItem value="all">Todos los estados</SelectItem>
                   <SelectItem value="no_show">Solo No Shows</SelectItem>
                   <SelectItem value="cancelled">Solo Canceladas</SelectItem>
                   <SelectItem value="pending">Solo Pendientes</SelectItem>
                   <SelectItem value="confirmed">Solo Confirmadas</SelectItem>
                   <SelectItem value="requested">Solo Solicitadas</SelectItem>
                   <SelectItem value="new">Solo Nuevas</SelectItem>
                   <SelectItem value="online">Solo Online</SelectItem>
                   <SelectItem value="completed">Solo Completadas</SelectItem>
                 </SelectContent>
              </Select>
            </div>
          )}
          
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

      {/* New Booking Modal - Positioned above clicked slot */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div 
            className="bg-background w-full max-w-md max-h-[90vh] rounded-lg shadow-xl border overflow-hidden flex flex-col"
          >
            <div className="flex flex-col h-full max-h-[90vh]">
              {/* Header - Fixed */}
              <div className="px-4 pt-4 pb-3 border-b flex-shrink-0 bg-background">
                <h3 className="text-lg font-semibold">Nueva Reserva</h3>
                <p className="text-sm text-gray-600">
                  Crear una nueva reserva para el {selectedSlot && format(selectedSlot.timeSlot, 'HH:mm')} del {selectedSlot && format(bookingForm.date, "d 'de' MMMM", { locale: es })}
                </p>
              </div>

              {/* Content - Scrollable */}
              <div className="px-4 py-4 overflow-y-auto flex-1 space-y-4">
                {/* Walk-in Toggle */}
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
                          console.log('Cliente seleccionado desde modal:', c);
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
                          onClick={() => console.log('Botón Ver todos los clientes clickeado')}
                        >
                          <User className="w-4 h-4 mr-2" />
                          Ver todos los clientes
                        </Button>
                      </ClientSelectionModal>
                    </div>
                  </>
                )}

                {/* Client Information Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="clientName" className="text-sm">
                      {bookingForm.isWalkIn ? 'Nombre Walk-In' : 'Nombre del cliente'} {!bookingForm.isWalkIn && '*'}
                    </Label>
                    <Input
                      id="clientName"
                      value={bookingForm.clientName}
                      onChange={(e) => setBookingForm({ ...bookingForm, clientName: e.target.value })}
                      placeholder={bookingForm.isWalkIn ? "Nombre del cliente walk-in" : "Nombre y apellidos"}
                      className="h-9 sm:h-10"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="clientPhone" className="text-sm">Teléfono</Label>
                    <Input
                      id="clientPhone"
                      value={bookingForm.clientPhone}
                      onChange={(e) => setBookingForm({ ...bookingForm, clientPhone: e.target.value })}
                      placeholder="+34 600 000 000"
                      className="h-9 sm:h-10"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2 sm:col-span-2">
                    <Label htmlFor="clientEmail" className="text-sm">Email</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={bookingForm.clientEmail}
                      onChange={(e) => setBookingForm({ ...bookingForm, clientEmail: e.target.value })}
                      placeholder="cliente@example.com"
                      className="h-9 sm:h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="serviceId" className="text-sm">Servicio *</Label>
                  <Select value={bookingForm.serviceId || undefined} onValueChange={(value) => setBookingForm({ ...bookingForm, serviceId: value })}>
                    <SelectTrigger className="h-9 sm:h-10">
                      <SelectValue placeholder="Seleccionar servicio" />
                    </SelectTrigger>
                    <SelectContent 
                      position="popper"
                      side="bottom"
                      align="start"
                      sideOffset={4}
                      avoidCollisions={true}
                      collisionPadding={20}
                    >
                      {services.filter(s => s.center_id === bookingForm.centerId || !s.center_id).map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} - {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(service.price_cents / 100)} ({service.duration_minutes} min)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="space-y-2 md:col-span-1">
                    <Label>Fecha</Label>
                    <Input
                      type="date"
                      value={format(bookingForm.date, 'yyyy-MM-dd')}
                      onChange={(e) => {
                        const date = new Date(e.target.value);
                        setBookingForm({ ...bookingForm, date });
                      }}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-1">
                    <Label>Hora</Label>
                    <Select value={format(bookingForm.timeSlot, 'HH:mm')} onValueChange={(val) => {
                      const [h, m] = val.split(':').map(Number);
                      const d = new Date(bookingForm.timeSlot);
                      d.setHours(h, m, 0, 0);
                      setBookingForm({ ...bookingForm, timeSlot: d });
                    }}>
                      <SelectTrigger className="h-11 min-w-[140px]">
                        <SelectValue placeholder="Hora" />
                      </SelectTrigger>
                       <SelectContent 
                        className="max-h-[300px] overflow-y-auto"
                        position="popper"
                        side="bottom"
                        align="center"
                        sideOffset={4}
                        avoidCollisions={true}
                        collisionPadding={20}
                      >
                        {timeOptions5m.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-1">
                    <Label htmlFor="notes">Notas (opcional)</Label>
                    <Textarea
                      id="notes"
                      value={bookingForm.notes}
                      onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                      placeholder="Notas adicionales..."
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                </div>

                <div className="border-t pt-3 space-y-3">
                  <Label>Canjear código (opcional)</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label>Código</Label>
                      <Input value={redeemCode} onChange={(e) => setRedeemCode(e.target.value)} placeholder="ABCD1234" />
                    </div>
                    <div>
                      <Label>Importe (€) solo si es tarjeta</Label>
                      <Input type="number" step="0.01" min="0" value={redeemAmountEUR ?? ''} onChange={(e) => setRedeemAmountEUR(e.target.value === '' ? undefined : parseFloat(e.target.value))} placeholder="Ej. 50.00" />
                    </div>
                    <div className="md:col-span-1 flex items-end">
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" className="accent-current" checked={redeemOnCreate} onChange={(e) => setRedeemOnCreate(e.target.checked)} />
                        Canjear al crear
                      </label>
                    </div>
                  </div>
                  <div>
                    <Label>Notas de canje</Label>
                    <Textarea rows={2} value={redeemNotes} onChange={(e) => setRedeemNotes(e.target.value)} placeholder="Observaciones del canje" />
                  </div>
                </div>
              </div>

              {/* Footer - Fixed */}
              <div className="px-4 py-3 border-t bg-background flex-shrink-0">
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowBookingModal(false)} className="text-sm">
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button onClick={createBooking} className="text-sm">
                    <Save className="h-4 w-4 mr-2" />
                    Crear Reserva
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Booking Modal - Positioned above clicked slot */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 z-50">
          <div 
            className="absolute bg-background rounded-lg shadow-xl border overflow-y-auto animate-scale-in"
            style={{
              top: `${modalPosition.top}px`,
              left: `${modalPosition.left}px`,
              width: window.innerWidth < 768 ? `${window.innerWidth - 40}px` : 'min(600px, calc(100vw - 2rem))',
              maxHeight: '80vh'
            }}
          >
            <div className="px-4 pt-4 pb-2 border-b">
              <h3 className="text-lg font-semibold">Editar Reserva</h3>
              <p className="text-sm text-gray-600">Modifica notas, pago y cliente.</p>
            </div>

            {editingBooking && (
              <div className="space-y-4 p-4">
                <ClientSelector
                  label="Cliente"
                  selectedId={editingBooking.client_id || undefined}
                  onSelect={(c) => setEditClientId(c.id)}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nombre y apellidos" />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+34 600 000 000" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Email</Label>
                    <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="cliente@example.com" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Servicio</Label>
                    <Select value={editServiceId} onValueChange={(v) => setEditServiceId(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar servicio" />
                      </SelectTrigger>
                      <SelectContent 
                        position="popper"
                        side="bottom"
                        align="start"
                        sideOffset={4}
                        avoidCollisions={true}
                        collisionPadding={20}
                      >
                        {services.filter(s => s.center_id === (editingBooking.center_id || bookingForm.centerId) || !s.center_id).map((service) => (
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
                      const [h,m] = val.split(':').map(Number);
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
                       align="start"
                       sideOffset={4}
                       avoidCollisions={true}
                       collisionPadding={20}
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
                         align="start"
                         sideOffset={4}
                         avoidCollisions={true}
                         collisionPadding={20}
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
                         align="start"
                         sideOffset={4}
                         avoidCollisions={true}
                         collisionPadding={20}
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

                {/* Action Buttons - Responsive Layout */}
                <div className="space-y-3">
                  {/* Primary Actions */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      size="sm" 
                      variant="default"
                      className="flex-1"
                      onClick={() => {
                        setEditPaymentStatus('paid');
                        setEditBookingStatus('confirmed');
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
                            onClick={() => deleteBooking(editingBooking.id)}
                            className="w-full sm:w-auto"
                          >
                            Sí, borrar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  
                  {/* Secondary Actions */}
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
                      onClick={saveBookingEdits}
                      className="flex-1"
                    >
                      <Save className="h-4 w-4 mr-2" /> Guardar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedCalendarView;