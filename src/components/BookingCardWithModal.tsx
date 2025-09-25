import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import MobileCard from "@/components/MobileCard";
import { useIsMobile } from "@/hooks/use-mobile";

interface Booking {
  id: string;
  booking_datetime: string;
  duration_minutes: number;
  total_price_cents: number;
  status: string;
  payment_status: string;
  notes?: string;
  services?: { name: string };
  centers?: { name: string };
  profiles?: { first_name: string; last_name: string; email: string; phone: string };
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
  const { toast } = useToast();
  const isMobile = useIsMobile();

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
      const { error } = await supabase
        .from('bookings')
        .update({ payment_status: status as any })
        .eq('id', booking.id);

      if (error) throw error;

      toast({
        title: "Pago actualizado",
        description: "El estado del pago ha sido actualizado"
      });

      setPaymentStatus(status);
      onBookingUpdated();
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del pago",
        variant: "destructive"
      });
    }
  };

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

  return (
    <MobileCard className="booking-card" padding="sm">
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
            <div className="flex gap-1 sm:gap-2">
              {getStatusBadge(bookingStatus)}
              {getPaymentBadge(paymentStatus)}
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
        </div>

        {/* Actions */}
        <div className="pt-3 sm:pt-4 border-t">
          <Button
            className="w-full sm:w-auto"
            variant="outline"
            onClick={() => {
              console.log('Opening modal for booking:', booking.id);
              setIsOpen(true);
            }}
          >
            Modificar Reserva
          </Button>
        </div>

        {/* Custom Portal Modal */}
        {isOpen && createPortal(
          <div 
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-4"
            onClick={() => setIsOpen(false)}
          >
            <div 
              className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-background rounded-lg border shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold">Modificar Reserva</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="sr-only">Close</span>
                </button>
              </div>
              
              {/* Content */}
              <div className="p-6 space-y-4">
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
                  <Select value={bookingStatus} onValueChange={updateBookingStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BOOKING_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Estado del pago */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Estado del Pago</Label>
                  <Select value={paymentStatus} onValueChange={updatePaymentStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Procesar pago */}
                {paymentStatus === 'pending' && (
                  <div className="space-y-3 border-t pt-3">
                    <Label className="text-sm font-medium">Procesar Pago</Label>
                    
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm">Método de Pago</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar método..." />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_METHODS.map((method) => (
                              <SelectItem key={method.value} value={method.value}>
                                {method.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        {isProcessingPayment ? "Procesando..." : `Procesar Pago (${(booking.total_price_cents / 100).toFixed(2)}€)`}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </MobileCard>
  );
}