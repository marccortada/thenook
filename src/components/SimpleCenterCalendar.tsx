import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ChevronLeft, 
  ChevronRight, 
  User,
  Clock,
  Plus,
  Edit,
  Trash2,
  Save,
  Ban,
  CreditCard,
  Calendar,
  DollarSign
} from 'lucide-react';
import { format, addDays, subDays, startOfDay, addMinutes, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useBookings, useCenters, useEmployees, useServices, useLanes, useLaneBlocks } from '@/hooks/useDatabase';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';

const SimpleCenterCalendar = () => {
  const { toast } = useToast();
  const { user, isAdmin } = useSimpleAuth();
  const [selectedDate, setSelectedDate] = useState(new Date('2025-08-06'));
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [showEditBookingModal, setShowEditBookingModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [newBookingDate, setNewBookingDate] = useState(new Date());
  const [newBookingTime, setNewBookingTime] = useState('');
  
  // Lane blocking states (admin only)
  const [isBlockingMode, setIsBlockingMode] = useState(false);
  const [dragStart, setDragStart] = useState<{timeSlot: Date, laneId: string} | null>(null);
  const [dragEnd, setDragEnd] = useState<{timeSlot: Date, laneId: string} | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Form states
  const [newBookingForm, setNewBookingForm] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    serviceId: '',
    employeeId: '',
    time: '',
    duration: 60,
    notes: ''
  });
  
  const { bookings, loading: bookingsLoading, refetch: refetchBookings } = useBookings();
  const { centers } = useCenters();
  const { employees } = useEmployees();
  const { services: allServices } = useServices();
  const { lanes } = useLanes(activeTab);
  const { laneBlocks, createLaneBlock, deleteLaneBlock, refetch: refetchLaneBlocks } = useLaneBlocks(activeTab);

  // Set initial tab when centers load
  useEffect(() => {
    if (centers.length > 0 && !activeTab) {
      setActiveTab(centers[0].id);
    }
  }, [centers, activeTab]);

  // Time slots every 30 minutes from 8:00 to 22:00 (for grid only)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 10; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 22 && minute > 0) break; // Stop at 22:00
        const time = new Date();
        time.setHours(hour, minute, 0, 0);
        slots.push(time);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Time options for forms: every 5 minutes from 10:00 to 22:00
  const timeOptions = React.useMemo(() => {
    const opts: string[] = [];
    const start = new Date(); start.setHours(10, 0, 0, 0);
    const end = new Date(); end.setHours(22, 0, 0, 0);
    const cur = new Date(start);
    while (cur <= end) {
      opts.push(format(cur, 'HH:mm'));
      cur.setMinutes(cur.getMinutes() + 5);
    }
    return opts;
  }, []);

  // Filter bookings for selected date and center
  const getBookingsForDate = (centerId: string) => {
    if (!Array.isArray(bookings)) return [];
    
    const filtered = bookings.filter(booking => {
      if (!booking.booking_datetime || !booking.center_id) return false;
      
      try {
        const bookingDate = parseISO(booking.booking_datetime);
        const isSameDayResult = isSameDay(bookingDate, selectedDate);
        const isSameCenterResult = booking.center_id === centerId;
        const matchesStatusFilter = statusFilter === 'all' || booking.status === statusFilter;
        
        return isSameDayResult && isSameCenterResult && matchesStatusFilter;
      } catch (error) {
        console.error('Error parsing booking date:', booking.booking_datetime, error);
        return false;
      }
    });
    
    return filtered;
  };

  // Get employees for a specific center
  const getEmployeesForCenter = (centerId: string) => {
    return employees.filter(emp => emp.center_id === centerId && emp.active !== false);
  };

  // Get booking for specific time and employee
  const getBookingForTimeAndEmployee = (centerId: string, timeSlot: Date, employeeId?: string) => {
    const centerBookings = getBookingsForDate(centerId);
    return centerBookings.find(booking => {
      const bookingStart = parseISO(booking.booking_datetime);
      const bookingEnd = addMinutes(bookingStart, booking.duration_minutes || 60);
      
      const matchesTime = timeSlot >= bookingStart && timeSlot < bookingEnd;
      const matchesEmployee = !employeeId || employeeId === 'all' || booking.employee_id === employeeId;
      
      return matchesTime && matchesEmployee;
    });
  };

  // Get booking for specific time and lane
  const getBookingForTimeAndLane = (centerId: string, timeSlot: Date, laneId: string) => {
    const centerBookings = getBookingsForDate(centerId);
    return centerBookings.find(booking => {
      const bookingStart = parseISO(booking.booking_datetime);
      const bookingEnd = addMinutes(bookingStart, booking.duration_minutes || 60);
      
      const matchesTime = timeSlot >= bookingStart && timeSlot < bookingEnd;
      const matchesLane = booking.lane_id === laneId;
      
      return matchesTime && matchesLane;
    });
  };

  // Calculate available slots considering blocks and bookings
  const getAvailableCapacity = (centerId: string, timeSlot: Date, laneId: string) => {
    const lane = lanes.find(l => l.id === laneId);
    if (!lane) return 0;

    const isBlocked = isSlotBlocked(timeSlot, laneId);
    const hasBooking = getBookingForTimeAndLane(centerId, timeSlot, laneId);
    
    if (isBlocked || hasBooking) return 0;
    return lane.capacity;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 border-green-500 text-green-700';
      case 'pending': return 'bg-yellow-100 border-yellow-500 text-yellow-700';
      case 'cancelled': return 'bg-red-100 border-red-500 text-red-700';
      case 'completed': return 'bg-blue-100 border-blue-500 text-blue-700';
      case 'requested': return 'bg-purple-100 border-purple-500 text-purple-700';
      case 'new': return 'bg-orange-100 border-orange-500 text-orange-700';
      case 'online': return 'bg-cyan-100 border-cyan-500 text-cyan-700';
      case 'no_show': return 'bg-gray-100 border-gray-500 text-gray-700';
      default: return 'bg-gray-100 border-gray-500 text-gray-700';
    }
  };

  // Navigation functions
  const goToPreviousDay = () => setSelectedDate(subDays(selectedDate, 1));
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1));

  // Handle new booking
  const handleNewBooking = (centerId: string) => {
    setNewBookingForm({
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      serviceId: '',
      employeeId: '',
      time: '',
      duration: 60,
      notes: ''
    });
    setShowNewBookingModal(true);
  };

  // Handle booking click
  const handleBookingClick = (booking: any) => {
    setSelectedBooking(booking);
    setShowEditBookingModal(true);
  };

  // Create new booking
  const createBooking = async () => {
    try {
      // First create or get client profile
      let clientProfile;
      if (newBookingForm.clientEmail) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', newBookingForm.clientEmail)
          .maybeSingle();

        if (existingProfile) {
          clientProfile = existingProfile;
        } else {
          const { data: newProfile, error: profileError } = await supabase
            .from('profiles')
            .insert([{
              email: newBookingForm.clientEmail,
              first_name: newBookingForm.clientName.split(' ')[0],
              last_name: newBookingForm.clientName.split(' ').slice(1).join(' '),
              phone: newBookingForm.clientPhone,
              role: 'client'
            }])
            .select()
            .single();

          if (profileError) throw profileError;
          clientProfile = newProfile;
        }
      }

      // Get service details for pricing - search in all services
      const selectedService = allServices?.find(s => s.id === newBookingForm.serviceId);
      if (!selectedService) throw new Error('Servicio no encontrado');

      // Create booking datetime
      const bookingDate = new Date(selectedDate);
      const [hours, minutes] = newBookingForm.time.split(':');
      bookingDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const { error: bookingError } = await supabase
        .from('bookings')
        .insert({
          client_id: clientProfile?.id,
          service_id: newBookingForm.serviceId,
          center_id: activeTab,
          employee_id: newBookingForm.employeeId === 'auto' ? null : newBookingForm.employeeId,
          booking_datetime: bookingDate.toISOString(),
          duration_minutes: newBookingForm.duration,
          total_price_cents: selectedService.price_cents,
          status: 'confirmed' as const,
          channel: 'web' as const,
          notes: newBookingForm.notes || null,
          payment_status: 'pending' as const
        });

      if (bookingError) throw bookingError;

      toast({
        title: "✅ Reserva Creada",
        description: `Reserva para ${newBookingForm.clientName} confirmada exitosamente.`,
      });

      setShowNewBookingModal(false);
      
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

  // Update booking employee
  const updateBookingEmployee = async (bookingId: string, employeeId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ employee_id: employeeId })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "✅ Especialista Actualizado",
        description: "El especialista ha sido asignado correctamente.",
      });

      refetchBookings();
      setShowEditBookingModal(false);
    } catch (error) {
      console.error('Error updating booking:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el especialista.",
        variant: "destructive",
      });
    }
  };

  // Update booking status
  const updateBookingStatus = async (bookingId: string, status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | 'requested' | 'new' | 'online') => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "✅ Estado Actualizado",
        description: `Estado de la reserva actualizado a ${status}.`,
      });

      refetchBookings();
      setShowEditBookingModal(false);
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado.",
        variant: "destructive",
      });
    }
  };

  // Process payment
  const processPayment = async () => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          payment_status: 'paid',
          payment_method: paymentMethod,
          payment_notes: paymentNotes
        })
        .eq('id', selectedBooking.id);

      if (error) throw error;

      toast({
        title: "✅ Pago Registrado",
        description: `Pago procesado exitosamente con ${paymentMethod}.`,
      });

      refetchBookings();
      setShowPaymentModal(false);
      setShowEditBookingModal(false);
      setPaymentMethod('');
      setPaymentNotes('');
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar el pago.",
        variant: "destructive",
      });
    }
  };

  // Delete booking completely
  const deleteBooking = async (bookingId: string) => {
    if (!confirm('¿Estás seguro de que quieres borrar completamente esta reserva? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "✅ Reserva Borrada",
        description: "La reserva ha sido borrada completamente.",
      });

      refetchBookings();
      setShowEditBookingModal(false);
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast({
        title: "Error",
        description: "No se pudo borrar la reserva.",
        variant: "destructive",
      });
    }
  };

  // Reschedule booking
  const rescheduleBooking = async () => {
    try {
      const bookingDate = new Date(newBookingDate);
      const [hours, minutes] = newBookingTime.split(':');
      bookingDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const { error } = await supabase
        .from('bookings')
        .update({ booking_datetime: bookingDate.toISOString() })
        .eq('id', selectedBooking.id);

      if (error) throw error;

      toast({
        title: "✅ Reserva Reagendada",
        description: `Reserva reagendada para ${format(bookingDate, "d 'de' MMMM 'a las' HH:mm", { locale: es })}.`,
      });

      refetchBookings();
      setShowRescheduleModal(false);
      setShowEditBookingModal(false);
    } catch (error) {
      console.error('Error rescheduling booking:', error);
      toast({
        title: "Error",
        description: "No se pudo reagendar la reserva.",
        variant: "destructive",
      });
    }
  };

  // Lane blocking functions (admin only)
  const handleSlotMouseDown = (timeSlot: Date, laneId: string) => {
    if (!isAdmin || !isBlockingMode) return;
    
    setDragStart({ timeSlot, laneId });
    setIsDragging(true);
  };

  const handleSlotMouseEnter = (timeSlot: Date, laneId: string) => {
    if (!isAdmin || !isBlockingMode || !isDragging || !dragStart) return;
    
    // Only allow drag within the same lane
    if (laneId === dragStart.laneId) {
      setDragEnd({ timeSlot, laneId });
    }
  };

  const handleSlotMouseUp = async () => {
    if (!isAdmin || !isBlockingMode || !isDragging || !dragStart || !dragEnd) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    const startTime = dragStart.timeSlot < dragEnd.timeSlot ? dragStart.timeSlot : dragEnd.timeSlot;
    const endTime = dragStart.timeSlot < dragEnd.timeSlot ? dragEnd.timeSlot : dragStart.timeSlot;
    
    // Add 30 minutes to end time to cover the slot
    const actualEndTime = addMinutes(endTime, 30);

    // Create block datetime with selected date
    const startDateTime = new Date(selectedDate);
    startDateTime.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
    
    const endDateTime = new Date(selectedDate);
    endDateTime.setHours(actualEndTime.getHours(), actualEndTime.getMinutes(), 0, 0);

    try {
      // Check if there's already a block at this time
      const existingBlock = laneBlocks.find(block => 
        block.lane_id === dragStart.laneId &&
        new Date(block.start_datetime) <= startDateTime &&
        new Date(block.end_datetime) >= endDateTime
      );

      if (existingBlock) {
        // Remove existing block
        await deleteLaneBlock(existingBlock.id);
        toast({
          title: "🔓 Carril Desbloqueado",
          description: "El bloqueo ha sido eliminado.",
        });
      } else {
        // Create new block
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user?.id)
          .single();

        if (!profile?.id) throw new Error('Perfil no encontrado');

        await createLaneBlock({
          lane_id: dragStart.laneId,
          center_id: activeTab,
          start_datetime: startDateTime.toISOString(),
          end_datetime: endDateTime.toISOString(),
          created_by: profile.id,
          reason: 'Bloqueo administrativo'
        });

        toast({
          title: "🔒 Carril Bloqueado",
          description: `Carril bloqueado de ${format(startDateTime, 'HH:mm')} a ${format(endDateTime, 'HH:mm')}.`,
        });
      }

      await refetchLaneBlocks();
    } catch (error) {
      console.error('Error managing lane block:', error);
      toast({
        title: "Error",
        description: "No se pudo gestionar el bloqueo.",
        variant: "destructive",
      });
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  // Check if a time slot is blocked
  const isSlotBlocked = (timeSlot: Date, laneId: string) => {
    const slotDateTime = new Date(selectedDate);
    slotDateTime.setHours(timeSlot.getHours(), timeSlot.getMinutes(), 0, 0);
    
    return laneBlocks.some(block => {
      const blockStart = new Date(block.start_datetime);
      const blockEnd = new Date(block.end_datetime);
      return block.lane_id === laneId && 
             slotDateTime >= blockStart && 
             slotDateTime < blockEnd;
    });
  };

  // Check if slot is in drag selection
  const isInDragSelection = (timeSlot: Date, laneId: string) => {
    if (!isDragging || !dragStart || !dragEnd || laneId !== dragStart.laneId) return false;
    
    const startTime = dragStart.timeSlot < dragEnd.timeSlot ? dragStart.timeSlot : dragEnd.timeSlot;
    const endTime = dragStart.timeSlot < dragEnd.timeSlot ? dragEnd.timeSlot : dragStart.timeSlot;
    
    return timeSlot >= startTime && timeSlot <= endTime;
  };

  // Render calendar for a specific center
  const renderCenterCalendar = (center: any) => {
    const centerEmployees = getEmployeesForCenter(center.id);
    const centerBookings = getBookingsForDate(center.id);
    
    return (
      <div className="h-full flex flex-col space-y-4">
        {/* Stats for this center - Responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
          <Card className="p-2 sm:p-3">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{centerBookings.length}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Total Reservas</div>
            </div>
          </Card>
          <Card className="p-2 sm:p-3">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {centerBookings.filter(b => b.status === 'confirmed').length}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Confirmadas</div>
            </div>
          </Card>
          <Card className="p-2 sm:p-3">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-primary">
                {centerBookings.reduce((sum, b) => sum + ((b.total_price_cents || 0) / 100), 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Ingresos</div>
            </div>
          </Card>
        </div>

        {/* Employee and Status filters - Responsive */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 p-2 sm:p-0">
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <User className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="font-medium">Especialista:</span>
          </div>
          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Todos los especialistas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los especialistas</SelectItem>
              {centerEmployees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.profiles?.first_name} {employee.profiles?.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className="font-medium">Estado:</span>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="confirmed">✅ Confirmadas</SelectItem>
              <SelectItem value="pending">⏳ Pendientes</SelectItem>
              <SelectItem value="requested">📋 Solicitadas</SelectItem>
              <SelectItem value="new">🆕 Nuevas</SelectItem>
              <SelectItem value="online">🌐 Online</SelectItem>
              <SelectItem value="cancelled">❌ Canceladas</SelectItem>
              <SelectItem value="completed">✔️ Completadas</SelectItem>
              <SelectItem value="no_show">❌ No Show</SelectItem>
            </SelectContent>
          </Select>
          
          <Button size="sm" onClick={() => handleNewBooking(center.id)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Nueva Reserva</span>
            <span className="sm:hidden">Nueva</span>
          </Button>

          {/* Admin lane blocking controls */}
          {isAdmin && (
            <Button 
              size="sm" 
              variant={isBlockingMode ? "default" : "outline"}
              onClick={() => setIsBlockingMode(!isBlockingMode)}
              className="w-full sm:w-auto"
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
        </div>

        {/* Calendar Grid - takes full height */}
        <div className="flex-1 min-h-0">
          <div className="bg-background border-b p-2 sm:p-3">
            <h3 className="font-semibold text-sm sm:text-base">
              Agenda del {format(selectedDate, "d MMM", { locale: es })}
            </h3>
          </div>
          
          <div className="overflow-hidden h-[calc(100%-60px)]">
            <ScrollArea className="h-full w-full">
              <div className="min-w-full">
                {/* Lane-based calendar if lanes exist, otherwise fallback to old view */}
                {lanes && lanes.length > 0 ? (
                  <>
                    {/* Header with lanes */}
                    <div className="sticky top-0 z-10 bg-background border-b">
                      <div className={`grid gap-0`} style={{gridTemplateColumns: `60px repeat(${lanes.length}, 1fr)`}}>
                        <div className="p-2 text-center font-medium border-r bg-muted/50 text-xs sm:text-sm">
                          Hora
                        </div>
                        {lanes.map((lane) => (
                          <div key={lane.id} className="p-2 text-center font-medium bg-muted/50 border-r last:border-r-0">
                            <span className="text-xs sm:text-sm font-semibold">{lane.name}</span>
                            <div className="text-xs text-muted-foreground">Cap: {lane.capacity}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Time slots with lane columns */}
                    <div className={`grid gap-0`} style={{gridTemplateColumns: `60px repeat(${lanes.length}, 1fr)`}} onMouseUp={handleSlotMouseUp}>
                      {timeSlots.map((timeSlot, timeIndex) => {
                        return (
                          <React.Fragment key={timeIndex}>
                            {/* Time label */}
                            <div className="p-1 sm:p-2 text-center text-xs sm:text-sm border-r border-b bg-muted/30 font-medium min-h-[50px] sm:min-h-[64px] flex items-center justify-center">
                              {format(timeSlot, 'HH:mm')}
                            </div>

                            {/* Lane columns */}
                            {lanes.map((lane) => {
                              const booking = getBookingForTimeAndLane(center.id, timeSlot, lane.id);
                              const isFirstSlotOfBooking = booking && 
                                format(timeSlot, 'HH:mm') === format(parseISO(booking.booking_datetime), 'HH:mm');
                              const isBlocked = isSlotBlocked(timeSlot, lane.id);
                              const isInSelection = isInDragSelection(timeSlot, lane.id);
                              const availableCapacity = getAvailableCapacity(center.id, timeSlot, lane.id);

                              return (
                                <div 
                                  key={`${timeIndex}-${lane.id}`}
                                  className={cn(
                                    "relative border-b border-r last:border-r-0 min-h-[50px] sm:min-h-[64px] transition-colors",
                                    isBlockingMode && isAdmin ? "cursor-pointer" : "",
                                    isBlocked ? "bg-red-100" : "hover:bg-muted/20",
                                    isInSelection ? "bg-blue-200" : "",
                                    availableCapacity === 0 && !booking ? "bg-gray-100" : ""
                                  )}
                                  onMouseDown={() => handleSlotMouseDown(timeSlot, lane.id)}
                                  onMouseEnter={() => handleSlotMouseEnter(timeSlot, lane.id)}
                                >
                                  {/* Blocked indicator */}
                                  {isBlocked && (
                                    <div className="absolute inset-1 bg-red-200 border border-red-400 rounded flex items-center justify-center">
                                      <Ban className="h-4 w-4 text-red-600" />
                                      <span className="text-xs text-red-600 ml-1">Bloqueado</span>
                                    </div>
                                  )}

                                  {/* Booking display */}
                                  {booking && isFirstSlotOfBooking && !isBlocked && (
                                    <div
                                      className={cn(
                                        "absolute inset-1 rounded border-l-4 p-1 sm:p-2 cursor-pointer transition-all hover:shadow-md w-[calc(100%-8px)] z-10",
                                        getStatusColor(booking.status)
                                      )}
                                      style={{
                                        height: `${Math.ceil((booking.duration_minutes || 60) / 30) * 50 - 4}px`,
                                        minHeight: '46px'
                                      }}
                                      onClick={() => handleBookingClick(booking)}
                                    >
                                      <div className="text-xs sm:text-sm font-semibold truncate">
                                        {booking.profiles?.first_name} {booking.profiles?.last_name}
                                      </div>
                                      <div className="text-xs text-muted-foreground truncate hidden sm:block">
                                        {booking.services?.name}
                                      </div>
                                      <div className="flex items-center gap-1 sm:gap-2 mt-1">
                                        <Badge variant="secondary" className="text-xs px-1 py-0">
                                          {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(((booking.total_price_cents || 0) / 100))}
                                        </Badge>
                                      </div>
                                      <div className="text-xs text-primary font-medium mt-1">
                                        Click para gestionar
                                      </div>
                                    </div>
                                  )}

                                  {/* Available slots indicator for empty slots */}
                                  {!booking && !isBlocked && availableCapacity > 0 && (
                                    <div className="absolute inset-1 rounded border border-dashed border-gray-300 flex items-center justify-center opacity-50 hover:opacity-100">
                                      <div className="text-xs text-muted-foreground text-center">
                                        <Plus className="h-3 w-3 mx-auto mb-1" />
                                        <div>Disponible</div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  /* Fallback to original single-column view if no lanes */
                  <>
                    {/* Header */}
                    <div className="sticky top-0 z-10 bg-background border-b">
                      <div className="grid grid-cols-[60px_1fr] sm:grid-cols-[80px_1fr] gap-0">
                        <div className="p-2 text-center font-medium border-r bg-muted/50 text-xs sm:text-sm">
                          Hora
                        </div>
                        <div className="p-2 text-center font-medium bg-muted/50">
                          <span className="text-xs sm:text-sm font-semibold">Reservas del día</span>
                        </div>
                      </div>
                    </div>

                    {/* Time slots */}
                    <div className="grid grid-cols-[60px_1fr] sm:grid-cols-[80px_1fr] gap-0">
                      {timeSlots.map((timeSlot, timeIndex) => {
                        const booking = getBookingForTimeAndEmployee(center.id, timeSlot, selectedEmployeeId === 'all' ? undefined : selectedEmployeeId);
                        const isFirstSlotOfBooking = booking && 
                          format(timeSlot, 'HH:mm') === format(parseISO(booking.booking_datetime), 'HH:mm');

                        return (
                          <React.Fragment key={timeIndex}>
                            {/* Time label */}
                            <div className="p-1 sm:p-2 text-center text-xs sm:text-sm border-r border-b bg-muted/30 font-medium min-h-[50px] sm:min-h-[64px] flex items-center justify-center">
                              {format(timeSlot, 'HH:mm')}
                            </div>

                            {/* Booking slot */}
                            <div className="relative border-b min-h-[50px] sm:min-h-[64px] hover:bg-muted/20 transition-colors">
                              {booking && isFirstSlotOfBooking && (
                                <div
                                  className={cn(
                                    "absolute inset-1 rounded border-l-4 p-1 sm:p-2 cursor-pointer transition-all hover:shadow-md w-[calc(100%-8px)]",
                                    getStatusColor(booking.status)
                                  )}
                                  style={{
                                    height: `${Math.ceil((booking.duration_minutes || 60) / 30) * 50 - 4}px`,
                                    minHeight: '46px'
                                  }}
                                  onClick={() => handleBookingClick(booking)}
                                >
                                  <div className="text-xs sm:text-sm font-semibold truncate">
                                    {booking.profiles?.first_name} {booking.profiles?.last_name}
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate hidden sm:block">
                                    {booking.services?.name}
                                  </div>
                                  <div className="flex items-center gap-1 sm:gap-2 mt-1">
                                    <Badge variant="secondary" className="text-xs px-1 py-0">
                                      {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(((booking.total_price_cents || 0) / 100))}
                                    </Badge>
                                    {booking.employee_id && (
                                      <div className="text-xs text-muted-foreground truncate hidden sm:block">
                                        {employees.find(e => e.id === booking.employee_id)?.profiles?.first_name}
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-xs text-primary font-medium mt-1">
                                    Click para gestionar
                                  </div>
                                </div>
                              )}
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
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
    <div className="h-screen overflow-hidden bg-background">
      {/* Fixed Header - compact and always visible */}
      <div className="sticky top-0 z-50 bg-background border-b p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={goToPreviousDay}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextDay}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-base sm:text-xl font-bold text-foreground">
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
            </div>
          </div>
        </div>

        {/* Center Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-3">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 h-auto gap-1">
            {centers.map((center) => (
              <TabsTrigger key={center.id} value={center.id} className="text-xs sm:text-sm py-2">
                {center.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Calendar Content - takes remaining height */}
      <div className="h-[calc(100vh-140px)] overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          {centers.map((center) => (
            <TabsContent key={center.id} value={center.id} className="h-full m-0 p-3 sm:p-4">
              {renderCenterCalendar(center)}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* New Booking Modal */}
      <Dialog open={showNewBookingModal} onOpenChange={setShowNewBookingModal}>
        <DialogContent className="max-w-md sm:max-w-lg mx-auto my-4 max-h-[85vh] overflow-hidden rounded-lg border flex flex-col bg-background">
          <DialogHeader className="flex-shrink-0 p-4 border-b bg-background sticky top-0 z-10">
            <DialogTitle className="text-xl font-semibold">Nueva Reserva</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Crear una nueva reserva para el {format(selectedDate, "d 'de' MMMM", { locale: es })}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 overflow-auto">
            <div className="p-4 max-w-lg mx-auto space-y-6">
              <div className="space-y-2">
                <Label htmlFor="clientName" className="text-sm font-medium">Buscar Cliente</Label>
                <Input
                  id="clientName"
                  value={newBookingForm.clientName}
                  onChange={(e) => setNewBookingForm({...newBookingForm, clientName: e.target.value})}
                  placeholder="Buscar por nombre, email o teléfono..."
                  className="w-full"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="service" className="text-sm font-medium">Servicio *</Label>
                  <Select value={newBookingForm.serviceId} onValueChange={(value) => setNewBookingForm({...newBookingForm, serviceId: value})}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar servicio" />
                    </SelectTrigger>
                    <SelectContent>
                      {allServices && allServices
                        .filter(service => service.center_id === activeTab || !service.center_id)
                        .map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                           {service.name} - {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(service.price_cents / 100)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time" className="text-sm font-medium">Hora</Label>
                  <Select value={newBookingForm.time} onValueChange={(value) => setNewBookingForm({...newBookingForm, time: value})}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="10:30" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  value={newBookingForm.notes}
                  onChange={(e) => setNewBookingForm({...newBookingForm, notes: e.target.value})}
                  placeholder="Notas adicionales..."
                  rows={3}
                  className="w-full resize-none"
                />
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-3 text-sm">Canjear código (opcional)</h4>
                <div className="space-y-2">
                  <Label htmlFor="redeemCode" className="text-sm font-medium">Código</Label>
                  <Input
                    id="redeemCode"
                    placeholder="ABCD1234"
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="flex-shrink-0 p-4 border-t bg-background sticky bottom-0">
            <div className="flex gap-3 max-w-lg mx-auto">
              <Button 
                variant="outline" 
                onClick={() => setShowNewBookingModal(false)} 
                className="flex-1 h-12"
              >
                Cancelar
              </Button>
              <Button 
                onClick={createBooking} 
                className="flex-1 h-12"
                disabled={!newBookingForm.serviceId || !newBookingForm.time}
              >
                <Save className="h-4 w-4 mr-2" />
                Crear Reserva
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Booking Modal */}
      <Dialog open={showEditBookingModal} onOpenChange={setShowEditBookingModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gestionar Reserva</DialogTitle>
            <DialogDescription>
              Gestión completa de la reserva seleccionada
            </DialogDescription>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-6">
              {/* Booking Info */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="font-semibold text-lg">
                      {selectedBooking.profiles?.first_name} {selectedBooking.profiles?.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedBooking.profiles?.email}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedBooking.profiles?.phone}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">
                      {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format((selectedBooking.total_price_cents || 0) / 100)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedBooking.services?.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(parseISO(selectedBooking.booking_datetime), "d 'de' MMMM 'a las' HH:mm", { locale: es })}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Badge className={cn(getStatusColor(selectedBooking.status))}>
                    Estado: {selectedBooking.status}
                  </Badge>
                  <Badge variant={selectedBooking.payment_status === 'paid' ? 'default' : 'secondary'}>
                    Pago: {selectedBooking.payment_status}
                  </Badge>
                  {selectedBooking.payment_method && (
                    <Badge variant="outline">
                      {selectedBooking.payment_method}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Status Management */}
              <div>
                <Label htmlFor="editStatus">Cambiar Estado</Label>
                <Select 
                  defaultValue={selectedBooking.status} 
                  onValueChange={(value: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | 'requested' | 'new' | 'online') => updateBookingStatus(selectedBooking.id, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">🆕 Nueva</SelectItem>
                    <SelectItem value="requested">📋 Solicitada</SelectItem>
                    <SelectItem value="confirmed">✅ Confirmada</SelectItem>
                    <SelectItem value="pending">⏳ Pendiente</SelectItem>
                    <SelectItem value="online">🌐 Online</SelectItem>
                    <SelectItem value="completed">✔️ Completada</SelectItem>
                    <SelectItem value="cancelled">❌ Cancelada</SelectItem>
                    <SelectItem value="no_show">❌ No Show</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Employee Assignment */}
              <div>
                <Label htmlFor="editEmployee">Cambiar Especialista</Label>
                <Select 
                  defaultValue={selectedBooking.employee_id || "none"} 
                  onValueChange={(value) => {
                    if (value !== "none") {
                      updateBookingEmployee(selectedBooking.id, value);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar especialista" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin especialista asignado</SelectItem>
                    {employees.filter(emp => emp.center_id === selectedBooking.center_id).map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.profiles?.first_name} {employee.profiles?.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => setShowPaymentModal(true)} className="flex items-center">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Cobrar Cita
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setNewBookingDate(parseISO(selectedBooking.booking_datetime));
                    setNewBookingTime(format(parseISO(selectedBooking.booking_datetime), 'HH:mm'));
                    setShowRescheduleModal(true);
                  }}
                  className="flex items-center"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Reagendar
                </Button>
                <Button variant="outline" onClick={() => setShowEditBookingModal(false)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Cerrar
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => deleteBooking(selectedBooking.id)}
                  className="flex items-center"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Borrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cobrar Cita</DialogTitle>
            <DialogDescription>
              Registrar el pago de la reserva
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="paymentMethod">Forma de Pago</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar forma de pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">💰 Efectivo</SelectItem>
                  <SelectItem value="tarjeta">💳 Tarjeta</SelectItem>
                  <SelectItem value="online">🌐 Online</SelectItem>
                  <SelectItem value="transferencia">🏦 Transferencia</SelectItem>
                  <SelectItem value="bizum">📱 Bizum</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="paymentNotes">Notas del Pago (opcional)</Label>
              <Textarea
                id="paymentNotes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Notas adicionales sobre el pago..."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPaymentModal(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={processPayment} className="flex-1">
                <DollarSign className="h-4 w-4 mr-2" />
                Registrar Pago
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule Modal */}
      <Dialog open={showRescheduleModal} onOpenChange={setShowRescheduleModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reagendar Cita</DialogTitle>
            <DialogDescription>
              Seleccionar nueva fecha y hora para la reserva
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="newDate">Nueva Fecha</Label>
              <Input
                id="newDate"
                type="date"
                value={format(newBookingDate, 'yyyy-MM-dd')}
                onChange={(e) => setNewBookingDate(new Date(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="newTime">Nueva Hora</Label>
              <Select value={newBookingTime} onValueChange={setNewBookingTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar hora" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowRescheduleModal(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={rescheduleBooking} className="flex-1">
                <Calendar className="h-4 w-4 mr-2" />
                Reagendar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SimpleCenterCalendar;