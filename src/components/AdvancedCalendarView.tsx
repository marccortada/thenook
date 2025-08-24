import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Calendar,
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
import { format, addDays, subDays, startOfDay, addMinutes, isSameDay, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useBookings, useCenters, useLanes, useServices } from '@/hooks/useDatabase';
import { useClients } from '@/hooks/useClients';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ClientSelector from '@/components/ClientSelector';
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
}

const AdvancedCalendarView = () => {
  const { toast } = useToast();
  const { isAdmin, isEmployee } = useSimpleAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [selectedCenter, setSelectedCenter] = useState<string>('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ centerId: string; laneId: string; timeSlot: Date } | null>(null);
  
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
  const { centers } = useCenters();
  const { lanes } = useLanes();
  const { services } = useServices();
  const { updateClient } = useClients();
  const { laneBlocks, createLaneBlock, deleteLaneBlock, isLaneBlocked } = useLaneBlocks();

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

  // Get lanes for selected center (exactly 4 lanes per center)
  const getCenterLanes = (centerId: string) => {
    return lanes
      .filter(lane => lane.center_id === centerId && lane.active)
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 4); // Ensure exactly 4 lanes
  };

  // Get booking for specific slot
  const getBookingForSlot = (centerId: string, laneId: string, date: Date, timeSlot: Date) => {
    return bookings.find(booking => {
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
  const handleSlotClick = (centerId: string, laneId: string, date: Date, timeSlot: Date) => {
    // Si estamos en modo bloqueo
    if (blockingMode) {
      handleBlockingSlotClick(laneId, timeSlot);
      return;
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
      if (!createClientId && !bookingForm.clientEmail) {
        toast({ title: 'Error', description: 'Selecciona un cliente o introduce email', variant: 'destructive' });
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

      // Get service details
      const selectedService = services.find(s => s.id === bookingForm.serviceId);
      if (!selectedService) throw new Error('Servicio no encontrado');

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
          lane_id: bookingForm.laneId,
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

      toast({ title: '✅ Reserva Creada', description: 'Reserva creada correctamente.' });

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
              <Calendar className="h-4 w-4" />
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
            <div className="grid grid-cols-[50px_repeat(4,1fr)] gap-0 min-w-[600px]">
              {/* Header */}
              <div className="sticky top-0 z-10 bg-background border-b">
                <div className="p-1 text-center font-medium border-r bg-muted/50 text-xs">
                  Hora
                </div>
              </div>
              {centerLanes.map((lane) => (
                <div key={lane.id} className="sticky top-0 z-10 bg-background border-b">
                  <div className="p-1 text-center font-medium border-r bg-muted/50">
                    <div className="font-semibold text-xs">{(lane.name || '').replace(/ra[ií]l/gi, 'Carril')}</div>
                    <div className="text-[9px] text-muted-foreground">Cap: {lane.capacity}</div>
                  </div>
                </div>
              ))}

              {/* Time slots */}
              {timeSlots.map((timeSlot, timeIndex) => (
                <React.Fragment key={timeIndex}>
                  {/* Time label */}
                  <div className="p-0.5 text-center text-[10px] border-r border-b bg-muted/30 font-medium h-6 flex items-center justify-center">
                    {timeSlot.hour}
                  </div>

                   {/* Lane slots */}
                   {centerLanes.map((lane) => {
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
                          className="relative h-6 border-r border-b hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => handleSlotClick(selectedCenter, lane.id, selectedDate, timeSlot.time)}
                        >
                        {booking && isFirstSlotOfBooking && (
                          <div
                             className={cn(
                               "absolute inset-1 rounded border-l-4 p-1 transition-all hover:shadow-md text-xs",
                               getStatusColor(booking.status)
                             )}
                             style={{
                               height: `${Math.ceil((booking.duration_minutes || 60) / 5) * 32 - 4}px`
                             }}
                           >
                             <div className="text-xs font-semibold truncate">{booking.profiles?.first_name}</div>
                             {booking.payment_status === 'paid' && (
                               <div className="absolute top-0 right-0">
                                 <CheckCircle2 className="h-3 w-3 text-green-600" />
                               </div>
                             )}
                             <div className="text-[10px] text-muted-foreground truncate">
                               {format(parseISO(booking.booking_datetime), 'HH:mm')}
                             </div>
                          </div>
                        )}
                         {isBlocked && !booking && (
                           <div className="absolute inset-1 rounded bg-gray-400/40 border border-gray-500/60 flex items-center justify-center">
                             <div className="flex items-center gap-1">
                               <span className="text-[10px] font-bold text-gray-700">BLOCKED</span>
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 className="h-4 w-4 p-0 hover:bg-red-600 hover:text-white"
                                 onClick={(e) => handleUnblockLane(isBlocked.id, e)}
                               >
                                 <X className="h-2 w-2" />
                               </Button>
                             </div>
                           </div>
                         )}
                         {!booking && !isBlocked && (
                           <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                             <Plus className="h-4 w-4 text-muted-foreground" />
                           </div>
                         )}
                         {blockingMode && !booking && !isBlocked && (
                           <div className={cn(
                             "absolute inset-1 rounded border-2 border-dashed transition-all",
                             blockStartSlot?.laneId === lane.id && blockStartSlot?.timeSlot.getTime() === timeSlot.time.getTime() 
                               ? "border-blue-500 bg-blue-500/10" 
                               : "border-blue-300 hover:border-blue-500 hover:bg-blue-500/5"
                           )}>
                             <div className="absolute inset-0 flex items-center justify-center">
                               <Ban className="h-3 w-3 text-blue-600" />
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
              <Calendar className="h-4 w-4" />
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
                    <div className="p-1 text-center font-medium border-r bg-muted/50">
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
                          onClick={() => handleSlotClick(selectedCenter, lane.id, date, timeSlot.time)}
                        >
                          {booking && isFirstSlotOfBooking && (
                            <div
                              className={cn(
                                "absolute inset-0 rounded-sm text-[8px] p-0.5 border-l-2 truncate z-10",
                                getStatusColor(booking.status)
                              )}
                              style={{ 
                                height: `${(booking.duration_minutes || 60) / 5 * 24}px`,
                                minHeight: '24px'
                              }}
                            >
                              <div className="font-medium truncate">
                                {booking.profiles?.first_name?.[0]}{booking.profiles?.last_name?.[0]}
                              </div>
                              {booking.payment_status === 'paid' && (
                                <CheckCircle2 className="h-2 w-2 text-green-600" />
                              )}
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
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={goToToday}>
              Hoy
            </Button>
          </div>
          
          <div className="text-lg font-semibold">
            {viewMode === 'day' 
              ? format(selectedDate, "EEEE, d 'de' MMMM yyyy", { locale: es })
              : `${format(getWeekDates()[0], "d MMM", { locale: es })} - ${format(getWeekDates()[6], "d MMM yyyy", { locale: es })}`
            }
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Center Selection */}
          <Select value={selectedCenter} onValueChange={setSelectedCenter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Selecciona centro" />
            </SelectTrigger>
            <SelectContent>
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

          {/* Lane Blocking & Filters */}
          {(isAdmin || isEmployee) && (
            <div className="flex items-center gap-2">
              <Button
                variant={blockingMode ? "destructive" : "outline"}
                size="sm"
                onClick={() => {
                  setBlockingMode(!blockingMode);
                  setBlockStartSlot(null);
                  setBlockEndSlot(null);
                }}
              >
                <Ban className="w-4 h-4 mr-2" />
                {blockingMode ? 'Cancelar Bloqueo' : 'Bloquear Carriles'}
              </Button>
              
              <Button variant="outline" size="sm">
                <User className="w-4 h-4 mr-2" />
                Filtros No-Shows
              </Button>
            </div>
          )}
          
          {/* View Mode Toggle */}
          <Select value={viewMode} onValueChange={(value: 'day' | 'week') => setViewMode(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Día</SelectItem>
              <SelectItem value="week">Semana</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'day' ? renderDayView() : renderWeekView()}

      {/* New Booking Modal */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="w-[98vw] sm:max-w-lg md:max-w-xl p-0">
          <div className="flex flex-col min-h-[70vh] max-h-[95vh]">
            <DialogHeader className="px-4 pt-4 pb-2 border-b">
              <DialogTitle>Nueva Reserva</DialogTitle>
              <DialogDescription>
                Crear una nueva reserva para el {selectedSlot && format(selectedSlot.timeSlot, 'HH:mm')} del {selectedSlot && format(bookingForm.date, "d 'de' MMMM", { locale: es })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 px-4 py-3 overflow-auto flex-1 pb-4">
              <div className="space-y-2">
                <ClientSelector
                  label="Cliente"
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

              <div className="space-y-2">
                <Label htmlFor="serviceId">Servicio *</Label>
                <Select value={bookingForm.serviceId} onValueChange={(value) => setBookingForm({ ...bookingForm, serviceId: value })}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Seleccionar servicio" />
                  </SelectTrigger>
                  <SelectContent>
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
                      className="z-[200] bg-background border shadow-xl"
                      position="popper"
                      side="bottom"
                      align="start"
                      sideOffset={4}
                      avoidCollisions={true}
                      sticky="always"
                    >
                      {timeOptions5m.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">Notas (opcional)</Label>
                  <Textarea
                    id="notes"
                    value={bookingForm.notes}
                    onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                    placeholder="Notas adicionales..."
                    rows={6}
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

            <div className="mt-auto px-4 py-3 border-t bg-background">
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowBookingModal(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={createBooking}>
                  <Save className="h-4 w-4 mr-2" />
                  Crear Reserva
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Booking Modal */}
      <Dialog open={showEditModal} onOpenChange={(open) => { setShowEditModal(open); if (!open) setEditingBooking(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Reserva</DialogTitle>
            <DialogDescription>Modifica notas, pago y cliente.</DialogDescription>
          </DialogHeader>

          {editingBooking && (
            <div className="space-y-4">
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
                    <SelectContent>
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
                  <SelectContent>
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
                    <SelectContent>
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
                    <SelectContent>
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

              <div className="flex justify-between gap-2">
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="default"
                    onClick={() => {
                      setEditPaymentStatus('paid');
                      setEditBookingStatus('confirmed');
                    }}
                  >
                    💳 Cobrar
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setShowEditModal(false); setEditingBooking(null); }}>
                    <X className="h-4 w-4 mr-2" /> Cancelar
                  </Button>
                  <Button size="sm" onClick={saveBookingEdits}>
                    <Save className="h-4 w-4 mr-2" /> Guardar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdvancedCalendarView;