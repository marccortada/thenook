import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

// Extend Window interface for Stripe
declare global {
  interface Window {
    Stripe: any;
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
}

export default function BookingPaymentSetup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [stripeLoaded, setStripeLoaded] = useState(false);

  const setupIntentId = searchParams.get('setup_intent');
  const clientSecret = searchParams.get('client_secret');

  useEffect(() => {
    const loadStripe = async () => {
      if (window.Stripe) {
        setStripeLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.onload = () => setStripeLoaded(true);
      document.head.appendChild(script);
    };

    loadStripe();
  }, []);

  useEffect(() => {
    if (setupIntentId) {
      fetchBookingDetails();
    }
  }, [setupIntentId]);

  const fetchBookingDetails = async () => {
    try {
      if (!setupIntentId) return;

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
          services(name),
          employees(profiles(first_name, last_name)),
          profiles(first_name, last_name, email)
        `)
        .eq('id', paymentIntent.booking_id)
        .single();

      if (bookingError) throw bookingError;

      setBooking(bookingData);
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
    if (!stripeLoaded || !clientSecret) {
      toast({
        title: "Error",
        description: "Stripe no se ha cargado correctamente",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    try {
      const stripe = window.Stripe(process.env.NODE_ENV === 'production' 
        ? 'pk_live_...' // Replace with your live publishable key
        : 'pk_test_51QatCOIRCCcE5Yoq4z1HVdqSXczKaWXJ1JZXsZNnMZjzSgP0b3fxJcH9p4EjCFMd2b2cZHQjZOq3sWf2KVUY6MNW00HHgNP3z1'
      );

      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      // Redirect to Stripe-hosted setup page
      const { error } = await stripe.redirectToCheckout({
        mode: 'setup',
        setupIntentClientSecret: clientSecret,
        successUrl: `${window.location.origin}/pago-configurado?setup_intent=${setupIntentId}`,
        cancelUrl: `${window.location.origin}/asegurar-reserva?setup_intent=${setupIntentId}&client_secret=${clientSecret}`,
      });

      if (error) {
        throw error;
      }

    } catch (error: any) {
      console.error('Payment setup error:', error);
      toast({
        title: "Error",
        description: error.message || "Error al configurar el método de pago",
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

  const employeeName = booking.employees?.profiles 
    ? `${booking.employees.profiles.first_name} ${booking.employees.profiles.last_name}`.trim()
    : 'Nuestro equipo';

  const isPaymentSetup = booking.payment_method_status === 'succeeded';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-primary">The Nook Madrid</h1>
          <p className="text-muted-foreground">Asegurar tu reserva</p>
        </div>

        {/* Success Message if already completed */}
        {isPaymentSetup && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-green-700">
                <Check className="h-6 w-6" />
                <div>
                  <h3 className="font-semibold">¡Reserva asegurada!</h3>
                  <p className="text-sm">Tu método de pago ha sido configurado correctamente.</p>
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
              Confirma los detalles antes de asegurar tu reserva
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
                  <p className="text-sm text-muted-foreground">Duración estimada</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{employeeName}</p>
                  <p className="text-sm text-muted-foreground">Profesional asignado</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">The Nook Madrid</p>
                  <p className="text-sm text-muted-foreground">Ubicación del tratamiento</p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total:</span>
              <span className="text-2xl font-bold text-primary">
                {booking.total_price_cents ? `${(booking.total_price_cents / 100).toFixed(2)}€` : 'A confirmar'}
              </span>
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
                  <li>• Tu tarjeta se guarda de forma segura con Stripe</li>
                  <li>• <strong>No se realizará ningún cargo hasta el momento del tratamiento</strong></li>
                  <li>• Puedes cancelar hasta 24h antes sin coste</li>
                  <li>• Conexión SSL cifrada de extremo a extremo</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          {!isPaymentSetup ? (
            <Button 
              onClick={handlePaymentSetup}
              disabled={processing || !stripeLoaded}
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
                  🔒 Asegurar mi Reserva
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
        <div className="text-center text-sm text-muted-foreground">
          <p>Si tienes alguna pregunta, contáctanos en</p>
          <p className="font-medium">info@thenookmadrid.com</p>
        </div>
      </div>
    </div>
  );
}