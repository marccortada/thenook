import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Check } from "lucide-react";

export default function PaymentSetupSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [centerData, setCenterData] = useState({
    name: 'The Nook Madrid',
    phone: '911 481 474',
    email: 'reservas@thenookmadrid.com',
    address: 'Calle Zurbarán 10 bajo derecha, Madrid 28010'
  });
  const [bookingCenter, setBookingCenter] = useState<{ name?: string; address?: string } | null>(null);

  const setupIntentId = searchParams.get('setup_intent');

  useEffect(() => {
    loadCenterData();
    if (setupIntentId) {
      fetchBookingCenter(setupIntentId).finally(() => confirmPaymentMethod());
    } else {
      setLoading(false);
    }
  }, [setupIntentId]);

  const fetchBookingCenter = async (intentId: string) => {
    try {
      const { data: intentRow, error: intentErr } = await (supabase as any)
        .from('booking_payment_intents')
        .select('booking_id')
        .eq('stripe_setup_intent_id', intentId)
        .maybeSingle();
      if (intentErr || !intentRow?.booking_id) return;

      const { data: booking, error: bookErr } = await (supabase as any)
        .from('bookings')
        .select('centers(name, address_zurbaran, address_concha_espina), center_id')
        .eq('id', intentRow.booking_id)
        .maybeSingle();
      if (bookErr || !booking) return;

      const c = booking.centers;
      const isZurbaran = (c?.name || '').toLowerCase().includes('zurbar');
      const address = isZurbaran ? (c?.address_zurbaran || '') : (c?.address_concha_espina || '');
      setBookingCenter({ name: c?.name, address });
      // Si tenemos dirección desde la reserva, sobreescribir centerData visible
      if (address) {
        setCenterData((prev) => ({ ...prev, name: c?.name || prev.name, address }));
      }
    } catch (e) {
      // ignore
    }
  };

  const loadCenterData = async () => {
    try {
      const { data, error } = await supabase
        .from('centers')
        .select('name, address, phone, email')
        .eq('active', true)
        .maybeSingle();

      if (error) {
        console.error('Error loading center data:', error);
        return;
      }

      if (data) {
        setCenterData({
          name: data.name || 'The Nook Madrid',
          phone: data.phone || '911 481 474',
          email: data.email || 'reservas@thenookmadrid.com',
          address: data.address || 'Calle Zurbarán 10 bajo derecha, Madrid 28010'
        });
      }
    } catch (error) {
      console.error('Error loading center data:', error);
    }
  };

  const confirmPaymentMethod = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('confirm-payment-method', {
        body: { setup_intent_id: setupIntentId }
      });

      if (error) throw error;

      setConfirmed(true);
      toast({
        title: "¡Éxito!",
        description: "",
      });
    } catch (error: any) {
      console.error('Error confirming payment method:', error);
      toast({
        title: "Error",
        description: error.message || "Error al confirmar el método de pago",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
            <p className="text-center mt-4 text-muted-foreground">Confirmando método de pago...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <p className="text-muted-foreground">Reserva confirmada</p>
        </div>

        {/* Success Card minimal */}
        <Card className="border-green-200 bg-green-50">
          <div className="text-center p-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-green-800 text-lg font-semibold">¡Reserva confirmada!</p>
            <p className="text-green-700 text-sm">Tu método de pago ha sido configurado correctamente.</p>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={() => navigate('/')}
            className="w-full h-12 text-lg"
            size="lg"
          >
            Volver al inicio
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => window.print()}
            className="w-full"
          >
            Imprimir confirmación
          </Button>
        </div>

        {/* Contact Info */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="text-center text-sm">
              <p className="font-medium mb-2">¿Necesitas ayuda?</p>
              <p className="text-muted-foreground">
                📧 {centerData.email}<br />
                📞 {centerData.phone}<br />
                📍 {bookingCenter?.address || centerData.address}
              </p>
              <p className="text-xs border-t pt-2 mt-3">© THE NOOK Madrid 2025 · Todos los derechos reservados</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
