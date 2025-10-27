import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, User, X, Tag } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import MobileCard from "@/components/MobileCard";
import { useIsMobile } from "@/hooks/use-mobile";
import AppModal from "@/components/ui/app-modal";
import { useInternalCodes } from "@/hooks/useInternalCodes";

interface Booking {
  id: string;
  booking_datetime: string;
  duration_minutes: number;
  total_price_cents: number;
  status: string;
  payment_status: string;
  payment_method?: string;
  payment_notes?: string;
  notes?: string;
  booking_codes?: string[];
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

const BOOKING_STATUSES = [
  { value: 'requested', label: 'Solicitada', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed', label: 'Confirmada', color: 'bg-blue-100 text-blue-800' },
  { value: 'new', label: 'Nueva', color: 'bg-green-100 text-green-800' },
  { value: 'online', label: 'Online', color: 'bg-purple-100 text-purple-800' },
  { value: 'cancelled', label: 'Cancelada', color: 'bg-red-100 text-red-800' },
  { value: 'no_show', label: 'No Show', color: 'bg-gray-100 text-gray-800' },
];

const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pendiente de Pago', color: 'bg-orange-100 text-orange-800' },
  { value: 'paid', label: 'Pagada', color: 'bg-green-100 text-green-800' },
  { value: 'completed', label: 'Pagada', color: 'bg-green-100 text-green-800' },
];

const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'bizum', label: 'Bizum' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'apple_pay', label: 'Apple Pay' },
];

interface BookingCardWithModalProps {
  booking: Booking;
  onBookingUpdated: () => void;
}

export default function BookingCardWithModal({ booking, onBookingUpdated }: BookingCardWithModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [bookingStatus, setBookingStatus] = useState(booking.status);
  const [paymentStatus, setPaymentStatus] = useState(booking.payment_status);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [selectedBookingCodes, setSelectedBookingCodes] = useState<string[]>(booking.booking_codes || []);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const baseSelectClass =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  // Fetch codes
  const { codes, assignments, getAssignmentsByEntity } = useInternalCodes();
  
  // Get client codes
  const clientCodes = booking.profiles?.id ? getAssignmentsByEntity('client', booking.profiles.id) : [];

  const getStatusBadge = (status: string) => {
    const statusConfig = BOOKING_STATUSES.find(s => s.value === status) || BOOKING_STATUSES[0];
    return (
      <Badge className={statusConfig.color}>
        {statusConfig.label}
      </Badge>
    );
  };

  const getPaymentBadge = (paymentStatus: string) => {
    const statusConfig = PAYMENT_STATUSES.find(s => s.value === paymentStatus) || PAYMENT_STATUSES[0];
    return (
      <Badge className={statusConfig.color}>
        {statusConfig.label}
      </Badge>
    );
  };

  const updateBookingStatus = async (status: string) => {
    try {
      // Si marcamos como completada y aún no está pagada, intenta cobrar primero
      if (status === 'completed' && paymentStatus !== 'paid') {
        try {
          setIsProcessingPayment(true);
          const { data, error } = await (supabase as any).functions.invoke('charge-booking', {
            body: { booking_id: booking.id, amount_cents: booking.total_price_cents }
          });
          if (error || !data?.ok) throw new Error(error?.message || data?.error);
          await supabase.from('bookings').update({ payment_status: 'paid' }).eq('id', booking.id);
          setPaymentStatus('paid');
          toast({ title: 'Pago procesado', description: 'Se ha cobrado la reserva correctamente' });
        } catch (e) {
          console.warn('No se pudo cobrar automáticamente antes de completar:', e);
        } finally {
          setIsProcessingPayment(false);
        }
      }

      const { error } = await supabase
        .from('bookings')
        .update({ status: status as any })
        .eq('id', booking.id);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: "El estado de la cita ha sido actualizado"
      });

      setBookingStatus(status);
      onBookingUpdated();
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive"
      });
    }
  };

  const updatePaymentStatus = async (status: string) => {
    try {
      // Si marcamos como pagada, primero cobramos a la tarjeta guardada
      if (status === 'paid' && paymentStatus !== 'paid') {
        setIsProcessingPayment(true);
        const { data, error } = await (supabase as any).functions.invoke('charge-booking', {
          body: { booking_id: booking.id, amount_cents: booking.total_price_cents }
        });
        if (error || !data?.ok) {
          await sendPaymentLinkFallback((error as any)?.message || data?.error);
          return;
        }
      }

      const { error: updErr } = await supabase
        .from('bookings')
        .update({ 
          payment_status: status as any,
          payment_method: status === 'paid' ? 'tarjeta' : null,
          payment_notes: status === 'paid' ? `Cobro automático Stripe` : null
        } as any)
        .eq('id', booking.id);

      if (updErr) throw updErr;

      toast({
        title: "Pago actualizado",
        description: status === 'paid' ? 'Se ha cobrado la reserva correctamente' : 'El estado del pago ha sido actualizado'
      });

      setPaymentStatus(status);
      onBookingUpdated();
    } catch (error) {
      console.error('Error updating booking payment:', error);
      toast({
        title: "Error",
        description: (error as any)?.message || "No se pudo actualizar el estado del pago",
        variant: "destructive"
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const updateBookingCodes = async (newCodes: string[]) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ booking_codes: newCodes })
        .eq('id', booking.id);

      if (error) throw error;

      toast({
        title: "Códigos actualizados",
        description: "Los códigos de la reserva han sido actualizados"
      });

      setSelectedBookingCodes(newCodes);
      onBookingUpdated();
    } catch (error) {
      console.error('Error updating booking codes:', error);
      toast({
        title: "Error",
        description: "No se pudieron actualizar los códigos",
        variant: "destructive"
      });
    }
  };

  const toggleBookingCode = (codeValue: string) => {
    const newCodes = selectedBookingCodes.includes(codeValue)
      ? selectedBookingCodes.filter(c => c !== codeValue)
      : [...selectedBookingCodes, codeValue];
    updateBookingCodes(newCodes);
  };

  const getCodeBadgeColor = (code: string) => {
    const codeData = codes.find(c => c.code === code);
    return codeData?.color || '#3B82F6';
  };

  const isVipBooking = () => {
    return clientCodes.some(assignment => assignment.code_name?.toLowerCase().includes('vip')) ||
           selectedBookingCodes.some(code => code.toLowerCase().includes('vip'));
  };

  const isPriorityBooking = () => {
    return clientCodes.some(assignment => assignment.code_name?.toLowerCase().includes('priority')) ||
           selectedBookingCodes.some(code => code.toLowerCase().includes('priority'));
  };

  const handleOpenModal = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setPaymentMethod('');
    setPaymentNotes('');
  };

  // Registrar pago manual (efectivo, bizum, etc.)
  const processPayment = async () => {
    if (!paymentMethod) {
      toast({
        title: "Error",
        description: "Selecciona una forma de pago",
        variant: "destructive"
      });
      return;
    }

    setIsProcessingPayment(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          payment_status: 'paid',
          payment_method: paymentMethod,
          payment_notes: paymentNotes || `Cobrado por ${paymentMethod} el ${new Date().toLocaleString()}`
        })
        .eq('id', booking.id);

      if (error) throw error;

      // Analytics tracking
      try {
        const analyticsData = {
          event_type: 'payment_processed',
          booking_id: booking.id,
          payment_method: paymentMethod,
          amount_cents: booking.total_price_cents,
          client_id: booking.profiles?.email,
          service_name: booking.services?.name,
          center_name: booking.centers?.name,
          processed_at: new Date().toISOString(),
          processed_by: 'staff'
        };

        await supabase.from('business_metrics').insert({
          metric_name: 'payment_processed',
          metric_type: 'revenue',
          metric_value: booking.total_price_cents / 100,
          period_start: new Date().toISOString().split('T')[0],
          period_end: new Date().toISOString().split('T')[0],
          metadata: analyticsData
        });

        console.log('Analytics data sent:', analyticsData);
      } catch (analyticsError) {
        console.error('Error sending analytics data:', analyticsError);
      }

      toast({
        title: "💰 Pago procesado exitosamente",
        description: `Cita cobrada por ${PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label} - ${(booking.total_price_cents / 100).toFixed(2)}€`
      });

      setPaymentStatus('paid');
      setPaymentMethod('');
      setPaymentNotes('');
      setIsOpen(false);
      onBookingUpdated();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar el pago",
        variant: "destructive"
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Cobrar tarjeta guardada vía Edge Function (Stripe)
  const chargeSavedCard = async () => {
    try {
      setIsProcessingPayment(true);
      const { data, error } = await (supabase as any).functions.invoke('charge-booking', {
        body: { booking_id: booking.id, amount_cents: booking.total_price_cents }
      });
      if (error || !data?.ok) {
        const reason = (error as any)?.message || data?.error || 'No se pudo procesar el cobro';
        await sendPaymentLinkFallback(reason);
        return;
      }
      await supabase
        .from('bookings')
        .update({ payment_status: 'paid', payment_method: 'tarjeta', payment_notes: `Cobro automático Stripe` })
        .eq('id', booking.id);
      setPaymentStatus('paid');
      toast({ title: 'Pago procesado', description: 'Se ha cobrado la reserva correctamente' });
      onBookingUpdated();
    } catch (e) {
      toast({ title: 'Error', description: (e as any).message || 'No se pudo procesar el cobro', variant: 'destructive' });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Fallback: crear sesión de Checkout y enviar link por email
  const sendPaymentLinkFallback = async (_reason?: string) => {
    try {
      const { data, error } = await (supabase as any).functions.invoke('create-checkout', {
        body: { intent: 'booking_payment', booking_payment: { booking_id: booking.id }, currency: 'eur' }
      });
      const checkoutUrl: string | null = data?.url || (data?.client_secret ? `https://checkout.stripe.com/c/pay/${data.client_secret}` : null);
      if (error || !checkoutUrl) {
        throw new Error(error?.message || 'No se pudo generar el link de pago');
      }

      const to = booking.profiles?.email;
      if (to) {
        const msg = `Hola,\n\nHemos generado un enlace de pago para tu cita en The Nook Madrid.\nImporte: ${(booking.total_price_cents / 100).toFixed(2)}€.\n\nPor favor completa el pago aquí: ${checkoutUrl}\n\nGracias.`;
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
        title: 'Link de pago enviado',
        description: to
          ? `Hemos enviado el enlace a ${to} y lo hemos copiado al portapapeles.`
          : 'Enlace generado y copiado al portapapeles.',
      });
    } catch (e) {
      toast({ title: 'Error', description: (e as any).message || 'No se pudo generar el link de pago', variant: 'destructive' });
    }
  };

  return (
    <MobileCard 
      className={`booking-card ${isVipBooking() ? 'ring-2 ring-yellow-400' : isPriorityBooking() ? 'ring-2 ring-orange-400' : ''}`} 
      padding="sm"
    >
      <div className="space-y-3 sm:space-y-4">
        {/* Header Mobile/Desktop */}
        <div className={`${isMobile ? 'space-y-3' : 'flex justify-between items-start'}`}>
          <div className="space-y-2">
            <div className={`font-semibold flex items-center gap-2 ${
              isMobile ? 'text-base' : 'text-lg'
            }`}>
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
              Cita - {format(new Date(booking.booking_datetime), 'dd/MM/yyyy', { locale: es })}
            </div>
            <div className={`${
              isMobile ? 'flex flex-col gap-1' : 'flex items-center gap-4'
            } text-xs sm:text-sm text-muted-foreground`}>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                {format(new Date(booking.booking_datetime), 'HH:mm', { locale: es })} 
                ({booking.duration_minutes} min)
              </div>
              {booking.profiles && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="truncate">
                    {booking.profiles.first_name} {booking.profiles.last_name}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className={`${isMobile ? 'flex justify-between items-center' : 'text-right'} space-y-2`}>
            <div className={`font-bold text-primary ${
              isMobile ? 'text-lg' : 'text-xl'
            }`}>
              {(booking.total_price_cents / 100).toFixed(2)}€
            </div>
            <div className="flex gap-1 sm:gap-2 items-center justify-end">
              {getStatusBadge(bookingStatus)}
              {getPaymentBadge(paymentStatus)}
              {paymentStatus === 'pending' && (
                <Button
                  size="sm"
                  onClick={chargeSavedCard}
                  disabled={isProcessingPayment}
                  className="h-7"
                >
                  {isProcessingPayment ? 'Cobrando…' : 'Cobrar'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className={`grid gap-3 sm:gap-4 ${
          isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
        }`}>
          <div>
            <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Servicio</Label>
            <p className="font-medium text-sm sm:text-base truncate">
              {booking.services?.name || 'Sin servicio'}
            </p>
          </div>
          <div>
            <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Centro</Label>
            <p className="font-medium text-sm sm:text-base truncate">
              {booking.centers?.name || 'Sin centro'}
            </p>
          </div>
          <div>
            <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Cliente</Label>
            <p className="font-medium text-sm sm:text-base truncate">
              {booking.profiles?.email || 'Sin email'}
            </p>
            {booking.profiles?.phone && (
              <p className="text-xs sm:text-sm text-muted-foreground">
                {booking.profiles.phone}
              </p>
            )}
          </div>
          <div>
            <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Notas</Label>
            <p className="text-xs sm:text-sm line-clamp-2">
              {booking.notes || 'Sin notas'}
            </p>
          </div>
          {paymentStatus === 'paid' && (
            <div className="md:col-span-2">
              <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Pago</Label>
              <p className="text-xs sm:text-sm">
                Método: {booking.payment_method ? booking.payment_method : 'tarjeta'} {booking.payment_notes ? `· ${booking.payment_notes}` : ''}
              </p>
            </div>
          )}
        </div>

        {/* Códigos Section */}
        {(clientCodes.length > 0 || selectedBookingCodes.length > 0) && (
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Tag className="h-3 w-3" />
              Códigos
            </Label>
            <div className="flex flex-wrap gap-1">
              {/* Client codes */}
              {clientCodes.map((assignment) => (
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
                  Cliente: {assignment.code}
                </Badge>
              ))}
              {/* Booking specific codes */}
              {selectedBookingCodes.map((code) => (
                <Badge 
                  key={code}
                  variant="secondary"
                  className="text-xs"
                  style={{ 
                    borderColor: getCodeBadgeColor(code),
                    color: getCodeBadgeColor(code),
                    backgroundColor: `${getCodeBadgeColor(code)}20`
                  }}
                >
                  Reserva: {code}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-3 sm:pt-4 border-t">
          <Button
            className="w-full sm:w-auto"
            variant="outline"
            onClick={handleOpenModal}
          >
            Modificar Reserva
          </Button>
        </div>

        {/* Unified AppModal */}
        <AppModal open={isOpen} onClose={closeModal} maxWidth={500} mobileMaxWidth={350} maxHeight={600} zIndex={120} overlayZIndex={110}>
              <div className={`${isMobile ? 'p-4' : 'p-6'} flex flex-col gap-4 h-full`}>                
                {/* Header */}
                <div className={`flex items-center justify-between ${isMobile ? '' : 'mb-2'}`}>
                  <h3 className={`font-semibold ${isMobile ? 'text-lg' : 'text-xl'}`}>
                    Modificar Reserva
                  </h3>
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
                <div className="space-y-3 sm:space-y-4 overflow-y-auto pr-1 flex-1">
                  {/* Información de la reserva */}
                  <div className="space-y-2 text-sm text-muted-foreground border-b pb-3">
                    <p>Cliente: {booking.profiles?.first_name} {booking.profiles?.last_name}</p>
                    <p>Fecha: {format(new Date(booking.booking_datetime), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                    <p>Servicio: {booking.services?.name || 'Sin servicio'}</p>
                    <p>Precio: {(booking.total_price_cents / 100).toFixed(2)}€</p>
                  </div>

                  {/* Estado de la cita */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Estado de la Cita</Label>
                    <select
                      value={bookingStatus}
                      onChange={(e) => updateBookingStatus(e.target.value)}
                      className={baseSelectClass}
                    >
                      {BOOKING_STATUSES.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Estado del pago */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Estado del Pago</Label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => updatePaymentStatus(e.target.value)}
                      className={baseSelectClass}
                      disabled={isProcessingPayment}
                    >
                      {PAYMENT_STATUSES.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Códigos de la reserva */}
                  <div className="space-y-3 border-t pt-3">
                    <Label className="text-sm font-medium flex items-center gap-1">
                      <Tag className="h-4 w-4" />
                      Códigos de la Reserva
                    </Label>
                    
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {codes.map((code) => (
                          <Badge
                            key={code.id}
                            variant={selectedBookingCodes.includes(code.code) ? "default" : "outline"}
                            className="cursor-pointer text-xs"
                            style={{
                              backgroundColor: selectedBookingCodes.includes(code.code) ? code.color : 'transparent',
                              borderColor: code.color,
                              color: selectedBookingCodes.includes(code.code) ? 'white' : code.color
                            }}
                            onClick={() => toggleBookingCode(code.code)}
                          >
                            {code.code} - {code.name}
                          </Badge>
                        ))}
                      </div>
                      
                      {clientCodes.length > 0 && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Códigos del cliente:</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {clientCodes.map((assignment) => (
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
                  </div>

                  {/* Cobro rápido con tarjeta guardada + Procesar pago */}
                  {paymentStatus === 'pending' && (
                    <div className="space-y-3 border-t pt-3">
                      {/* Botón de cobro con tarjeta guardada (Stripe) */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Cobrar ahora</Label>
                        <Button
                          onClick={chargeSavedCard}
                          disabled={isProcessingPayment}
                          className="w-full"
                          size="sm"
                        >
                          {isProcessingPayment ? 'Cobrando…' : `Cobrar tarjeta guardada (${(booking.total_price_cents / 100).toFixed(2)}€)`}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Cobra a la tarjeta guardada del cliente mediante Stripe. Si no hay tarjeta guardada o falla, verás un error.
                        </p>
                      </div>

                      {/* Alternativa: registrar pago manual */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Registrar pago manual</Label>
                        <div>
                          <Label className="text-sm">Método de Pago</Label>
                          <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className={baseSelectClass}
                          >
                            <option value="" disabled hidden>
                              Seleccionar método...
                            </option>
                            {PAYMENT_METHODS.map((method) => (
                              <option key={method.value} value={method.value}>
                                {method.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <Label className="text-sm">Notas del Pago (Opcional)</Label>
                          <Textarea
                            placeholder="Notas adicionales..."
                            value={paymentNotes}
                            onChange={(e) => setPaymentNotes(e.target.value)}
                            className="min-h-[60px] resize-none"
                          />
                        </div>

                        <Button
                          onClick={processPayment}
                          disabled={isProcessingPayment || !paymentMethod}
                          className="w-full"
                          size="sm"
                        >
                          {isProcessingPayment ? "Procesando..." : `Marcar como pagado (${(booking.total_price_cents / 100).toFixed(2)}€)`}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
        </AppModal>
      </div>
     </MobileCard>
  );
}
