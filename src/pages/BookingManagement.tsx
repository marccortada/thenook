import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, User, CreditCard, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import MobileResponsiveLayout from "@/components/MobileResponsiveLayout";
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

export default function BookingManagement() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    document.title = "Gestión de Citas | The Nook Madrid";
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          services (name),
          centers (name),
          profiles (first_name, last_name, email, phone)
        `)
        .order('booking_datetime', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las citas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: status as any })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: "El estado de la cita ha sido actualizado"
      });

      fetchBookings();
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive"
      });
    }
  };

  const updatePaymentStatus = async (bookingId: string, paymentStatus: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ payment_status: paymentStatus as any })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Pago actualizado",
        description: "El estado del pago ha sido actualizado"
      });

      fetchBookings();
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del pago",
        variant: "destructive"
      });
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground">Cargando citas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <MobileResponsiveLayout padding="md">
          <h1 className={`font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent ${
            isMobile ? 'text-lg' : 'text-2xl'
          }`}>
            Gestión de Citas - The Nook Madrid
          </h1>
        </MobileResponsiveLayout>
      </header>

      <main className="py-4 sm:py-8">
        <MobileResponsiveLayout maxWidth="7xl" padding="md">
          <div className="space-y-4 sm:space-y-6">
            {bookings.map((booking) => (
              <MobileCard key={booking.id} className="booking-card" padding="sm">
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
                        {getStatusBadge(booking.status)}
                        {getPaymentBadge(booking.payment_status)}
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
                  <div className={`pt-3 sm:pt-4 border-t space-y-3 ${
                    isMobile ? '' : 'flex flex-wrap gap-3 space-y-0'
                  }`}>
                    <div className={`${isMobile ? 'grid grid-cols-1 gap-3' : 'flex items-center gap-3'}`}>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs sm:text-sm whitespace-nowrap">Estado:</Label>
                        <Select 
                          value={booking.status} 
                          onValueChange={(value) => updateBookingStatus(booking.id, value)}
                        >
                          <SelectTrigger className={`${isMobile ? 'flex-1' : 'w-32 sm:w-40'}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent 
                            position="popper" 
                            side="bottom" 
                            align="start"
                            sideOffset={4}
                            className="z-[60] max-h-[300px] min-w-[var(--radix-select-trigger-width)]"
                          >
                            {BOOKING_STATUSES.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2">
                        <Label className="text-xs sm:text-sm whitespace-nowrap">Pago:</Label>
                        <Select 
                          value={booking.payment_status} 
                          onValueChange={(value) => updatePaymentStatus(booking.id, value)}
                        >
                          <SelectTrigger className={`${isMobile ? 'flex-1' : 'w-32 sm:w-40'}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent 
                            position="popper" 
                            side="bottom" 
                            align="start"
                            sideOffset={4}
                            className="z-[60] max-h-[300px] min-w-[var(--radix-select-trigger-width)]"
                          >
                            {PAYMENT_STATUSES.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className={isMobile ? 'pt-2' : ''}>
                      <PaymentModal 
                        booking={booking} 
                        onPaymentProcessed={fetchBookings} 
                      />
                    </div>
                  </div>
                </div>
              </MobileCard>
            ))}
          </div>
        </MobileResponsiveLayout>
      </main>
    </div>
  );
}

// Componente individual para cada modal de pago
interface PaymentModalProps {
  booking: Booking;
  onPaymentProcessed: () => void;
}

function PaymentModal({ booking, onPaymentProcessed }: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleOpenModal = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Obtener la tarjeta completa (parent del botón)
    const cardElement = event.currentTarget.closest('.booking-card') as HTMLElement;
    if (!cardElement) return;
    
    const cardRect = cardElement.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    
    // Dimensiones del modal
    const modalWidth = Math.min(450, windowWidth - 40);
    const modalHeight = Math.min(550, windowHeight - 80);
    
    // Calcular posición
    let top = cardRect.top + scrollTop - 50; // Un poco arriba de la tarjeta
    let left = (windowWidth - modalWidth) / 2; // Centrado horizontalmente
    
    // Ajustar verticalmente para que esté siempre visible
    const viewportTop = scrollTop + 20;
    const viewportBottom = scrollTop + windowHeight - 20;
    
    if (top < viewportTop) {
      top = viewportTop;
    } else if (top + modalHeight > viewportBottom) {
      top = viewportBottom - modalHeight;
    }
    
    // Asegurar que no se salga horizontalmente
    if (left < 20) left = 20;
    if (left + modalWidth > windowWidth - 20) left = windowWidth - modalWidth - 20;
    
    console.log('Modal position:', { top, left, cardTop: cardRect.top, scrollTop });
    
    setModalPosition({ top, left });
    setIsOpen(true);
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

      setIsOpen(false);
      setPaymentMethod('');
      setPaymentNotes('');
      onPaymentProcessed();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar el pago",
        variant: "destructive"
      });
    }
  };

  const closeModal = () => {
    setIsOpen(false);
    setPaymentMethod('');
    setPaymentNotes('');
  };

  return (
    <>
      <Button
        onClick={handleOpenModal}
        className="flex items-center gap-2"
        variant="outline"
      >
        <CreditCard className="h-4 w-4" />
        Cobrar Cita
      </Button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={closeModal}
          />
          
          {/* Modal */}
          <div 
            className="fixed z-50 bg-white rounded-lg shadow-2xl border"
            style={{
              top: `${modalPosition.top}px`,
              left: `${modalPosition.left}px`,
              width: `${isMobile ? Math.min(350, window.innerWidth - 20) : Math.min(450, window.innerWidth - 40)}px`,
              maxHeight: `${isMobile ? window.innerHeight - 40 : Math.min(550, window.innerHeight - 80)}px`,
              overflowY: 'auto'
            }}
          >
            <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
              {/* Header */}
              <div className={`flex items-center justify-between ${isMobile ? 'mb-4' : 'mb-6'}`}>
                <div className="flex items-center gap-2 sm:gap-3">
                  <DollarSign className={`text-green-600 ${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
                  <h3 className={`font-semibold ${isMobile ? 'text-lg' : 'text-xl'}`}>Cobrar Cita</h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeModal}
                  className="h-8 w-8 p-0"
                >
                  ✕
                </Button>
              </div>
              
              {/* Content */}
              <div className="space-y-3 sm:space-y-4">
                {/* Detalles */}
                <div className={`bg-gray-50 rounded-lg ${isMobile ? 'p-3' : 'p-4'}`}>
                  <h4 className={`font-semibold ${isMobile ? 'mb-2 text-sm' : 'mb-3'}`}>Detalles de la cita</h4>
                  <div className={`gap-3 text-sm ${
                    isMobile ? 'grid grid-cols-1 space-y-2' : 'grid grid-cols-2'
                  }`}>
                    <div>
                      <p className="text-gray-500 text-xs">Cliente</p>
                      <p className="font-medium truncate">
                        {booking.profiles?.first_name} {booking.profiles?.last_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Servicio</p>
                      <p className="font-medium truncate">{booking.services?.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Centro</p>
                      <p className="font-medium truncate">{booking.centers?.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Importe</p>
                      <p className={`font-bold text-green-600 ${isMobile ? 'text-base' : 'text-lg'}`}>
                        {(booking.total_price_cents / 100).toFixed(2)}€
                      </p>
                    </div>
                  </div>
                </div>

                {/* Forma de pago */}
                <div className="relative">
                  <Label className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Forma de Pago</Label>
                  <Button
                    variant="outline"
                    className="w-full mt-1 justify-between"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
                      
                      setDropdownPosition({
                        top: rect.bottom + scrollTop + 4,
                        left: rect.left + scrollLeft,
                        width: rect.width
                      });
                      setIsDropdownOpen(!isDropdownOpen);
                    }}
                  >
                    <span>{paymentMethod ? PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label : "Seleccionar forma de pago..."}</span>
                    <span className="ml-2">▼</span>
                  </Button>
                  
                  {/* Dropdown personalizado */}
                  {isDropdownOpen && (
                    <>
                      {/* Overlay para cerrar */}
                      <div 
                        className="fixed inset-0 z-[99]"
                        onClick={() => setIsDropdownOpen(false)}
                      />
                      {/* Dropdown */}
                      <div
                        className="fixed z-[100] bg-background border rounded-md shadow-lg"
                        style={{
                          top: `${dropdownPosition.top}px`,
                          left: `${dropdownPosition.left}px`,
                          width: `${dropdownPosition.width}px`
                        }}
                      >
                        {PAYMENT_METHODS.map((method) => (
                          <button
                            key={method.value}
                            className="w-full text-left px-3 py-2 hover:bg-accent first:rounded-t-md last:rounded-b-md transition-colors"
                            onClick={() => {
                              setPaymentMethod(method.value);
                              setIsDropdownOpen(false);
                            }}
                          >
                            {method.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Notas */}
                <div>
                  <Label className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Notas del pago (opcional)</Label>
                  <Input
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Notas adicionales..."
                    className="mt-1"
                  />
                </div>

                {/* Botones */}
                <div className={`flex gap-2 sm:gap-3 ${isMobile ? 'pt-3' : 'pt-4'}`}>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={closeModal}
                    size={isMobile ? "sm" : "default"}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={processPayment}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={!paymentMethod}
                    size={isMobile ? "sm" : "default"}
                  >
                    <DollarSign className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
                    <span className={isMobile ? 'text-xs' : ''}>
                      Confirmar - {(booking.total_price_cents / 100).toFixed(2)}€
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}