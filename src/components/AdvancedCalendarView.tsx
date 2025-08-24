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
  Ban
} from 'lucide-react';
import { format, addDays, subDays, startOfDay, addMinutes, isSameDay, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useBookings, useCenters, useLanes, useServices, useLaneBlocks } from '@/hooks/useDatabase';
import { useClients } from '@/hooks/useClients';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import ClientSelector from '@/components/ClientSelector';

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
  const { user, isAdmin, isEmployee } = useSimpleAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [selectedCenter, setSelectedCenter] = useState<string>('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ centerId: string; laneId: string; timeSlot: Date } | null>(null);

  // Lane blocking state
  const [isBlockingMode, setIsBlockingMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ timeSlot: Date; laneId: string } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ timeSlot: Date; laneId: string } | null>(null);

  const [createClientId, setCreateClientId] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any | null>(null);
  const [editClientId, setEditClientId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editPaymentStatus, setEditPaymentStatus] = useState<'pending' | 'paid'>('pending');
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
  const { laneBlocks, refetch: refetchLaneBlocks, createLaneBlock, deleteLaneBlock } = useLaneBlocks();
  const { updateClient } = useClients();

  // Set initial center when centers load
  useEffect(() => {
    if (centers.length > 0 && !selectedCenter) {
      setSelectedCenter(centers[0].id);
    }
  }, [centers, selectedCenter]);

  // Generate time slots from 8:00 to 22:00 every 30 minutes
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const base = startOfDay(selectedDate);
      for (let hour = 10; hour <= 22; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          if (hour === 22 && minute > 0) break; // Stop at 22:00
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

  // Handle slot click
  const handleSlotClick = (centerId: string, laneId: string, date: Date, timeSlot: Date) => {
    const existingBooking = getBookingForSlot(centerId, laneId, date, timeSlot);
    
    if (existingBooking) {
      setEditingBooking(existingBooking);
      setEditClientId(existingBooking.client_id || null);
      setEditNotes(existingBooking.notes || '');
      setEditPaymentStatus(existingBooking.payment_status === 'paid' ? 'paid' : 'pending');
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

  // Lane blocking functions
  const handleSlotMouseDown = (timeSlot: Date, laneId: string) => {
    if ((!isAdmin && !isEmployee) || !isBlockingMode) return;
    
    setDragStart({ timeSlot, laneId });
    setIsDragging(true);
  };

  const handleSlotMouseEnter = (timeSlot: Date, laneId: string) => {
    if ((!isAdmin && !isEmployee) || !isBlockingMode || !isDragging || !dragStart) return;
    
    // Only allow drag within the same lane
    if (laneId === dragStart.laneId) {
      setDragEnd({ timeSlot, laneId });
    }
  };

  const handleSlotMouseUp = async () => {
    if ((!isAdmin && !isEmployee) || !isBlockingMode || !isDragging || !dragStart || !dragEnd) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    try {
      const startTime = dragStart.timeSlot < dragEnd.timeSlot ? dragStart.timeSlot : dragEnd.timeSlot;
      const endTime = dragStart.timeSlot >= dragEnd.timeSlot ? dragStart.timeSlot : dragEnd.timeSlot;
      
      // Add 30 minutes to end time to include the full slot
      const adjustedEndTime = addMinutes(endTime, 30);

      // Check if there's already a block for this range
      const existingBlock = laneBlocks.find(block => 
        block.lane_id === dragStart.laneId &&
        block.center_id === selectedCenter &&
        new Date(block.start_datetime) <= startTime &&
        new Date(block.end_datetime) >= adjustedEndTime
      );

      if (existingBlock) {
        // Delete existing block
        await deleteLaneBlock(existingBlock.id);
        toast({ title: 'Bloqueo eliminado', description: 'Se ha eliminado el bloqueo del carril.' });
      } else {
        // Create new block
        await createLaneBlock({
          lane_id: dragStart.laneId,
          center_id: selectedCenter,
          start_datetime: startTime.toISOString(),
          end_datetime: adjustedEndTime.toISOString(),
          reason: 'Bloqueo manual',
          created_by: user?.id || ''
        });
        toast({ title: 'Carril bloqueado', description: 'Se ha bloqueado el carril correctamente.' });
      }

      await refetchLaneBlocks();
    } catch (error) {
      console.error('Error managing lane block:', error);
      toast({ title: 'Error', description: 'No se pudo gestionar el bloqueo.', variant: 'destructive' });
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const isSlotBlocked = (laneId: string, timeSlot: Date) => {
    return laneBlocks.some(block => 
      block.lane_id === laneId &&
      block.center_id === selectedCenter &&
      timeSlot >= new Date(block.start_datetime) &&
      timeSlot < new Date(block.end_datetime)
    );
  };

  const isInDragSelection = (laneId: string, timeSlot: Date) => {
    if (!isDragging || !dragStart || !dragEnd || laneId !== dragStart.laneId) return false;
    
    const start = dragStart.timeSlot < dragEnd.timeSlot ? dragStart.timeSlot : dragEnd.timeSlot;
    const end = dragStart.timeSlot >= dragEnd.timeSlot ? dragStart.timeSlot : dragEnd.timeSlot;
    
    return timeSlot >= start && timeSlot <= end;
  };

  // Render day view
  const renderDayView = () => {
    if (!selectedCenter) return null;

    const centerLanes = getCenterLanes(selectedCenter);
    const centerName = centers.find(c => c.id === selectedCenter)?.name || 'Centro';

    return (
      <Card className="w-full rounded-none border-0 sm:rounded-md sm:border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendario - {centerName}
            <Badge variant="secondary" className="ml-2">
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[60vh] md:h-[70vh]">
            <div className="grid grid-cols-[80px_repeat(4,1fr)] gap-0 min-w-[800px]">
              {/* Header */}
              <div className="sticky top-0 z-10 bg-background border-b">
                <div className="p-3 text-center font-medium border-r bg-muted/50 text-sm">
                  Hora
                </div>
              </div>
              {centerLanes.map((lane) => (
                <div key={lane.id} className="sticky top-0 z-10 bg-background border-b">
                  <div className="p-3 text-center font-medium border-r bg-muted/50">
                    <div className="font-semibold text-sm">{(lane.name || '').replace(/ra[ií]l/gi, 'Carril')}</div>
                    <div className="text-xs text-muted-foreground">Capacidad: {lane.capacity}</div>
                  </div>
                </div>
              ))}

              {/* Time slots */}
              {timeSlots.map((timeSlot, timeIndex) => (
                <React.Fragment key={timeIndex}>
                  {/* Time label */}
                  <div className="p-2 text-center text-sm border-r border-b bg-muted/30 font-medium">
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
                    const isFirstSlotOfBooking = booking && 
                      format(timeSlot.time, 'HH:mm') === format(parseISO(booking.booking_datetime), 'HH:mm');

                    const isBlocked = isSlotBlocked(lane.id, timeSlot.time);
                    const isInSelection = isInDragSelection(lane.id, timeSlot.time);

                    return (
                      <div
                        key={`${lane.id}-${timeIndex}`}
                        className={cn(
                          "relative border-r border-b min-h-[60px] transition-colors cursor-pointer",
                          isBlockingMode && (isAdmin || isEmployee) ? "cursor-pointer" : "",
                          isBlocked ? "bg-red-100" : "hover:bg-muted/20",
                          isInSelection ? "bg-blue-200" : ""
                        )}
                        onClick={() => !isBlockingMode && handleSlotClick(selectedCenter, lane.id, selectedDate, timeSlot.time)}
                        onMouseDown={() => handleSlotMouseDown(timeSlot.time, lane.id)}
                        onMouseEnter={() => handleSlotMouseEnter(timeSlot.time, lane.id)}
                        onMouseUp={handleSlotMouseUp}
                      >
                        {booking && isFirstSlotOfBooking && (
                          <div
                            className={cn(
                              "absolute inset-1 rounded border-l-4 p-2 transition-all hover:shadow-md",
                              getStatusColor(booking.status)
                            )}
                            style={{
                              height: `${Math.ceil((booking.duration_minutes || 60) / 30) * 60 - 4}px`
                            }}
                          >
                            <div className="text-sm font-semibold truncate">
                              {booking.profiles?.first_name} {booking.profiles?.last_name}
                            </div>
                            {booking.payment_status === 'paid' && (
                              <div className="absolute top-1 right-1">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground truncate">
                              {booking.services?.name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {booking.profiles?.phone}
                            </div>
                            <div className="text-xs font-medium mt-1">
                              {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(((booking.total_price_cents || 0) / 100))}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(parseISO(booking.booking_datetime), 'HH:mm')}
                            </div>
                          </div>
                        )}
                        {!booking && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <Plus className="h-4 w-4 text-muted-foreground" />
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

  // Render week view
  const renderWeekView = () => {
    if (!selectedCenter) return null;

    const weekDates = getWeekDates();
    const centerLanes = getCenterLanes(selectedCenter);
    const centerName = centers.find(c => c.id === selectedCenter)?.name || 'Centro';

    return (
      <Card className="w-full rounded-none border-0 sm:rounded-md sm:border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Vista Semanal - {centerName}
            <Badge variant="secondary" className="ml-2">
              {format(weekDates[0], "d MMM", { locale: es })} - {format(weekDates[6], "d MMM yyyy", { locale: es })}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="min-w-[1200px]">
              {/* Week header */}
              <div className="grid grid-cols-8 gap-0 border-b bg-muted/50">
                <div className="p-3 text-center font-medium border-r text-sm">Hora</div>
                {weekDates.map((date) => (
                  <div key={date.toISOString()} className="p-3 text-center font-medium border-r">
                    <div className="font-semibold text-sm">
                      {format(date, "EEE", { locale: es })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(date, "d MMM", { locale: es })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Time slots for week view - simplified */}
              {timeSlots.filter((_, index) => index % 2 === 0).map((timeSlot, timeIndex) => (
                <div key={timeIndex} className="grid grid-cols-8 gap-0 border-b">
                  <div className="p-2 text-center text-sm border-r bg-muted/30 font-medium">
                    {timeSlot.hour}
                  </div>
                  {weekDates.map((date) => {
                    const dayBookings = bookings.filter(booking => {
                      if (!booking.booking_datetime || booking.center_id !== selectedCenter) return false;
                      const bookingDate = parseISO(booking.booking_datetime);
                      return isSameDay(bookingDate, date);
                    });

                    return (
                      <div key={date.toISOString()} className="border-r min-h-[40px] p-1">
                        {dayBookings.map((booking) => {
                          const bookingTime = parseISO(booking.booking_datetime);
                          const isInThisHour = Math.abs(timeSlot.time.getHours() - bookingTime.getHours()) <= 1;
                          
                          if (!isInThisHour) return null;

                          return (
                            <div
                              key={booking.id}
                              className={cn(
                                "text-xs p-1 rounded mb-1 border-l-2 truncate",
                                getStatusColor(booking.status)
                              )}
                            >
                              <div className="font-medium">
                                {booking.profiles?.first_name} {booking.profiles?.last_name}
                              </div>
                              <div className="text-xs opacity-75 flex items-center gap-1">
                                {format(bookingTime, 'HH:mm')}
                                {booking.payment_status === 'paid' && (
                                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                                )}
                              </div>
                            </div>
                          );
                        })}
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
          <div className="text-2xl font-bold">
            {viewMode === 'day' 
              ? format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
              : `Semana del ${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "d 'de' MMMM", { locale: es })}`
            }
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Center selector */}
          <Select value={selectedCenter} onValueChange={setSelectedCenter}>
            <SelectTrigger className="w-48">
              <MapPin className="h-4 w-4 mr-1" />
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

          {/* Admin/Employee lane blocking controls */}
          {(isAdmin || isEmployee) && (
            <Button 
              size="sm" 
              variant={isBlockingMode ? "default" : "outline"}
              onClick={() => setIsBlockingMode(!isBlockingMode)}
              className="w-auto"
            >
              <Ban className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">
                {isBlockingMode ? 'Modo Bloqueo ON' : 'Bloquear Carriles'}
              </span>
              <span className="sm:hidden">
                {isBlockingMode ? 'ON' : 'Bloqueo'}
              </span>
            </Button>
          )}

          {/* View mode toggle */}
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

              <div className="space-y-2">
                <Label htmlFor="payment">Estado de pago</Label>
                <Select value={editPaymentStatus} onValueChange={(v: 'pending' | 'paid') => setEditPaymentStatus(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="paid">Pagado</SelectItem>
                  </SelectContent>
                </Select>
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

              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => { setShowEditModal(false); setEditingBooking(null); }}>
                  <X className="h-4 w-4 mr-2" /> Cancelar
                </Button>
                <Button size="sm" onClick={saveBookingEdits}>
                  <Save className="h-4 w-4 mr-2" /> Guardar cambios
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdvancedCalendarView;