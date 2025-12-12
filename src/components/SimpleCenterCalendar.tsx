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
import { useTranslation, translateServiceName } from '@/hooks/useTranslation';
import { supabase } from '@/integrations/supabase/client';

const SimpleCenterCalendar = () => {
  const { toast } = useToast();
  const { language, t } = useTranslation();
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
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [captureAmountInput, setCaptureAmountInput] = useState<string>('');
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
    notes: '',
    centerId: '' // Will be set when creating booking
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

  // Filter bookings for selected date and center - STRICT filtering
  const getBookingsForDate = (centerId: string) => {
    if (!Array.isArray(bookings) || !centerId) return [];
    
    const filtered = bookings.filter(booking => {
      // STRICT: Must have center_id and match exactly
      if (!booking.booking_datetime || !booking.center_id || booking.center_id !== centerId) return false;
      
      try {
        const bookingDate = parseISO(booking.booking_datetime);
        const isSameDayResult = isSameDay(bookingDate, selectedDate);
        // Double check center_id match (already checked above, but explicit for clarity)
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
      case 'pending_payment': 
      case 'pending':
        return 'bg-yellow-100 border-yellow-500 text-yellow-700';
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
    // CRITICAL: Set centerId in form to match the selected center
    setNewBookingForm({
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      serviceId: '',
      employeeId: '',
      time: '',
      duration: 60,
      notes: '',
      centerId: centerId // Ensure centerId is set from the start
    });
    setShowNewBookingModal(true);
  };

  // Handle booking click
  const handleBookingClick = (booking: any) => {
    setSelectedBooking(booking);
    setShowEditBookingModal(true);
    // Reset payment modal state when opening booking
    setPaymentAmount(0);
    setCaptureAmountInput('');
    setPaymentMethod('');
    setPaymentNotes('');
  };

  // Create new booking
  const createBooking = async () => {
    try {
      // CRITICAL: Ensure center_id matches activeTab (selected center)
      if (!activeTab || newBookingForm.centerId !== activeTab) {
        console.error('❌ Center ID mismatch:', { 
          formCenterId: newBookingForm.centerId, 
          activeTab 
        });
        toast({
          title: "Error de centro",
          description: "El centro seleccionado no coincide. Por favor, intenta de nuevo.",
          variant: "destructive",
        });
        return;
      }
      
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
            .upsert([{
              email: newBookingForm.clientEmail,
              first_name: newBookingForm.clientName.split(' ')[0],
              last_name: newBookingForm.clientName.split(' ').slice(1).join(' '),
              phone: newBookingForm.clientPhone,
              role: 'client'
            }], {
              onConflict: 'email'
            })
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

      // Final validation: ensure activeTab is set and matches form
      if (!activeTab) {
        toast({
          title: "Error",
          description: "No se ha seleccionado un centro. Por favor, selecciona un centro.",
          variant: "destructive",
        });
        return;
      }

      // CRITICAL: Use activeTab (the selected center tab) as the center_id
      // This ensures the booking is created for the correct center
      const finalCenterId = activeTab;
      
      const { error: bookingError } = await supabase
        .from('bookings')
        .insert({
          client_id: clientProfile?.id,
          service_id: newBookingForm.serviceId,
          center_id: finalCenterId, // Use activeTab which is the selected center tab
          employee_id: newBookingForm.employeeId === 'auto' ? null : newBookingForm.employeeId,
          booking_datetime: bookingDate.toISOString(),
          duration_minutes: newBookingForm.duration,
          total_price_cents: selectedService.price_cents,
          // Crear siempre como 'pending_payment' (confirmación sólo tras cobro)
          status: 'pending_payment' as const,
          channel: 'web' as const,
          notes: newBookingForm.notes || null,
          payment_status: 'pending' as const
        });

      if (bookingError) throw bookingError;

      toast({
        title: "✅ Reserva Creada",
        description: `Reserva creada como pendiente. Confirma al cobrar.`,
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
  const updateBookingStatus = async (bookingId: string, status: 'pending_payment' | 'confirmed' | 'completed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId);

      if (error) throw error;

      // Update selectedBooking state to reflect the new status
      if (selectedBooking && selectedBooking.id === bookingId) {
        setSelectedBooking({ ...selectedBooking, status });
      }

      toast({
        title: "✅ Estado Actualizado",
        description: `Estado de la reserva actualizado a ${status}.`,
      });

      refetchBookings();
      // Don't close modal if status is no_show, so user can immediately charge
      if (status !== 'no_show') {
        setShowEditBookingModal(false);
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado.",
        variant: "destructive",
      });
    }
  };

  // Helper: create checkout session and send email to client
  const sendPaymentLinkFallback = async (amountOverrideCents?: number) => {
    try {
      const baseCents = typeof amountOverrideCents === 'number' && amountOverrideCents > 0
        ? Math.round(amountOverrideCents)
        : (selectedBooking?.total_price_cents || 0);
      const minCents = Math.max(50, baseCents);
      const { data, error } = await (supabase as any).functions.invoke('create-checkout', {
        body: { intent: 'booking_payment', booking_payment: { booking_id: selectedBooking.id, amount_cents: minCents }, currency: 'eur' }
      });
      const checkoutUrl: string | null = data?.url || (data?.client_secret ? `https://checkout.stripe.com/c/pay/${data.client_secret}` : null);
      if (error || !checkoutUrl) throw new Error(error?.message || 'No se pudo generar el link de pago');

      const to = selectedBooking?.profiles?.email;
      if (to) {
        const msg = `Hola,\n\nHemos generado un enlace de pago para tu cita en The Nook Madrid.\nImporte: ${((selectedBooking.total_price_cents || 0) / 100).toFixed(2)}€.\n\nPor favor completa el pago aquí: ${checkoutUrl}\n\nGracias.`;
        try {
          await (supabase as any).functions.invoke('send-email', {
            body: { to, subject: 'Enlace de pago de tu cita - The Nook Madrid', message: msg }
          });
        } catch (e) {
          console.warn('No se pudo enviar el email con el link de pago:', e);
        }
      }

      try { await navigator.clipboard.writeText(checkoutUrl); } catch {}

      toast({
        title: 'Link de pago generado',
        description: `${to ? `Enviado a ${to}. ` : ''}También lo hemos copiado. ${checkoutUrl}`,
      });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'No se pudo generar el link de pago', variant: 'destructive' });
    }
  };

  // Helper function to get desired charge amount (similar to BookingCardWithModal)
  const getDesiredChargeAmountCents = (overrideAmountCents?: number) => {
    if (typeof overrideAmountCents === 'number' && !Number.isNaN(overrideAmountCents)) {
      return Math.max(0, Math.round(overrideAmountCents));
    }
    const input = captureAmountInput?.trim();
    if (input) {
      const parsed = parseFloat(input.replace(',', '.'));
      if (!Number.isNaN(parsed)) {
        return Math.max(0, Math.round(parsed * 100));
      }
    }
    // Use paymentAmount if set, otherwise use booking total
    if (paymentAmount > 0) {
      return Math.round(paymentAmount * 100);
    }
    return Math.max(0, selectedBooking?.total_price_cents || 0);
  };

  // Process payment
  const processPayment = async () => {
    try {
      if (!paymentMethod) {
        toast({ 
          title: 'Selecciona forma de pago', 
          description: 'Elige cómo se cobró la reserva.', 
          variant: 'destructive' 
        });
        return;
      }

      const desiredAmountCents = getDesiredChargeAmountCents();

      // If staff selects tarjeta, try to charge saved card
      if (paymentMethod === 'tarjeta') {
        // Check if booking has reserva_id (for capture-payment) or use charge-booking
        if (selectedBooking?.reserva_id) {
          // Use capture-payment for bookings with reserva_id (allows partial capture)
          const { data, error: fnErr } = await (supabase as any).functions.invoke('capture-payment', {
            body: { reserva_id: selectedBooking.reserva_id, amount_to_capture: desiredAmountCents }
          });
          if (fnErr || !data?.ok) {
            const reason = (fnErr as any)?.message || data?.error || '';
            if (data?.requires_action) {
              await sendPaymentLinkFallback(desiredAmountCents);
            } else {
              toast({ 
                title: 'Cobro no realizado', 
                description: reason || 'No se pudo procesar el cobro.', 
                variant: 'destructive' 
              });
            }
            return;
          }
        } else {
          // Use charge-booking for regular bookings
          // Skip email if this is a no_show booking
          const skipEmail = selectedBooking?.status === 'no_show';
          const { data, error: fnErr } = await (supabase as any).functions.invoke('charge-booking', {
            body: { 
              booking_id: selectedBooking.id, 
              amount_cents: desiredAmountCents,
              skip_email: skipEmail
            }
          });
          if (fnErr || !data?.ok) {
            const reason = (fnErr as any)?.message || data?.error || '';
            if (data?.requires_action) {
              await sendPaymentLinkFallback(desiredAmountCents);
            } else {
              // Fallback: send payment link with the same amount (min 0.50€)
              await sendPaymentLinkFallback(desiredAmountCents);
            }
            return;
          }
        }
        // Mark as paid by card
        // CRITICAL: Cuando se marca como pagado, actualizar el estado de reserva automáticamente
        // Si es no_show, mantener no_show. Si no, cambiar a confirmed (nunca dejar como pending)
        const updateData: any = {
          payment_status: 'paid',
          payment_method: 'tarjeta',
          payment_notes: paymentNotes || 'Cobro automático Stripe'
        };
        
        // Si estaba pendiente de pago, pasar a confirmed al marcar pagado
        updateData.status = selectedBooking.status === 'pending_payment' ? 'confirmed' : selectedBooking.status;
        
        const { error } = await supabase
          .from('bookings')
          .update(updateData)
          .eq('id', selectedBooking.id);
        if (error) throw error;
      } else if (paymentMethod === 'online') {
        // Generate link and keep booking pending until paid (use amount from input if provided)
        await sendPaymentLinkFallback(desiredAmountCents);
        return;
      } else {
        // Manual methods: efectivo/bizum/transferencia
        // CRITICAL: Cuando se marca como pagado, actualizar el estado de reserva automáticamente
        // Si es no_show, mantener no_show. Si no, cambiar a confirmed (nunca dejar como pending)
        const updateData: any = {
          payment_status: 'paid',
          payment_method: paymentMethod,
          payment_notes: paymentNotes || null
        };
        
        // Si estaba pendiente de pago, pasar a confirmed al marcar pagado
        updateData.status = selectedBooking.status === 'pending_payment' ? 'confirmed' : selectedBooking.status;
        
        const { error } = await supabase
          .from('bookings')
          .update(updateData)
          .eq('id', selectedBooking.id);
        if (error) throw error;
      }

      toast({
        title: "✅ Pago Registrado",
        description: `Pago procesado exitosamente${paymentMethod ? ` con ${paymentMethod}` : ''}.`,
      });

      refetchBookings();
      setShowPaymentModal(false);
      setShowEditBookingModal(false);
      setPaymentMethod('');
      setPaymentNotes('');
      setPaymentAmount(0);
      setCaptureAmountInput('');
    } catch (error) {
      console.error('Error processing payment:', error);
      // Last resort
      await sendPaymentLinkFallback();
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
                  <SelectItem value="pending_payment">⏳ Pendientes de pago</SelectItem>
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
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="text-xs sm:text-sm font-semibold truncate">
                                    {booking.profiles?.first_name} {booking.profiles?.last_name}
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate hidden sm:block">
                                    {booking.services?.name ? translateServiceName(booking.services.name, language, t) : ''}
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
                                </div>
                                {/* Botón de tarjeta: rojo si no tiene, azul si tiene - Diseño mejorado */}
                                <div
                                  className={cn(
                                    "p-1.5 rounded-lg flex items-center justify-center ml-1 flex-shrink-0 min-w-[28px] min-h-[28px] shadow-sm border-2 backdrop-blur-sm",
                                    "bg-gradient-to-br",
                                    booking.stripe_payment_method_id
                                      ? "from-blue-500 to-blue-600 text-white border-blue-400/50"
                                      : "from-red-500 to-red-600 text-white border-red-400/50"
                                  )}
                                  title={booking.stripe_payment_method_id ? "✓ Tarjeta guardada" : "⚠ Sin tarjeta guardada"}
                                >
                                  <CreditCard className="h-3.5 w-3.5" strokeWidth={2.5} />
                                </div>
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
        <DialogContent className="max-w-[640px] mx-auto my-4 max-h-[85vh] overflow-hidden rounded-lg border flex flex-col bg-background">
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
                           {translateServiceName(service.name, language, t)} - {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(service.price_cents / 100)}
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
        <DialogContent className="max-w-[640px] overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="px-4 sm:px-6 pt-4 pb-3 border-b bg-background flex-shrink-0">
            <DialogTitle>Gestionar Reserva</DialogTitle>
            <DialogDescription>
              Gestión completa de la reserva seleccionada
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
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
                      {selectedBooking.services?.name ? translateServiceName(selectedBooking.services.name, language, t) : ''}
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
                  value={selectedBooking.status} 
                  onValueChange={(value: 'pending_payment' | 'confirmed' | 'completed' | 'cancelled') => updateBookingStatus(selectedBooking.id, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed">✅ Confirmada</SelectItem>
                    <SelectItem value="pending_payment">⏳ Pendiente de pago</SelectItem>
                    <SelectItem value="completed">✔️ Completada</SelectItem>
                    <SelectItem value="cancelled">❌ Cancelada</SelectItem>
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
            </div>
          )}
          </div>
          {/* Action Buttons - Fixed at bottom */}
          {selectedBooking && (
            <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-t bg-background">
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    // Reset payment state when opening payment modal
                    setPaymentAmount(selectedBooking?.total_price_cents ? (selectedBooking.total_price_cents / 100) : 0);
                    setCaptureAmountInput('');
                    setPaymentMethod('');
                    setPaymentNotes('');
                    setShowPaymentModal(true);
                  }} 
                  className="flex items-center justify-center"
                  disabled={selectedBooking?.payment_status === 'paid'}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {selectedBooking?.payment_status === 'paid' ? 'Ya Pagado' : 'Cobrar Cita'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setNewBookingDate(parseISO(selectedBooking.booking_datetime));
                    setNewBookingTime(format(parseISO(selectedBooking.booking_datetime), 'HH:mm'));
                    setShowRescheduleModal(true);
                  }}
                  className="flex items-center justify-center"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Reagendar
                </Button>
                <Button variant="outline" onClick={() => setShowEditBookingModal(false)} className="flex items-center justify-center">
                  <Edit className="h-4 w-4 mr-2" />
                  Cerrar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="flex items-center justify-center">
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
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-4 mx-auto my-8">
          <DialogHeader>
            <DialogTitle>Cobrar Cita</DialogTitle>
            <DialogDescription>
              Registrar el pago de la reserva
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Show penalty field if status is no_show */}
            {selectedBooking?.status === 'no_show' && (
              <div className="space-y-2 border border-amber-200 bg-amber-50 rounded-lg p-4">
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-amber-900">Penalización por No Show</Label>
                  <Label className="text-xs text-amber-700">
                    Define el importe parcial que deseas cobrar.
                  </Label>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-amber-900">Importe a cobrar (EUR)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={captureAmountInput}
                    onChange={(e) => setCaptureAmountInput(e.target.value)}
                    placeholder={(selectedBooking?.total_price_cents || 0) / 100 > 0 
                      ? ((selectedBooking.total_price_cents || 0) / 100).toFixed(2) 
                      : '0.00'}
                    className="bg-white"
                  />
                </div>
                {selectedBooking?.total_price_cents && captureAmountInput && (() => {
                  const parsed = parseFloat(captureAmountInput.replace(',', '.'));
                  const originalPrice = (selectedBooking.total_price_cents || 0) / 100;
                  if (!isNaN(parsed) && originalPrice > 0) {
                    const percentage = Math.round((parsed / originalPrice) * 100);
                    return (
                      <p className="text-xs text-amber-700">
                        Esto equivale aproximadamente a {percentage}% del precio original.
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
            )}

            <div>
              <Label htmlFor="paymentAmount">Importe a cobrar (€)</Label>
              <Input
                id="paymentAmount"
                type="number"
                min={0}
                step={0.01}
                value={paymentAmount || (selectedBooking ? (selectedBooking.total_price_cents || 0) / 100 : 0)}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                disabled={selectedBooking?.status === 'no_show' && captureAmountInput.trim() !== ''}
              />
              {selectedBooking?.status === 'no_show' && (
                <p className="text-xs text-muted-foreground mt-1">
                  {captureAmountInput.trim() !== '' 
                    ? 'El importe de penalización se usará para el cobro.' 
                    : 'Usa el campo de penalización arriba o este campo para definir el importe.'}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="paymentMethod">Forma de Pago *</Label>
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
              <Button variant="outline" onClick={() => {
                setShowPaymentModal(false);
                setCaptureAmountInput('');
                setPaymentAmount(0);
              }} className="flex-1">
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
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
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
