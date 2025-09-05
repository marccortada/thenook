import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
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
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { format, addDays, subDays, startOfDay, addMinutes, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useBookings, useCenters, useEmployees, useServices } from '@/hooks/useDatabase';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const SimpleCenterCalendar = () => {
  const { toast } = useToast();
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
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "✅ Reserva Borrada",
        description: "La reserva ha sido eliminada completamente del sistema.",
      });

      refetchBookings();
      setShowEditBookingModal(false);
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast({
        title: "Error",
        description: "No se pudo borrar la reserva. Inténtalo de nuevo.",
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

        {/* Employee and Status filters - Mobile Optimized */}
        <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium">
                <User className="h-3 w-3" />
                <span>Especialista</span>
              </div>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {centerEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.profiles?.first_name} {employee.profiles?.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium">
                <span>Estado</span>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
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
            </div>
            
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <div className="text-xs font-medium opacity-0">Acción</div>
              <Button size="sm" onClick={() => handleNewBooking(center.id)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Nueva Reserva</span>
                <span className="sm:hidden">Nueva</span>
              </Button>
            </div>
          </div>
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
                                height: `${((booking.duration_minutes || 60) / 30) * 50}px`,
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
                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPaymentModal(true);
                  }} 
                  className="flex items-center"
                >
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
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="flex items-center">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Borrar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        ¿Borrar Reserva Completamente?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción eliminará permanentemente la reserva del sistema. 
                        No se puede deshacer. ¿Estás seguro de que quieres continuar?
                        <br /><br />
                        <strong>Cliente:</strong> {selectedBooking?.profiles?.first_name} {selectedBooking?.profiles?.last_name}
                        <br />
                        <strong>Fecha:</strong> {selectedBooking && format(parseISO(selectedBooking.booking_datetime), "d 'de' MMMM 'a las' HH:mm", { locale: es })}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => deleteBooking(selectedBooking.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Sí, Borrar Completamente
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="w-[300px] sm:w-[350px] max-h-[400px] overflow-y-auto p-4 mx-auto my-8">
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Reagendar Cita
            </DialogTitle>
            <DialogDescription>
              Selecciona la nueva fecha y hora para la reserva de <strong>{selectedBooking?.profiles?.first_name} {selectedBooking?.profiles?.last_name}</strong>
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
              <Button 
                onClick={rescheduleBooking} 
                className="flex-1"
                disabled={!newBookingTime}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Reagendar Cita
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SimpleCenterCalendar;