import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { chargeBooking } from "@/lib/payments";
import { Calendar, Clock, User, X, Tag, Bot } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import MobileCard from "@/components/MobileCard";
import { useIsMobile } from "@/hooks/use-mobile";
import AppModal from "@/components/ui/app-modal";
import { useInternalCodes } from "@/hooks/useInternalCodes";
import MessageGeneratorModal from "@/components/MessageGeneratorModal";
import { useTranslation, translateServiceName } from "@/hooks/useTranslation";
import { getFriendlyCenterName } from "@/lib/utils";

interface Booking {
  id: string;
  booking_datetime: string;
  duration_minutes: number;
  total_price_cents: number;
  status: string;
  payment_status: string;
  reserva_id?: string | null;
  payment_method?: string;
  payment_notes?: string;
  notes?: string;
  booking_codes?: string[];
  center_id?: string;
  services?: { name: string };
  centers?: { 
    name: string;
    address?: string | null;
    address_zurbaran?: string | null;
    address_concha_espina?: string | null;
  };
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

const STATUS_BORDER_CLASSES: Record<string, string> = {
  requested: 'border-yellow-300',
  confirmed: 'border-blue-300',
  new: 'border-green-300',
  online: 'border-purple-300',
  cancelled: 'border-red-300',
  no_show: 'border-gray-300',
  pending: 'border-amber-300',
  completed: 'border-emerald-300',
};

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
  const [showChargeOptions, setShowChargeOptions] = useState(false);
  const [generatedCheckoutUrl, setGeneratedCheckoutUrl] = useState<string | null>(null);
  const [captureAmountInput, setCaptureAmountInput] = useState<string>(
    booking?.total_price_cents ? (booking.total_price_cents / 100).toFixed(2) : ''
  );
  const [selectedBookingCodes, setSelectedBookingCodes] = useState<string[]>(booking.booking_codes || []);
  const [showMessages, setShowMessages] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionText, setSuggestionText] = useState<string | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const { toast } = useToast();
  const { language, t } = useTranslation();
  const isMobile = useIsMobile();

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
    return Math.max(0, booking.total_price_cents || 0);
  };

  const formatTimeRange = (start: Date, durationMinutes: number) => {
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + durationMinutes);
    const fmt = (d: Date) => d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return `${fmt(start)} - ${fmt(end)}`;
  };

  const suggestAlternateSlots = async () => {
    if (!booking.center_id) {
      setSuggestionError("La reserva no tiene centro asignado.");
      return;
    }
    setSuggestionLoading(true);
    setSuggestionError(null);
    setSuggestionText(null);

    try {
      const targetDate = new Date(booking.booking_datetime);
      const serviceDuration = booking.duration_minutes || 60;
      const bufferMinutes = 15;
      const dayStart = new Date(targetDate);
      dayStart.setHours(9, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(21, 59, 59, 999);

      let query = supabase
        .from('bookings')
        .select('id, booking_datetime, duration_minutes, lane_id, status')
        .eq('center_id', booking.center_id)
        .gte('booking_datetime', dayStart.toISOString())
        .lt('booking_datetime', dayEnd.toISOString())
        .neq('status', 'cancelled');

      const { data: dayBookings, error } = await query;
      if (error) throw error;

      const relevantBookings = (dayBookings || [])
        .filter(b => !booking.lane_id || b.lane_id === booking.lane_id)
        .map((b) => ({
          start: new Date(b.booking_datetime),
          duration: b.duration_minutes || serviceDuration,
        }))
        .sort((a, b) => a.start.getTime() - b.start.getTime());

      const blockedRanges = relevantBookings.map(({ start, duration }) => {
        const paddedStart = new Date(start);
        paddedStart.setMinutes(paddedStart.getMinutes() - bufferMinutes);
        const paddedEnd = new Date(start);
        paddedEnd.setMinutes(paddedEnd.getMinutes() + duration + bufferMinutes);
        return { start: paddedStart, end: paddedEnd };
      });

      const merged: Array<{ start: Date; end: Date }> = [];
      blockedRanges.forEach((range) => {
        if (!merged.length) {
          merged.push(range);
        } else {
          const last = merged[merged.length - 1];
          if (range.start <= last.end) {
            if (range.end > last.end) last.end = range.end;
          } else {
            merged.push(range);
          }
        }
      });

      const candidateRanges: Array<{ start: Date; end: Date }> = [];
      let pointer = dayStart;
      merged.forEach((range) => {
        if (range.start > pointer) {
          candidateRanges.push({ start: new Date(pointer), end: new Date(range.start) });
        }
        if (range.end > pointer) pointer = new Date(range.end);
      });
      if (pointer < dayEnd) {
        candidateRanges.push({ start: new Date(pointer), end: dayEnd });
      }

      const minGapMs = (serviceDuration + bufferMinutes * 2) * 60 * 1000;
      const validStarts: Date[] = [];
      candidateRanges.forEach(({ start, end }) => {
        if (end.getTime() - start.getTime() < minGapMs) return;
        const slotStart = new Date(start);
        slotStart.setMinutes(Math.ceil(slotStart.getMinutes() / 5) * 5);
        if (slotStart.getTime() + minGapMs <= end.getTime()) {
          validStarts.push(slotStart);
        }
      });

      if (!validStarts.length) {
        setSuggestionText("No hay huecos cómodos ese día. Revisa otra fecha u otra cabina.");
        return;
      }

      const topSuggestions = validStarts.slice(0, 3);
      const humanList = topSuggestions
        .map((date, idx) => `Opción ${idx + 1}: ${formatTimeRange(date, serviceDuration)}${booking.lane_id ? ' (misma cabina)' : ''}`)
        .join('\n');

      const prompt = `Resumen de opciones para reubicar una cita de ${serviceDuration} minutos el ${
        targetDate.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long' })
      }:\n${humanList}\nReescribe este texto en tono cordial para un administrador, en español.`;

      try {
        const { data: aiData, error: aiError } = await (supabase as any).functions.invoke('rewrite-message', {
          body: { text: prompt, tone: 'profesional', language: 'es' }
        });
        if (aiError || !aiData?.result) {
          setSuggestionText(humanList);
        } else {
          setSuggestionText(aiData.result as string);
        }
      } catch {
        setSuggestionText(humanList);
      }
    } catch (error: any) {
      console.error('Error generating suggestions:', error);
      setSuggestionError(error?.message || 'No se pudieron generar sugerencias');
    } finally {
      setSuggestionLoading(false);
    }
  };

  const totalPriceCents = booking.total_price_cents || 0;
  const penaltyPercentage = (() => {
    if (!totalPriceCents) return 0;
    const currentAmount = getDesiredChargeAmountCents();
    return Math.round((currentAmount / totalPriceCents) * 100);
  })();

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

  const getStatusBorderClass = (status: string) => STATUS_BORDER_CLASSES[status] || 'border-border';

  const getPaymentBadge = (paymentStatus: string) => {
    const statusConfig = PAYMENT_STATUSES.find(s => s.value === paymentStatus) || PAYMENT_STATUSES[0];
    return (
      <Badge className={statusConfig.color}>
        {statusConfig.label}
      </Badge>
    );
  };

  const getReservaStatusBadge = () => {
    const estado = (booking as any).reserva?.estado_reserva as string | undefined;
    if (!estado) return null;
    const map: Record<string, { label: string; className: string }> = {
      'retenido': { label: 'Retenido', className: 'bg-amber-100 text-amber-800' },
      'capturado_total': { label: 'Cobrado', className: 'bg-green-100 text-green-800' },
      'capturado_parcial': { label: 'Cobro parcial', className: 'bg-blue-100 text-blue-800' },
      'cancelado': { label: 'Cancelado', className: 'bg-red-100 text-red-800' },
    };
    const conf = map[estado] || { label: estado, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={conf.className}>{conf.label}</Badge>;
  };

  const updateBookingStatus = async (status: string) => {
    try {
      // Si marcamos como completada y aún no está pagada, intenta cobrar primero
      if (status === 'completed' && paymentStatus !== 'paid') {
        try {
          setIsProcessingPayment(true);
          const desiredAmountCents = getDesiredChargeAmountCents();
          // Skip email if this is a no_show booking
          const skipEmail = bookingStatus === 'no_show';
          const { data, error } = await (supabase as any).functions.invoke('charge-booking', {
            body: { 
              booking_id: booking.id, 
              amount_cents: desiredAmountCents,
              skip_email: skipEmail
            }
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
        const desiredAmountCents = getDesiredChargeAmountCents();
        if (booking.reserva_id) {
          const { data, error } = await (supabase as any).functions.invoke('capture-payment', {
            body: { reserva_id: booking.reserva_id, amount_to_capture: desiredAmountCents }
          });
          if (error || !data?.ok) {
            const reason = (error as any)?.message || data?.error || '';
            if (data?.requires_action) {
              await sendPaymentLinkFallback(reason || 'Se requiere autenticación adicional (SCA).');
            } else {
              toast({ title: 'Cobro no realizado', description: reason || 'No se pudo procesar el cobro.', variant: 'destructive' });
            }
            return;
          }
        } else {
          // Skip email if this is a no_show booking
          const skipEmail = bookingStatus === 'no_show';
          const { data, error } = await (supabase as any).functions.invoke('charge-booking', {
            body: { 
              booking_id: booking.id, 
              amount_cents: desiredAmountCents,
              skip_email: skipEmail
            }
          });
          if (error || !data?.ok) {
            const reason = (error as any)?.message || data?.error || '';
            if (data?.requires_action) {
              await sendPaymentLinkFallback(reason || 'Se requiere autenticación adicional (SCA).');
            } else {
              toast({ title: 'Cobro no realizado', description: reason || 'No se pudo procesar el cobro.', variant: 'destructive' });
            }
            return;
          }
        }
      }

      // Si no es 'paid', actualizar solo el estado de pago
      if (status !== 'paid') {
        const { error: updErr } = await supabase
          .from('bookings')
          .update({ 
            payment_status: status as any,
            payment_method: null,
            payment_notes: null
          } as any)
          .eq('id', booking.id);

        if (updErr) throw updErr;
      }

      if (status === 'paid') {
        // CRITICAL: Cuando se marca como pagado, actualizar el estado de reserva automáticamente
        // Si es no_show, mantener no_show. Si no, cambiar a confirmed (nunca dejar como pending)
        const statusUpdate: any = {
          payment_status: status as any,
          payment_method: status === 'paid' ? 'tarjeta' : null,
          payment_notes: status === 'paid' ? `Cobro automático Stripe` : null
        };
        
        if (bookingStatus === 'no_show') {
          // Para no_show, mantener el status como no_show
          statusUpdate.status = 'no_show';
        } else {
          // Si estaba pendiente o cualquier otro estado, cambiar a confirmed cuando se marca como pagado
          statusUpdate.status = bookingStatus === 'pending' ? 'confirmed' : bookingStatus;
        }
        
        // Actualizar ambos estados en una sola operación
        const { error: statusErr } = await supabase
          .from('bookings')
          .update(statusUpdate)
          .eq('id', booking.id);
        
        if (statusErr) throw statusErr;
        
        // Actualizar estado local
        if (bookingStatus === 'no_show') {
          setBookingStatus('no_show');
        } else {
          setBookingStatus(statusUpdate.status);
        }
        
        // Enviar email de confirmación (solo si no es no_show)
        if (bookingStatus !== 'no_show') {
          try { 
            await (supabase as any).functions.invoke('send-booking-with-payment', { body: { booking_id: booking.id } }); 
          } catch (e) { 
            console.warn('send-booking-with-payment fallo (updatePaymentStatus):', e); 
          }
        }
      }

      toast({
        title: "Pago actualizado",
        description: status === 'paid' ? 'Se ha cobrado la reserva correctamente' : 'El estado del pago ha sido actualizado'
      });

      setPaymentStatus(status);
      onBookingUpdated();
    } catch (error) {
      console.error('Error updating booking payment:', error);
      // Fallback a link de pago si falló el cobro
      await sendPaymentLinkFallback((error as any)?.message);
      return;
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

  // Registrar pago (tarjeta directa o métodos manuales)
  const processPayment = async () => {
    if (!paymentMethod) {
      toast({
        title: "Error",
        description: "Selecciona una forma de pago",
        variant: "destructive"
      });
      return;
    }

    if (paymentStatus === 'paid') {
      toast({ title: 'Pago ya registrado', description: 'Esta reserva ya está pagada.' });
      return;
    }

    setIsProcessingPayment(true);
    try {
      if (paymentMethod === 'tarjeta') {
        const { data: authData } = await (supabase as any).auth.getUser();
        if (!authData?.user) {
          toast({ title: 'Inicia sesión', description: 'Debes iniciar sesión para cobrar.', variant: 'destructive' });
          return;
        }
        const desiredAmountCents = getDesiredChargeAmountCents();
        const res = await chargeBooking(booking.id, desiredAmountCents);
        if (!res.ok) {
          if (res.requires_action) {
            toast({ title: 'Se requiere autenticación', description: 'La tarjeta requiere una acción adicional (SCA).', variant: 'destructive' });
          } else {
            toast({ title: 'Cobro no realizado', description: res.error || 'No se pudo procesar el cobro.', variant: 'destructive' });
          }
          return;
        }
        setPaymentStatus('paid');
        setBookingStatus('confirmed');
        toast({ title: 'Cobro realizado correctamente' });
        setPaymentMethod('');
        setPaymentNotes('');
        setIsOpen(false);
        onBookingUpdated();
      } else {
        const { error } = await supabase
          .from('bookings')
          .update({ 
            payment_status: 'paid',
            payment_method: paymentMethod,
            payment_notes: paymentNotes || `Cobrado por ${paymentMethod} el ${new Date().toLocaleString()}`
          })
          .eq('id', booking.id);

        if (error) throw error;

        try { await supabase.from('bookings').update({ status: 'confirmed' as any }).eq('id', booking.id); } catch {}
        setPaymentStatus('paid');
        setBookingStatus('confirmed');
        toast({ title: 'Registrado pago en efectivo' });
        setPaymentMethod('');
        setPaymentNotes('');
        setIsOpen(false);
        onBookingUpdated();
      }
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
  const chargeSavedCard = async (overrideAmountCents?: number) => {
    try {
      setIsProcessingPayment(true);
      if (paymentStatus === 'paid') {
        toast({ title: 'Pago ya registrado', description: 'Esta reserva ya está pagada.' });
        return;
      }
      const { data: authData } = await (supabase as any).auth.getUser();
      if (!authData?.user) {
        toast({ title: 'Inicia sesión', description: 'Debes iniciar sesión para cobrar.', variant: 'destructive' });
        return;
      }
      const desiredAmountCents = getDesiredChargeAmountCents(overrideAmountCents);
      // Skip email if this is a no_show booking
      const skipEmail = bookingStatus === 'no_show';
      const res = await chargeBooking(booking.id, desiredAmountCents, skipEmail);
      if (!res.ok) {
        if (res.requires_action) {
          toast({ title: 'Se requiere autenticación', description: 'La tarjeta requiere una acción adicional (SCA).', variant: 'destructive' });
        } else {
          toast({ title: 'Cobro no realizado', description: res.error || 'No se pudo procesar el cobro', variant: 'destructive' });
        }
        return;
      }
      setPaymentStatus('paid');
      setBookingStatus('confirmed');
      toast({ title: 'Cobro realizado correctamente' });
      onBookingUpdated();
    } catch (e) {
      // Si la invocación devolvió non-2xx (excepción), generar link como fallback
      await sendPaymentLinkFallback((e as any)?.message);
      return;
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Crear link de pago (Checkout) y devolver URL
  const createPaymentLink = async (): Promise<string> => {
    const minCents = Math.max(50, booking.total_price_cents || 0);
    const { data, error } = await (supabase as any).functions.invoke('create-checkout', {
      body: { intent: 'booking_payment', booking_payment: { booking_id: booking.id, amount_cents: minCents }, currency: 'eur' }
    });
    const checkoutUrl: string | null = data?.url || (data?.client_secret ? `https://checkout.stripe.com/c/pay/${data.client_secret}` : null);
    if (error || !checkoutUrl) throw new Error(error?.message || 'No se pudo generar el link de pago');
    return checkoutUrl;
  };

  const normalizePhone = (phone?: string) => (phone || '').replace(/[^0-9+]/g, '').replace(/^\+/, '');

  const openWhatsAppWithLink = async () => {
    try {
      setIsProcessingPayment(true);
      // First try to send SMS directly via edge function
      const minCents = Math.max(50, booking.total_price_cents || 0);
      const { data, error } = await (supabase as any).functions.invoke('send-payment-link', {
        body: { booking_id: booking.id, amount_cents: minCents }
      });
      const url: string | null = data?.url || generatedCheckoutUrl || null;
        if (data?.ok && url) {
          setGeneratedCheckoutUrl(url);
          if (data.sms_sent) {
            toast({ title: 'SMS enviado', description: 'El enlace se ha enviado al teléfono del cliente.' });
            return; // SMS delivered; still copy and show WA below for conveniency
          }
        }
      // If SMS not sent (no Twilio), fallback to WhatsApp
      const finalUrl = url || await createPaymentLink();
      setGeneratedCheckoutUrl(finalUrl);
      const msg = `Hola, te enviamos el enlace para pagar tu cita en The Nook Madrid. Importe ${(booking.total_price_cents/100).toFixed(2)}€\n\n${url}`;
      try { await navigator.clipboard.writeText(msg); } catch {}
      const phone = normalizePhone(booking.profiles?.phone);
      const wa = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
      window.open(wa, '_blank');
      toast({ title: 'Link de pago listo', description: data?.sms_sent ? 'SMS enviado. También abrimos WhatsApp y copiamos el mensaje.' : 'Abriendo WhatsApp y copiado al portapapeles' });
    } catch (e) {
      toast({ title: 'Error', description: (e as any).message || 'No se pudo generar el link', variant: 'destructive' });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const markCashPaid = async () => {
    try {
      setIsProcessingPayment(true);
      
      // CRITICAL: Cuando se marca como pagado, actualizar el estado de reserva automáticamente
      // Si es no_show, mantener no_show. Si no, cambiar a confirmed (nunca dejar como pending)
      const updateData: any = {
        payment_status: 'paid',
        payment_method: 'efectivo',
        payment_notes: `Cobrado en efectivo el ${new Date().toLocaleString()}`
      };
      
      if (bookingStatus === 'no_show') {
        // Para no_show, mantener el status como no_show
        updateData.status = 'no_show';
      } else {
        // Si estaba pendiente o cualquier otro estado, cambiar a confirmed cuando se marca como pagado
        updateData.status = bookingStatus === 'pending' ? 'confirmed' : bookingStatus;
      }
      
      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', booking.id);
      if (error) throw error;
      
      setPaymentStatus('paid');
      // Actualizar estado local de reserva
      if (bookingStatus === 'no_show') {
        setBookingStatus('no_show');
      } else {
        setBookingStatus(updateData.status);
      }
      
      toast({ title: 'Pago registrado', description: 'Marcado como cobrado en efectivo' });
      onBookingUpdated();
      setShowChargeOptions(false);
    } catch (e) {
      toast({ title: 'Error', description: (e as any).message || 'No se pudo registrar el pago', variant: 'destructive' });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Fallback: crear sesión de Checkout y enviar link por email
  const sendPaymentLinkFallback = async (_reason?: string) => {
    try {
      const minCents = Math.max(50, booking.total_price_cents || 0);
      const { data, error } = await (supabase as any).functions.invoke('create-checkout', {
        body: { intent: 'booking_payment', booking_payment: { booking_id: booking.id, amount_cents: minCents }, currency: 'eur' }
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
        title: 'Link de pago generado',
        description: `${to ? `Enviado a ${to}. ` : ''}También lo hemos copiado. ${checkoutUrl}`,
      });
    } catch (e) {
      toast({ title: 'Error', description: (e as any).message || 'No se pudo generar el link de pago', variant: 'destructive' });
    }
  };

  return (
    <>
    <MobileCard 
      className={`booking-card border-2 transition-colors ${getStatusBorderClass(bookingStatus)} ${isVipBooking() ? 'ring-2 ring-yellow-400' : isPriorityBooking() ? 'ring-2 ring-orange-400' : ''}`} 
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
            <div className="flex gap-1 sm:gap-2 items-center justify-end flex-wrap">
              {getStatusBadge(bookingStatus)}
              {getPaymentBadge(paymentStatus)}
              {getReservaStatusBadge()}
              {paymentStatus === 'pending' && (
                <Button
                  size="sm"
                  onClick={() => setShowChargeOptions(true)}
                  disabled={isProcessingPayment}
                  className="h-7"
                >
                  {isProcessingPayment ? 'Cobrando…' : 'Cobrar'}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setShowMessages(true)} className="h-7">
                Generar mensaje
              </Button>
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
              {booking.services?.name ? translateServiceName(booking.services.name, language, t) : 'Sin servicio'}
            </p>
          </div>
          <div>
            <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Centro</Label>
            <p className="font-medium text-sm sm:text-base truncate">
              {getFriendlyCenterName(
                booking.centers?.name, 
                booking.centers?.address || booking.centers?.address_zurbaran || booking.centers?.address_concha_espina
              )}
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
                    <p>Servicio: {booking.services?.name ? translateServiceName(booking.services.name, language, t) : 'Sin servicio'}</p>
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

                  <div className="space-y-2 border rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Bot className="h-4 w-4 text-primary" />
                        Sugerencias de reubicación
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={suggestAlternateSlots}
                        disabled={suggestionLoading}
                      >
                        {suggestionLoading ? 'Generando…' : 'Sugerir horarios'}
                      </Button>
                    </div>
                    {suggestionError && (
                      <p className="text-xs text-red-500">{suggestionError}</p>
                    )}
                    {suggestionText && (
                      <div className="bg-muted/40 rounded-md p-2 text-sm whitespace-pre-line">
                        {suggestionText}
                      </div>
                    )}
                    {!suggestionText && !suggestionError && !suggestionLoading && (
                      <p className="text-xs text-muted-foreground">
                        Obtén una recomendación rápida de 2-3 huecos cómodos para mover la cita sin romper la agenda.
                      </p>
                    )}
                  </div>

                  {bookingStatus === 'no_show' && (
                    <div className="space-y-2 border-t pt-3">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Penalización por No Show</Label>
                        <Label className="text-xs text-muted-foreground">
                          Define el importe parcial que deseas cobrar.
                        </Label>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Importe a cobrar (EUR)</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={captureAmountInput}
                          onChange={(e) => setCaptureAmountInput(e.target.value)}
                          placeholder={(booking.total_price_cents / 100).toFixed(2)}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Esto equivale aproximadamente a {penaltyPercentage}% del precio original.
                      </p>
                    </div>
                  )}

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
                        {booking.reserva_id && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Importe a cobrar (€)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={captureAmountInput}
                              onChange={(e) => setCaptureAmountInput(e.target.value)}
                              placeholder={(booking.total_price_cents/100).toFixed(2)}
                            />
                            <p className="text-[11px] text-muted-foreground">Deja vacío para cobrar el total. Mínimo 0,50€.</p>
                          </div>
                        )}
                        <Button
                          onClick={() => {
                            // Si hay reserva retenida, usar captura (parcial o total)
                            if (booking.reserva_id) {
                              const amount = parseFloat(captureAmountInput.replace(',', '.'));
                              const amountCents = isNaN(amount) ? booking.total_price_cents : Math.round(amount * 100);
                              if (amountCents < 50) {
                                toast({ title: 'Importe inválido', description: 'El mínimo es 0,50€', variant: 'destructive' });
                                return;
                              }
                              chargeSavedCard(amountCents);
                            } else {
                              setShowChargeOptions(true);
                            }
                          }}
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
     {/* Modal para elegir método de cobro rápido */}
     <AppModal open={showChargeOptions} onClose={() => setShowChargeOptions(false)}>
       <div className="p-4 space-y-3">
         <h3 className="font-semibold text-lg">Cobrar Cita</h3>
         <p className="text-sm text-muted-foreground">Elige cómo quieres cobrar esta cita.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button onClick={markCashPaid} disabled={isProcessingPayment}>💰 Efectivo</Button>
            <Button onClick={() => chargeSavedCard()} disabled={isProcessingPayment}>💳 Tarjeta (cargo directo)</Button>
          </div>
        </div>
      </AppModal>

      {/* Mensajes inteligentes */}
      <MessageGeneratorModal
        open={showMessages}
        onClose={() => setShowMessages(false)}
        ctx={{
          bookingId: booking.id,
          totalPriceCents: booking.total_price_cents,
          centerId: booking.center_id,
          clientName: `${booking.profiles?.first_name || ''} ${booking.profiles?.last_name || ''}`.trim() || null,
          clientEmail: booking.profiles?.email || null,
          clientPhone: booking.profiles?.phone || null,
          centerName: booking.centers?.name || null,
          centerAddress: (booking as any).centers?.address || (booking as any).centers?.address_zurbaran || (booking as any).centers?.address_concha_espina || null,
          serviceName: booking.services?.name || null,
          bookingDate: new Date(booking.booking_datetime),
        }}
      />
  </>
  );
}
