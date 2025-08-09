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
  CheckCircle2
} from 'lucide-react';
import { format, addDays, subDays, startOfDay, addMinutes, isSameDay, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useBookings, useCenters, useLanes, useServices } from '@/hooks/useDatabase';
import { useClients } from '@/hooks/useClients';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [selectedCenter, setSelectedCenter] = useState<string>('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ centerId: string; laneId: string; timeSlot: Date } | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any | null>(null);
  const [editClientId, setEditClientId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editPaymentStatus, setEditPaymentStatus] = useState<'pending' | 'paid'>('pending');
  
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

  const { bookings, loading: bookingsLoading, refetch: refetchBookings } = useBookings();
  const { centers } = useCenters();
  const { lanes } = useLanes();
  const { services } = useServices();
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
    for (let hour = 8; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 22 && minute > 0) break; // Stop at 22:00
        const time = new Date();
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
      if (!bookingForm.clientName || !bookingForm.clientEmail || !bookingForm.serviceId) {
        toast({
          title: "Error",
          description: "Por favor completa todos los campos obligatorios",
          variant: "destructive",
        });
        return;
      }

      // Create or get client profile
      let clientProfile;
      if (bookingForm.clientEmail) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', bookingForm.clientEmail)
          .maybeSingle();

        if (existingProfile) {
          clientProfile = existingProfile;
          // Update existing profile if needed
          await updateClient(existingProfile.id, {
            first_name: bookingForm.clientName.split(' ')[0],
            last_name: bookingForm.clientName.split(' ').slice(1).join(' '),
            phone: bookingForm.clientPhone,
            email: bookingForm.clientEmail,
          });
        } else {
          // Create new profile
          const { data: newProfile, error: profileError } = await supabase
            .from('profiles')
            .insert([{
              email: bookingForm.clientEmail,
              first_name: bookingForm.clientName.split(' ')[0],
              last_name: bookingForm.clientName.split(' ').slice(1).join(' '),
              phone: bookingForm.clientPhone,
              role: 'client'
            }])
            .select()
            .single();

          if (profileError) throw profileError;
          clientProfile = newProfile;
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

      const { error: bookingError } = await supabase
        .from('bookings')
        .insert({
          client_id: clientProfile?.id,
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
        });

      if (bookingError) throw bookingError;

      toast({
        title: "✅ Reserva Creada",
        description: `Reserva para ${bookingForm.clientName} confirmada exitosamente.`,
      });

      setShowBookingModal(false);
      setSelectedSlot(null);
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

      // Refresh bookings
      await refetchBookings();
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la reserva. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };

  // Edit existing booking
  const saveBookingEdits = async () => {
    try {
      if (!editingBooking) return;
      const updates: any = {
        notes: editNotes || null,
        payment_status: editPaymentStatus,
      };
      if (editClientId) {
        updates.client_id = editClientId;
      }
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

  // Render day view
  const renderDayView = () => {
    if (!selectedCenter) return null;

    const centerLanes = getCenterLanes(selectedCenter);
    const centerName = centers.find(c => c.id === selectedCenter)?.name || 'Centro';

    return (
      <Card className="w-full">
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
          <ScrollArea className="h-[600px]">
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
                    <div className="font-semibold text-sm">{lane.name}</div>
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

                    return (
                      <div
                        key={`${lane.id}-${timeIndex}`}
                        className="relative border-r border-b min-h-[60px] hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => handleSlotClick(selectedCenter, lane.id, selectedDate, timeSlot.time)}
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
                              €{((booking.total_price_cents || 0) / 100).toFixed(0)}
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
      <Card className="w-full">
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Reserva</DialogTitle>
            <DialogDescription>
              Crear una nueva reserva para el {selectedSlot && format(selectedSlot.timeSlot, 'HH:mm')} del {selectedSlot && format(bookingForm.date, "d 'de' MMMM", { locale: es })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Nombre del Cliente *</Label>
              <Input
                id="clientName"
                value={bookingForm.clientName}
                onChange={(e) => setBookingForm({ ...bookingForm, clientName: e.target.value })}
                placeholder="Nombre completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientPhone">Teléfono</Label>
              <Input
                id="clientPhone"
                value={bookingForm.clientPhone}
                onChange={(e) => setBookingForm({ ...bookingForm, clientPhone: e.target.value })}
                placeholder="+34 600 000 000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientEmail">Correo Electrónico *</Label>
              <Input
                id="clientEmail"
                type="email"
                value={bookingForm.clientEmail}
                onChange={(e) => setBookingForm({ ...bookingForm, clientEmail: e.target.value })}
                placeholder="cliente@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceId">Servicio *</Label>
              <Select value={bookingForm.serviceId} onValueChange={(value) => setBookingForm({ ...bookingForm, serviceId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar servicio" />
                </SelectTrigger>
                <SelectContent>
                  {services.filter(s => s.center_id === bookingForm.centerId || !s.center_id).map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} - €{(service.price_cents / 100).toFixed(0)} ({service.duration_minutes}min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                value={bookingForm.notes}
                onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                placeholder="Notas adicionales..."
                rows={3}
              />
            </div>

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
                <Button variant="outline" onClick={() => { setShowEditModal(false); setEditingBooking(null); }}>
                  <X className="h-4 w-4 mr-2" /> Cancelar
                </Button>
                <Button onClick={saveBookingEdits}>
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