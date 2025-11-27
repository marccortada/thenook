import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

// Extend Window interface for Stripe
declare global {
  interface Window {
    StripeInstance: any;
  }
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Check, CreditCard, Calendar, Clock, User, MapPin, Shield } from "lucide-react";

interface BookingDetails {
  id: string;
  booking_datetime: string;
  total_price_cents: number;
  duration_minutes: number;
  payment_method_status: string;
  services: { name: string } | null;
  employees: { profiles: { first_name: string; last_name: string } } | null;
  profiles: { first_name: string; last_name: string; email: string } | null;
  centers: { name: string; address: string } | null;
}

export default function BookingPaymentSetup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const setupIntentId = searchParams.get('setup_intent');
  const clientSecret = searchParams.get('client_secret');
  const bookingIdParam = searchParams.get('booking_id');

useEffect(() => {
  if (setupIntentId || bookingIdParam) {
    fetchBookingDetails();
  }
}, [setupIntentId, bookingIdParam]);

const fetchBookingDetails = async () => {
  try {
    if (setupIntentId) {
      const { data: paymentIntent, error: intentError } = await supabase
        .from('booking_payment_intents')
        .select('booking_id')
        .eq('stripe_setup_intent_id', setupIntentId)
        .single();
      if (intentError) throw intentError;
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_datetime,
          total_price_cents,
          duration_minutes,
          payment_method_status,
          services(name, price_cents, has_discount, discount_price_cents),
          employees(profiles(first_name, last_name)),
          profiles(first_name, last_name, email),
          centers(name, address)
        `)
        .eq('id', paymentIntent.booking_id)
        .single();
      if (bookingError) throw bookingError;
      setBooking(bookingData);
    } else if (bookingIdParam) {
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_datetime,
          total_price_cents,
          duration_minutes,
          payment_method_status,
          services(name, price_cents, has_discount, discount_price_cents),
          employees(profiles(first_name, last_name)),
          profiles(first_name, last_name, email),
          centers(name, address)
        `)
        .eq('id', bookingIdParam)
        .single();
      if (bookingError) throw bookingError;
      setBooking(bookingData);
    }
  } catch (error) {
    console.error('Error fetching booking:', error);
    toast({
      title: "Error",
      description: "No se pudo cargar la información de la reserva",
      variant: "destructive",
    });
    navigate('/');
  } finally {
    setLoading(false);
  }
};

const handlePaymentSetup = async () => {
  setProcessing(true);
  try {
    const targetBookingId = booking?.id || bookingIdParam;
    if (!targetBookingId) throw new Error('Falta el identificador de la reserva');

    const { data, error } = await (supabase as any).functions.invoke('create-booking-setup-session', {
      body: { booking_id: targetBookingId }
    });
    if (error) throw error;
    if (data?.url) {
      // Navegar en la misma pestaña para evitar bloqueadores de pop‑ups
      window.location.href = data.url as string;
    } else {
      throw new Error('No se pudo iniciar Stripe Checkout');
    }
  } catch (error: any) {
    console.error('Payment setup error:', error);
    toast({
      title: "Error",
      description: error.message || "Error al iniciar la página de tarjeta",
      variant: "destructive",
    });
  } finally {
    setProcessing(false);
  }
};

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
            <p className="text-center mt-4 text-muted-foreground">Cargando información de la reserva...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Reserva no encontrada</h2>
              <p className="text-muted-foreground mb-4">No se pudo encontrar la información de tu reserva.</p>
              <Button onClick={() => navigate('/')}>Volver al inicio</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const employeeProfile = booking.employees?.profiles || null;
  const employeeName = employeeProfile
    ? `${employeeProfile.first_name} ${employeeProfile.last_name}`.trim()
    : '';

  const centerDisplayName = (() => {
    const name = booking.centers?.name || '';
    const addr = booking.centers?.address || '';
    if (/zurbar[aá]n/i.test(addr) || /zurbar[aá]n/i.test(name)) return 'Zurbarán';
    if (/vergara/i.test(addr) || /concha\s*espina/i.test(name)) return 'Concha Espina';
    return name || 'The Nook Madrid';
  })();

  const computeDisplayTotal = () => {
    const svc: any = booking.services || {};
    const hasDiscount = !!svc.has_discount && typeof svc.discount_price_cents === 'number';
    if (hasDiscount) return svc.discount_price_cents as number;
    if (typeof booking.total_price_cents === 'number') return booking.total_price_cents;
    if (typeof svc.price_cents === 'number') return svc.price_cents as number;
    return 0;
  };
  const displayTotalCents = computeDisplayTotal();

  const isPaymentSetup = booking.payment_method_status === 'succeeded';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <img
              src="/lovable-uploads/475dc4d6-6d6b-4357-a8b5-4611869beb43.png"
              alt="The Nook Madrid"
              className="h-12 w-auto md:h-16"
              loading="lazy"
            />
          </div>
          <p className="text-muted-foreground">Confirma tu reserva</p>
        </div>

        {/* Success Message if already completed */}
        {isPaymentSetup && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-green-700">
                <Check className="h-6 w-6" />
                <div>
                  <h3 className="font-semibold">¡Reserva asegurada!</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Booking Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Detalles de tu Reserva
            </CardTitle>
            <CardDescription>
              Revisa los datos antes de confirmar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CreditCard className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{booking.services?.name || 'Servicio personalizado'}</p>
                  <p className="text-sm text-muted-foreground">Tratamiento reservado</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    {new Date(booking.booking_datetime).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(booking.booking_datetime).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{booking.duration_minutes} minutos</p>
                </div>
              </div>

              {employeeProfile && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{employeeName}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{centerDisplayName}</p>
                  <p className="text-sm text-muted-foreground">{booking.centers?.address || 'Centro de tratamientos'}</p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total:</span>
              <div className="flex items-baseline gap-2">
                {(() => {
                  const svc: any = booking.services || {};
                  const hasDiscount = !!svc.has_discount && typeof svc.discount_price_cents === 'number' && typeof svc.price_cents === 'number' && svc.discount_price_cents < svc.price_cents;
                  if (hasDiscount) {
                    return (
                      <>
                        <span className="text-lg text-muted-foreground line-through">
                          {(svc.price_cents / 100).toFixed(2)}€
                        </span>
                        <span className="text-2xl font-bold text-primary">
                          {(svc.discount_price_cents / 100).toFixed(2)}€
                        </span>
                      </>
                    );
                  }
                  return (
                    <span className="text-2xl font-bold text-primary">
                      {displayTotalCents ? `${(displayTotalCents / 100).toFixed(2)}€` : 'A confirmar'}
                    </span>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Info */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Shield className="h-6 w-6 text-blue-600 mt-1" />
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-900">🛡️ Seguridad garantizada</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• The Nook no realiza el cobro de los servicios por adelantado, el sistema te solicita una tarjeta como garantía de reserva.</li>
                  <li>• Pasarela de pago seguro con conexión SSL cifrada de extremo a extremo</li>
                  <li>• Puedes consultar nuestras condiciones de reserva y compra en
                    {' '}<a className="underline" href="https://www.thenookmadrid.com/politica-de-cancelaciones/" target="_blank" rel="noopener noreferrer">este enlace</a>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Acción principal */}
        {/* Action Buttons */}
        <div className="space-y-3">
          {!isPaymentSetup ? (
            <Button 
onClick={handlePaymentSetup}
              disabled={processing}
              className="w-full h-12 text-lg"
              size="lg"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Procesando...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-5 w-5" />
                  Confirmar mi Reserva
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={() => navigate('/')}
              className="w-full h-12 text-lg"
              size="lg"
            >
              Volver al inicio
            </Button>
          )}
          
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="w-full"
          >
            Volver más tarde
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground space-y-2">
          <div className="space-y-1">
            <p className="font-medium">
              <a href="tel:911481474" className="hover:underline">
                Tel: 911 481 474
              </a>
            </p>
            <p className="font-medium">
              <a
                href="https://wa.me/34622360922"
                className="hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp: +34 622 36 09 22
              </a>
            </p>
          </div>
          <p className="text-xs border-t pt-2">
            © THE NOOK Madrid 2025 · Todos los derechos reservados
          </p>
        </div>
      </div>
    </div>
  );
}
