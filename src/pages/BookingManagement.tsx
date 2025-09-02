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
  { value: 'efectivo', label: '💵 Efectivo', icon: '💵' },
  { value: 'tarjeta', label: '💳 Tarjeta', icon: '💳' },
  { value: 'bizum', label: '📱 Bizum', icon: '📱' },
  { value: 'paypal', label: '🟦 PayPal', icon: '🟦' },
  { value: 'apple_pay', label: '🍎 Apple Pay', icon: '🍎' },
];

export default function BookingManagement() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const { toast } = useToast();

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

  const processPayment = async () => {
    if (!selectedBooking || !paymentMethod) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          payment_status: 'paid',
          payment_method: paymentMethod,
          payment_notes: `Cobrado por ${paymentMethod} el ${new Date().toLocaleString()}`
        })
        .eq('id', selectedBooking.id);

      if (error) throw error;

      // Analytics tracking - enviar datos del pago a analytics
      try {
        const analyticsData = {
          event_type: 'payment_processed',
          booking_id: selectedBooking.id,
          payment_method: paymentMethod,
          amount_cents: selectedBooking.total_price_cents,
          client_id: selectedBooking.profiles?.email,
          service_name: selectedBooking.services?.name,
          center_name: selectedBooking.centers?.name,
          processed_at: new Date().toISOString(),
          processed_by: 'staff' // Aquí se podría poner el ID del staff que procesó el pago
        };

        // Insertar en tabla de analytics/métricas
        await supabase.from('business_metrics').insert({
          metric_name: 'payment_processed',
          metric_type: 'revenue',
          metric_value: selectedBooking.total_price_cents / 100,
          period_start: new Date().toISOString().split('T')[0],
          period_end: new Date().toISOString().split('T')[0],
          metadata: analyticsData
        });

        console.log('Analytics data sent:', analyticsData);
      } catch (analyticsError) {
        console.error('Error sending analytics data:', analyticsError);
        // No bloquear el proceso de pago si analytics falla
      }

      toast({
        title: "💰 Pago procesado exitosamente",
        description: `Cita cobrada por ${PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label} - ${(selectedBooking.total_price_cents / 100).toFixed(2)}€`
      });

      setShowPaymentDialog(false);
      setPaymentMethod('');
      setSelectedBooking(null);
      fetchBookings();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar el pago",
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
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Gestión de Citas - The Nook Madrid
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid gap-6">
            {bookings.map((booking) => (
              <Card key={booking.id} className="shadow-md">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Cita - {format(new Date(booking.booking_datetime), 'dd/MM/yyyy', { locale: es })}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(new Date(booking.booking_datetime), 'HH:mm', { locale: es })} 
                          ({booking.duration_minutes} min)
                        </div>
                        {booking.profiles && (
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {booking.profiles.first_name} {booking.profiles.last_name}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="text-xl font-bold text-primary">
                        {(booking.total_price_cents / 100).toFixed(2)}€
                      </div>
                      <div className="flex gap-2">
                        {getStatusBadge(booking.status)}
                        {getPaymentBadge(booking.payment_status)}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Servicio</Label>
                      <p className="font-medium">{booking.services?.name || 'Sin servicio'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Centro</Label>
                      <p className="font-medium">{booking.centers?.name || 'Sin centro'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Cliente</Label>
                      <p className="font-medium">{booking.profiles?.email || 'Sin email'}</p>
                      {booking.profiles?.phone && (
                        <p className="text-sm text-muted-foreground">{booking.profiles.phone}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Notas</Label>
                      <p className="text-sm">{booking.notes || 'Sin notas'}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Estado:</Label>
                      <Select 
                        value={booking.status} 
                        onValueChange={(value) => updateBookingStatus(booking.id, value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-50 bg-background">
                          {BOOKING_STATUSES.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Pago:</Label>
                      <Select 
                        value={booking.payment_status} 
                        onValueChange={(value) => updatePaymentStatus(booking.id, value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-50 bg-background">
                          {PAYMENT_STATUSES.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={() => {
                        console.log('Cobrar Cita clicked - booking:', booking);
                        setSelectedBooking(booking);
                        setShowPaymentDialog(true);
                        console.log('Payment dialog should be showing:', true);
                      }}
                      className="flex items-center gap-2"
                      variant="outline"
                    >
                      <CreditCard className="h-4 w-4" />
                      Cobrar Cita
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md bg-background border shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              💰 Cobrar Cita
            </DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Detalles de la cita</h4>
                <p className="text-sm text-muted-foreground">
                  Cliente: {selectedBooking.profiles?.first_name} {selectedBooking.profiles?.last_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Servicio: {selectedBooking.services?.name}
                </p>
                <p className="text-sm text-muted-foreground font-bold text-primary">
                  💶 Importe: {(selectedBooking.total_price_cents / 100).toFixed(2)}€
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-method" className="text-sm font-medium">💳 Forma de Pago</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-12 bg-background border-2 border-primary/20 focus:border-primary">
                    <SelectValue placeholder="💰 Seleccionar forma de pago..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-2 shadow-xl">
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value} className="py-3 hover:bg-accent cursor-pointer">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{method.icon}</span>
                          <span className="font-medium">{method.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={processPayment}
                  disabled={!paymentMethod}
                  className="flex-1 h-12 text-lg bg-green-600 hover:bg-green-700 text-white font-bold"
                  size="lg"
                >
                  <CreditCard className="h-5 w-5 mr-2" />
                  ✅ Confirmar Pago - {selectedBooking && (selectedBooking.total_price_cents / 100).toFixed(2)}€
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPaymentDialog(false);
                    setPaymentMethod('');
                    setSelectedBooking(null);
                  }}
                  className="h-12 px-6 border-2"
                  size="lg"
                >
                  ❌ Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}